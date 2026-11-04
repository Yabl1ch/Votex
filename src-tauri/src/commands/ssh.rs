use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::time::timeout;
use crate::state::{AppState, VotexReport};
use crate::vault::VaultRecord;

const EMBEDDED_INSTALL_SCRIPT: &str = include_str!("../../../scripts/votex-install.sh");
const START_MARKER: &str = "VOTEX_JSON_REPORT_START";
const END_MARKER: &str = "VOTEX_JSON_REPORT_END";

struct SshClientHandler;

impl russh::client::Handler for SshClientHandler {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        _server_public_key: &russh::keys::ssh_key::PublicKey,
    ) -> Result<bool, Self::Error> {
        // Accept new target server key during initial VPS provisioning
        Ok(true)
    }
}

pub fn extract_json_report(full_log: &str) -> Result<VotexReport, String> {
    let start_idx = full_log
        .find(START_MARKER)
        .ok_or_else(|| "Маркер начала отчета VOTEX_JSON_REPORT_START не найден в терминале".to_string())?;

    let after_start = &full_log[start_idx + START_MARKER.len()..];
    let end_idx = after_start
        .find(END_MARKER)
        .ok_or_else(|| "Маркер окончания отчета VOTEX_JSON_REPORT_END не найден в терминале".to_string())?;

    let json_str = after_start[..end_idx].trim();
    serde_json::from_str::<VotexReport>(json_str).map_err(|e| {
        format!(
            "Ошибка валидации структуры JSON-отчета: {}. Содержимое блока: {}",
            e, json_str
        )
    })
}

#[tauri::command]
pub async fn run_provisioning(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    host: String,
    port: u16,
    username: String,
    password: Option<String>,
) -> Result<VotexReport, String> {
    let host = host.trim().to_string();
    let username = if username.trim().is_empty() {
        "root".to_string()
    } else {
        username.trim().to_string()
    };

    let password = password.unwrap_or_default();
    if password.is_empty() {
        return Err("Пароль для подключения по SSH не может быть пустым".to_string());
    }

    {
        let mut in_progress = state.is_provisioning.lock().map_err(|_| "State mutex error")?;
        if *in_progress {
            return Err("Процесс провизионирования уже запущен".to_string());
        }
        *in_progress = true;
    }

    let emit_log = |msg: String| {
        let _ = app.emit("ssh-log", msg);
    };

    emit_log(format!("[1/7] Установка безопасного SSH-соединения с {}:{}...", host, port));

    let config = Arc::new(russh::client::Config {
        inactivity_timeout: Some(Duration::from_secs(300)),
        ..Default::default()
    });

    let handler = SshClientHandler;
    let mut session = match timeout(
        Duration::from_secs(15),
        russh::client::connect(config, (host.as_str(), port), handler),
    )
    .await
    {
        Ok(Ok(handle)) => handle,
        Ok(Err(e)) => {
            if let Ok(mut in_progress) = state.is_provisioning.lock() {
                *in_progress = false;
            }
            return Err(format!("Ошибка подключения по SSH к {}:{}: {}", host, port, e));
        }
        Err(_) => {
            if let Ok(mut in_progress) = state.is_provisioning.lock() {
                *in_progress = false;
            }
            return Err(format!("Таймаут подключения (15 сек) к {}:{}", host, port));
        }
    };

    emit_log("[1/7] Аутентификация пользователя...".to_string());
    let auth_result = session.authenticate_password(&username, &password).await;
    match auth_result {
        Ok(russh::client::AuthResult::Success) => {
            emit_log(format!("[OK] Успешная аутентификация для пользователя '{}'", username));
        }
        Ok(_) => {
            if let Ok(mut in_progress) = state.is_provisioning.lock() {
                *in_progress = false;
            }
            return Err("Ошибка аутентификации SSH: неверный пароль или пользователь".to_string());
        }
        Err(e) => {
            if let Ok(mut in_progress) = state.is_provisioning.lock() {
                *in_progress = false;
            }
            return Err(format!("Критическая ошибка SSH при авторизации: {}", e));
        }
    }

    emit_log("[2/7] Загрузка и запуск скрипта развертывания Votex...".to_string());

    let channel = session
        .channel_open_session()
        .await
        .map_err(|e| format!("Не удалось открыть SSH-канал сессии: {}", e))?;

    // Execute shell pipeline: pass port, read script from stdin into /tmp/votex-install.sh, strip carriage returns, chmod +x, and run bash
    let exec_cmd = format!(
        "export VOTEX_SSH_PORT={} && tr -d '\\r' > /tmp/votex-install.sh && chmod +x /tmp/votex-install.sh && bash /tmp/votex-install.sh",
        port
    );
    channel
        .exec(true, exec_cmd)
        .await
        .map_err(|e| format!("Ошибка запуска установщика на сервере: {}", e))?;

    // Normalize script line endings and stream script content to channel stdin
    let clean_script = EMBEDDED_INSTALL_SCRIPT.replace("\r\n", "\n").replace('\r', "\n");
    let script_bytes = clean_script.into_bytes();

    channel
        .data(&script_bytes[..])
        .await
        .map_err(|e| format!("Ошибка передачи скрипта развертывания по SSH: {}", e))?;

    channel
        .eof()
        .await
        .map_err(|e| format!("Ошибка фиксации потока ввода SSH: {}", e))?;

    let mut accumulated_log = String::new();
    let mut exit_code: Option<u32> = None;

    let mut channel = channel;
    while let Some(msg) = channel.wait().await {
        match msg {
            russh::ChannelMsg::Data { ref data } => {
                let text = String::from_utf8_lossy(data).to_string();
                accumulated_log.push_str(&text);
                for line in text.lines() {
                    emit_log(line.to_string());
                }
            }
            russh::ChannelMsg::ExtendedData { ref data, .. } => {
                let text = String::from_utf8_lossy(data).to_string();
                accumulated_log.push_str(&text);
                for line in text.lines() {
                    emit_log(format!("[STDERR] {}", line));
                }
            }
            russh::ChannelMsg::ExitStatus { exit_status } => {
                exit_code = Some(exit_status);
                if exit_status != 0 {
                    emit_log(format!("[ERROR] Скрипт завершился с кодом ошибки: {}", exit_status));
                }
            }
            russh::ChannelMsg::Eof | russh::ChannelMsg::Close => {
                break;
            }
            _ => {}
        }
    }

    if let Ok(mut in_progress) = state.is_provisioning.lock() {
        *in_progress = false;
    }

    if let Some(code) = exit_code {
        if code != 0 {
            return Err(format!(
                "Скрипт развертывания на сервере завершился с ошибкой (код {}). Проверьте лог терминала.",
                code
            ));
        }
    }

    // Parse structured JSON report
    let report = extract_json_report(&accumulated_log)?;

    // Save report to AppState
    if let Ok(mut current_report) = state.current_report.lock() {
        *current_report = Some(report.clone());
    }

    // Save to Encrypted Vault
    if let Ok(vault) = state.vault.lock() {
        let vault_record = VaultRecord {
            host: report.server_ip.clone(),
            port,
            username: username.clone(),
            subscription_token: report.subscription_token.clone(),
            subscription_url: report.subscription_url.clone(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        };
        if let Err(e) = vault.save_record(&vault_record) {
            emit_log(format!("[WARN] Не удалось сохранить учетные данные в Vault: {}", e));
        } else {
            emit_log("[OK] Конфигурация сервера надежно зашифрована и сохранена в Vault".to_string());
        }
    }

    Ok(report)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_json_report_success() {
        let sample_output = r#"
==> [1/7] Pre-flight checks passed
==> [3/7] Xray-core installed
VOTEX_JSON_REPORT_START
{
  "status": "success",
  "server_ip": "185.120.45.10",
  "subscription_url": "http://185.120.45.10:18080/sub/test_token_abc",
  "subscription_token": "test_token_abc",
  "uuid": "11111111-2222-3333-4444-555555555555",
  "reality_public_key": "pub_key_xyz",
  "short_id": "short_123",
  "benchmark": {
    "latency_ms": 32,
    "speed_mbps": 480,
    "protocols": {
      "vision": {"port": 20443, "latency_ms": 32, "status": "active"},
      "xhttp": {"port": 2053, "latency_ms": 46, "status": "active"},
      "grpc": {"port": 8443, "latency_ms": 38, "status": "active"},
      "hysteria2": {"port": 2083, "latency_ms": 28, "status": "active"},
      "shadowsocks": {"port": 2088, "latency_ms": 32, "status": "active"}
    }
  },
  "hardening": {
    "tcp_bbr": true,
    "fail2ban": true,
    "ufw": true,
    "allowed_ports": [22, 20444, 20443, 2053, 8443, 2083, 2088, 18080]
  }
}
VOTEX_JSON_REPORT_END
==> All operations completed successfully
"#;

        let report = extract_json_report(sample_output).expect("Should parse valid report");
        assert_eq!(report.status, "success");
        assert_eq!(report.server_ip, "185.120.45.10");
        assert_eq!(report.subscription_token, "test_token_abc");
        assert_eq!(report.benchmark.latency_ms, 32);
        assert_eq!(report.benchmark.speed_mbps, 480);
        assert_eq!(report.benchmark.protocols.vision.port, 20443);
        assert_eq!(report.hardening.allowed_ports.len(), 8);
        assert!(report.hardening.tcp_bbr);
    }

    #[test]
    fn test_extract_json_report_missing_start_marker() {
        let bad_output = "No markers here at all";
        let result = extract_json_report(bad_output);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("VOTEX_JSON_REPORT_START"));
    }

    #[test]
    fn test_extract_json_report_missing_end_marker() {
        let bad_output = "VOTEX_JSON_REPORT_START { \"status\": \"ok\" }";
        let result = extract_json_report(bad_output);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("VOTEX_JSON_REPORT_END"));
    }
}
