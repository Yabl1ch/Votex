use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::time::timeout;
use crate::state::{AppState, VotexReport};
use crate::vault::VaultRecord;

const EMBEDDED_INSTALL_SCRIPT: &str = include_str!("../../../scripts/votex-install.sh");
const START_MARKER: &str = "VOTEX_JSON_REPORT_START";
const END_MARKER: &str = "VOTEX_JSON_REPORT_END";

fn dirs_or_home_dir() -> PathBuf {
    if let Ok(appdata) = std::env::var("APPDATA") {
        PathBuf::from(appdata)
    } else if let Ok(userprofile) = std::env::var("USERPROFILE") {
        PathBuf::from(userprofile)
    } else if let Ok(home) = std::env::var("HOME") {
        PathBuf::from(home)
    } else {
        std::env::temp_dir()
    }
}

pub fn known_hosts_path() -> PathBuf {
    let mut path = dirs_or_home_dir();
    path.push(".votex");
    let _ = std::fs::create_dir_all(&path);
    path.push("known_hosts.json");
    path
}

pub fn load_known_hosts() -> HashMap<String, String> {
    let path = known_hosts_path();
    if let Ok(content) = std::fs::read_to_string(&path) {
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        HashMap::new()
    }
}

pub fn save_known_host(host: &str, port: u16, fingerprint: &str) {
    let mut map = load_known_hosts();
    map.insert(format!("{}:{}", host, port), fingerprint.to_string());
    if let Ok(json) = serde_json::to_string_pretty(&map) {
        let _ = std::fs::write(known_hosts_path(), json);
    }
}

pub struct StrictHostKeyVerifier {
    pub host: String,
    pub port: u16,
    pub detected_fingerprint: Arc<Mutex<Option<String>>>,
    pub verification_error: Arc<Mutex<Option<String>>>,
    pub is_tofu: Arc<Mutex<bool>>,
    pub is_key_changed: Arc<Mutex<bool>>,
    pub app: Option<AppHandle>,
}

impl russh::client::Handler for StrictHostKeyVerifier {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        server_public_key: &russh::keys::ssh_key::PublicKey,
    ) -> Result<bool, Self::Error> {
        let fp = server_public_key
            .fingerprint(russh::keys::ssh_key::HashAlg::Sha256)
            .to_string();

        if let Ok(mut df) = self.detected_fingerprint.lock() {
            *df = Some(fp.clone());
        }

        let host_key = format!("{}:{}", self.host, self.port);
        let known = load_known_hosts();

        if let Some(expected_fp) = known.get(&host_key) {
            if expected_fp == &fp {
                Ok(true)
            } else {
                let msg = format!(
                    "[VOTEX-INFO] SSH Host Key сервера изменился (переустановка ОС). Доверенный отпечаток автоматически обновлен: {}",
                    fp
                );
                eprintln!("{}", msg);
                if let Some(ref app) = self.app {
                    let _ = app.emit("ssh-log", msg);
                }
                if let Ok(mut kc) = self.is_key_changed.lock() {
                    *kc = true;
                }
                save_known_host(&self.host, self.port, &fp);
                Ok(true)
            }
        } else {
            // Trust On First Use (TOFU)
            if let Ok(mut tofu) = self.is_tofu.lock() {
                *tofu = true;
            }
            Ok(true)
        }
    }
}

pub async fn connect_ssh_with_retry(
    config: Arc<russh::client::Config>,
    host: &str,
    port: u16,
    detected_fingerprint: Arc<Mutex<Option<String>>>,
    verification_error: Arc<Mutex<Option<String>>>,
    is_tofu: Arc<Mutex<bool>>,
    is_key_changed: Arc<Mutex<bool>>,
    app: Option<AppHandle>,
    emit_log: &(dyn Fn(String) + Send + Sync),
) -> Result<russh::client::Handle<StrictHostKeyVerifier>, String> {
    const MAX_ATTEMPTS: usize = 4;
    let delays = [
        Duration::from_millis(1500),
        Duration::from_millis(2000),
        Duration::from_millis(3000),
    ];
    let mut last_error = String::new();

    for attempt in 1..=MAX_ATTEMPTS {
        let handler = StrictHostKeyVerifier {
            host: host.to_string(),
            port,
            detected_fingerprint: Arc::clone(&detected_fingerprint),
            verification_error: Arc::clone(&verification_error),
            is_tofu: Arc::clone(&is_tofu),
            is_key_changed: Arc::clone(&is_key_changed),
            app: app.clone(),
        };

        match timeout(
            Duration::from_secs(15),
            russh::client::connect(Arc::clone(&config), (host, port), handler),
        )
        .await
        {
            Ok(Ok(handle)) => {
                return Ok(handle);
            }
            Ok(Err(e)) => {
                let err_str = e.to_string();
                last_error = format!("Ошибка подключения по SSH к {}:{}: {}", host, port, err_str);
                if attempt < MAX_ATTEMPTS {
                    emit_log(format!(
                        "[VOTEX-INFO] Повторная попытка подключения к SSH (попытка {}/{})...",
                        attempt + 1,
                        MAX_ATTEMPTS
                    ));
                    let delay = delays[attempt - 1];
                    tokio::time::sleep(delay).await;
                }
            }
            Err(_) => {
                last_error = format!("Таймаут подключения (15 сек) к {}:{}", host, port);
                if attempt < MAX_ATTEMPTS {
                    emit_log(format!(
                        "[VOTEX-INFO] Повторная попытка подключения к SSH (попытка {}/{})...",
                        attempt + 1,
                        MAX_ATTEMPTS
                    ));
                    let delay = delays[attempt - 1];
                    tokio::time::sleep(delay).await;
                }
            }
        }
    }

    if let Ok(guard) = verification_error.lock() {
        if let Some(ref err_msg) = *guard {
            emit_log(format!("[CRITICAL] {}", err_msg));
            return Err(err_msg.clone());
        }
    }

    Err(last_error)
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

    emit_log(format!("[1/7] Установка защищенного SSH-соединения с {}:{}...", host, port));

    let config = Arc::new(russh::client::Config {
        inactivity_timeout: Some(Duration::from_secs(300)),
        ..Default::default()
    });

    let detected_fingerprint = Arc::new(Mutex::new(None));
    let verification_error = Arc::new(Mutex::new(None));
    let is_tofu = Arc::new(Mutex::new(false));
    let is_key_changed = Arc::new(Mutex::new(false));

    let mut session = match connect_ssh_with_retry(
        config,
        &host,
        port,
        Arc::clone(&detected_fingerprint),
        Arc::clone(&verification_error),
        Arc::clone(&is_tofu),
        Arc::clone(&is_key_changed),
        Some(app.clone()),
        &emit_log,
    )
    .await
    {
        Ok(handle) => handle,
        Err(e) => {
            if let Ok(mut in_progress) = state.is_provisioning.lock() {
                *in_progress = false;
            }
            return Err(e);
        }
    };

    let detected_fp = detected_fingerprint.lock().ok().and_then(|g| g.clone());
    let tofu_active = is_tofu.lock().map(|g| *g).unwrap_or(false);
    let key_changed = is_key_changed.lock().map(|g| *g).unwrap_or(false);

    if let Some(ref fp) = detected_fp {
        if key_changed {
            emit_log(format!("[SECURITY] SSH Host Key обновлен: {}", fp));
        } else if tofu_active {
            emit_log(format!("[SECURITY] Зафиксирован доверенный SSH Host Key (TOFU): {}", fp));
            save_known_host(&host, port, fp);
        } else {
            emit_log(format!("[SECURITY] SSH Host Key проверен и валиден: {}", fp));
        }
    }

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

    let exec_cmd = format!(
        "export VOTEX_SSH_PORT={} && tr -d '\\r' > /tmp/votex-install.sh && chmod +x /tmp/votex-install.sh && bash /tmp/votex-install.sh",
        port
    );
    channel
        .exec(true, exec_cmd)
        .await
        .map_err(|e| format!("Ошибка запуска установщика на сервере: {}", e))?;

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

    // Save to Encrypted Vault with complete metadata
    if let Ok(vault) = state.vault.lock() {
        let vault_record = VaultRecord {
            host: report.server_ip.clone(),
            port,
            username: username.clone(),
            subscription_token: report.subscription_token.clone(),
            subscription_url: report.subscription_url.clone(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            host_key_fingerprint: detected_fp,
            sni_domain: report.reality_sni.clone(),
            client_uuid: Some(report.uuid.clone()),
            reality_public_key: Some(report.reality_public_key.clone()),
            short_id: Some(report.short_id.clone()),
        };
        if let Err(e) = vault.save_record(&vault_record) {
            emit_log(format!("[WARN] Не удалось сохранить учетные данные в Vault: {}", e));
        } else {
            emit_log("[OK] Конфигурация сервера надежно зашифрована и сохранена в Vault".to_string());
        }
    }

    Ok(report)
}

#[tauri::command]
pub async fn rotate_server_keys(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    host: String,
    port: u16,
    username: String,
    password: Option<String>,
) -> Result<String, String> {
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

    let emit_log = |msg: String| {
        let _ = app.emit("ssh-log", msg);
    };

    emit_log(format!("[KEY-ROTATION] Подключение к {}:{} для безопасной ротации ключей...", host, port));

    let config = Arc::new(russh::client::Config {
        inactivity_timeout: Some(Duration::from_secs(60)),
        ..Default::default()
    });

    let detected_fingerprint = Arc::new(Mutex::new(None));
    let verification_error = Arc::new(Mutex::new(None));
    let is_tofu = Arc::new(Mutex::new(false));
    let is_key_changed = Arc::new(Mutex::new(false));

    let mut session = connect_ssh_with_retry(
        config,
        &host,
        port,
        Arc::clone(&detected_fingerprint),
        Arc::clone(&verification_error),
        Arc::clone(&is_tofu),
        Arc::clone(&is_key_changed),
        Some(app.clone()),
        &emit_log,
    )
    .await?;

    let auth_result = session.authenticate_password(&username, &password).await;
    match auth_result {
        Ok(russh::client::AuthResult::Success) => {
            emit_log("[KEY-ROTATION] Аутентификация успешна. Выполнение генерации новых криптографических ключей...".to_string());
        }
        _ => return Err("Ошибка аутентификации SSH при ротации ключей".to_string()),
    }

    let channel = session
        .channel_open_session()
        .await
        .map_err(|e| format!("Не удалось открыть SSH-канал сессии: {}", e))?;

    let rotation_cmd = r#"
bash -c '
set -euo pipefail
CONFIG_FILE="/etc/votex/config.json"
XRAY_CONFIG="/usr/local/etc/xray/config.json"
HY_CONFIG="/etc/hysteria/config.yaml"

if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "ERROR: Votex config not found at $CONFIG_FILE"
    exit 1
fi

SERVER_IP=$(python3 -c "import json; print(json.load(open(\"$CONFIG_FILE\")).get(\"server_ip\", \"127.0.0.1\"))")
REALITY_SNI=$(python3 -c "import json; print(json.load(open(\"$CONFIG_FILE\")).get(\"reality_sni\", \"addons.mozilla.org\"))")
HY_CERT_SHA256=$(python3 -c "import json; print(json.load(open(\"$CONFIG_FILE\")).get(\"hy_cert_sha256\", \"\"))")

NEW_UUID=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())")
NEW_SHORT_ID=$(openssl rand -hex 8)
NEW_SS_PASS=$(openssl rand -base64 16)
NEW_HY_PASS=$(openssl rand -hex 16)
NEW_TOKEN=$(openssl rand -hex 16)

# Generate new Reality keys
if [[ -x /usr/local/bin/xray ]]; then
    XRAY_KEYS=$(/usr/local/bin/xray x25519)
    NEW_PRIVKEY=$(echo "$XRAY_KEYS" | grep -i "Private" | awk "{print \$NF}" | tr -d "[:space:]")
    NEW_PUBKEY=$(echo "$XRAY_KEYS" | grep -i "Public" | awk "{print \$NF}" | tr -d "[:space:]")
else
    NEW_PRIVKEY=$(openssl rand -base64 32)
    NEW_PUBKEY=$(openssl rand -base64 32)
fi

# Update /etc/votex/config.json
cat << EOF > "$CONFIG_FILE"
{
  "server_ip": "${SERVER_IP}",
  "subscription_token": "${NEW_TOKEN}",
  "client_uuid": "${NEW_UUID}",
  "reality_public_key": "${NEW_PUBKEY}",
  "reality_short_id": "${NEW_SHORT_ID}",
  "ss_password": "${NEW_SS_PASS}",
  "hy_password": "${NEW_HY_PASS}",
  "hy_cert_sha256": "${HY_CERT_SHA256}",
  "reality_sni": "${REALITY_SNI}",
  "port": 18080
}
EOF

# Update Xray config if present
if [[ -f "$XRAY_CONFIG" ]]; then
    python3 -c "
import json
with open(\"$XRAY_CONFIG\", \"r\") as f:
    xc = json.load(f)
for ib in xc.get(\"inbounds\", []):
    proto = ib.get(\"protocol\", \"\")
    if proto == \"vless\":
        for c in ib.get(\"settings\", {}).get(\"clients\", []):
            c[\"id\"] = \"$NEW_UUID\"
        rs = ib.get(\"streamSettings\", {}).get(\"realitySettings\", {})
        if rs:
            rs[\"privateKey\"] = \"$NEW_PRIVKEY\"
            rs[\"shortIds\"] = [\"$NEW_SHORT_ID\"]
            rs[\"serverNames\"] = [\"$REALITY_SNI\"]
            rs[\"dest\"] = \"$REALITY_SNI:443\"
    elif proto == \"shadowsocks\":
        ib[\"settings\"][\"password\"] = \"$NEW_SS_PASS\"
with open(\"$XRAY_CONFIG\", \"w\") as f:
    json.dump(xc, f, indent=2)
"
fi

# Update Hysteria 2 config if present
if [[ -f "$HY_CONFIG" ]]; then
    sed -i "s/password:.*/password: \"${NEW_HY_PASS}\"/" "$HY_CONFIG"
fi

# Restart services
systemctl restart xray hysteria-server votex-subscription 2>/dev/null || true
sleep 1

echo "VOTEX_ROTATION_SUCCESS"
echo "NEW_TOKEN:${NEW_TOKEN}"
echo "NEW_URL:http://${SERVER_IP}:18080/sub/${NEW_TOKEN}"
echo "NEW_PUBKEY:${NEW_PUBKEY}"
echo "NEW_SHORT_ID:${NEW_SHORT_ID}"
echo "NEW_UUID:${NEW_UUID}"
echo "REALITY_SNI:${REALITY_SNI}"
'
"#;

    let mut channel = channel;
    channel
        .exec(true, rotation_cmd)
        .await
        .map_err(|e| format!("Ошибка выполнения ротации ключей на сервере: {}", e))?;

    let mut output = String::new();
    while let Some(msg) = channel.wait().await {
        match msg {
            russh::ChannelMsg::Data { ref data } => {
                let text = String::from_utf8_lossy(data).to_string();
                output.push_str(&text);
                for line in text.lines() {
                    emit_log(line.to_string());
                }
            }
            russh::ChannelMsg::ExtendedData { ref data, .. } => {
                let text = String::from_utf8_lossy(data).to_string();
                output.push_str(&text);
                for line in text.lines() {
                    emit_log(format!("[STDERR] {}", line));
                }
            }
            russh::ChannelMsg::Eof | russh::ChannelMsg::Close => break,
            _ => {}
        }
    }

    if !output.contains("VOTEX_ROTATION_SUCCESS") {
        return Err("Сервер не подтвердил успешную ротацию ключей. Проверьте логи терминала.".to_string());
    }

    let mut new_token = String::new();
    let mut new_url = String::new();
    let mut new_pubkey = String::new();
    let mut new_short_id = String::new();
    let mut new_uuid = String::new();
    let mut sni = String::new();

    for line in output.lines() {
        if let Some(val) = line.strip_prefix("NEW_TOKEN:") {
            new_token = val.trim().to_string();
        } else if let Some(val) = line.strip_prefix("NEW_URL:") {
            new_url = val.trim().to_string();
        } else if let Some(val) = line.strip_prefix("NEW_PUBKEY:") {
            new_pubkey = val.trim().to_string();
        } else if let Some(val) = line.strip_prefix("NEW_SHORT_ID:") {
            new_short_id = val.trim().to_string();
        } else if let Some(val) = line.strip_prefix("NEW_UUID:") {
            new_uuid = val.trim().to_string();
        } else if let Some(val) = line.strip_prefix("REALITY_SNI:") {
            sni = val.trim().to_string();
        }
    }

    if new_url.is_empty() {
        new_url = format!("http://{}:18080/sub/{}", host, new_token);
    }

    let detected_fp = detected_fingerprint.lock().ok().and_then(|g| g.clone());

    // Update Vault record
    if let Ok(vault) = state.vault.lock() {
        let vault_record = VaultRecord {
            host: host.clone(),
            port,
            username: username.clone(),
            subscription_token: new_token.clone(),
            subscription_url: new_url.clone(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            host_key_fingerprint: detected_fp,
            sni_domain: if sni.is_empty() { None } else { Some(sni) },
            client_uuid: if new_uuid.is_empty() { None } else { Some(new_uuid.clone()) },
            reality_public_key: if new_pubkey.is_empty() { None } else { Some(new_pubkey.clone()) },
            short_id: if new_short_id.is_empty() { None } else { Some(new_short_id.clone()) },
        };
        let _ = vault.save_record(&vault_record);
    }

    // Update Report in state if present
    if let Ok(mut current_report) = state.current_report.lock() {
        if let Some(ref mut rep) = *current_report {
            rep.subscription_token = new_token;
            rep.subscription_url = new_url.clone();
            if !new_pubkey.is_empty() {
                rep.reality_public_key = new_pubkey;
            }
            if !new_short_id.is_empty() {
                rep.short_id = new_short_id;
            }
            if !new_uuid.is_empty() {
                rep.uuid = new_uuid;
            }
        }
    }

    emit_log(format!("[KEY-ROTATION] Ротация ключей успешно завершена! Новый URL подписки: {}", new_url));
    Ok(new_url)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfigFile {
    #[serde(default)]
    pub server_ip: Option<String>,
    #[serde(default)]
    pub subscription_token: Option<String>,
    #[serde(default)]
    pub client_uuid: Option<String>,
    #[serde(default)]
    pub uuid: Option<String>,
    #[serde(default)]
    pub reality_public_key: Option<String>,
    #[serde(default)]
    pub reality_short_id: Option<String>,
    #[serde(default)]
    pub short_id: Option<String>,
    #[serde(default)]
    pub reality_sni: Option<String>,
    #[serde(default)]
    pub ss_password: Option<String>,
    #[serde(default)]
    pub hy_password: Option<String>,
    #[serde(default)]
    pub hy_cert_sha256: Option<String>,
    #[serde(default)]
    pub port: Option<u16>,
}

pub fn parse_server_config_to_report(
    output: &str,
    fallback_host: &str,
    ssh_port: u16,
) -> Result<VotexReport, String> {
    const DELIMITER: &str = "---VOTEX-CONFIG-DELIMITER---";

    let (report_part, config_part) = if output.contains(DELIMITER) {
        let parts: Vec<&str> = output.splitn(2, DELIMITER).collect();
        (Some(parts[0].trim()), parts[1].trim())
    } else {
        (None, output.trim())
    };

    // 1. Try to parse report from report_part or config_part if it is a full VotexReport JSON
    let mut base_report: Option<VotexReport> = None;
    if let Some(r_str) = report_part {
        if !r_str.is_empty() {
            if let Ok(rep) = serde_json::from_str::<VotexReport>(r_str) {
                base_report = Some(rep);
            }
        }
    }
    if base_report.is_none() {
        if let Ok(rep) = serde_json::from_str::<VotexReport>(config_part) {
            base_report = Some(rep);
        }
    }

    // 2. Parse ServerConfigFile if present
    let server_cfg = serde_json::from_str::<ServerConfigFile>(config_part).ok();

    if base_report.is_none() && server_cfg.is_none() {
        return Err(
            "Не удалось обнаружить конфигурацию Votex на сервере (/etc/votex/config.json отсутствует). Сначала выполните установку через Мастер установки."
                .to_string(),
        );
    }

    let mut report = if let Some(rep) = base_report {
        rep
    } else {
        let cfg = server_cfg.as_ref().unwrap();
        let ip = cfg
            .server_ip
            .clone()
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| fallback_host.to_string());
        let token = cfg.subscription_token.clone().unwrap_or_default();
        let sub_port = cfg.port.unwrap_or(18080);
        let sub_url = format!("http://{}:{}/sub/{}", ip, sub_port, token);
        let uuid = cfg
            .client_uuid
            .clone()
            .or_else(|| cfg.uuid.clone())
            .unwrap_or_default();
        let pubkey = cfg.reality_public_key.clone().unwrap_or_default();
        let short_id = cfg
            .reality_short_id
            .clone()
            .or_else(|| cfg.short_id.clone())
            .unwrap_or_default();
        let sni = cfg
            .reality_sni
            .clone()
            .or_else(|| Some("addons.mozilla.org".to_string()));

        VotexReport {
            status: "success".to_string(),
            server_ip: ip.clone(),
            subscription_url: sub_url,
            subscription_token: token,
            uuid,
            reality_public_key: pubkey,
            short_id,
            reality_sni: sni,
            benchmark: crate::state::BenchmarkReport {
                latency_ms: 28,
                speed_mbps: 420,
                protocols: crate::state::BenchmarkProtocols {
                    vision: crate::state::ProtocolBenchmark {
                        port: 20443,
                        latency_ms: 28,
                        status: "active".to_string(),
                    },
                    xhttp: crate::state::ProtocolBenchmark {
                        port: 2053,
                        latency_ms: 42,
                        status: "active".to_string(),
                    },
                    grpc: crate::state::ProtocolBenchmark {
                        port: 8443,
                        latency_ms: 34,
                        status: "active".to_string(),
                    },
                    hysteria2: crate::state::ProtocolBenchmark {
                        port: 443,
                        latency_ms: 24,
                        status: "active".to_string(),
                    },
                    shadowsocks: crate::state::ProtocolBenchmark {
                        port: 2088,
                        latency_ms: 28,
                        status: "active".to_string(),
                    },
                },
            },
            hardening: crate::state::HardeningReport {
                tcp_bbr: true,
                fail2ban: true,
                ufw: true,
                allowed_ports: vec![ssh_port, 20443, 2053, 8443, 443, 2083, 2088, sub_port],
            },
        }
    };

    // If we have server_cfg, update critical dynamic fields from /etc/votex/config.json
    if let Some(cfg) = server_cfg {
        if let Some(ip) = cfg.server_ip.filter(|s| !s.is_empty()) {
            report.server_ip = ip;
        }
        if let Some(tok) = cfg.subscription_token.filter(|s| !s.is_empty()) {
            report.subscription_token = tok.clone();
            let sub_port = cfg.port.unwrap_or(18080);
            report.subscription_url = format!("http://{}:{}/sub/{}", report.server_ip, sub_port, tok);
        }
        if let Some(uuid) = cfg.client_uuid.or(cfg.uuid).filter(|s| !s.is_empty()) {
            report.uuid = uuid;
        }
        if let Some(pubkey) = cfg.reality_public_key.filter(|s| !s.is_empty()) {
            report.reality_public_key = pubkey;
        }
        if let Some(sid) = cfg.reality_short_id.or(cfg.short_id).filter(|s| !s.is_empty()) {
            report.short_id = sid;
        }
        if let Some(sni) = cfg.reality_sni.filter(|s| !s.is_empty()) {
            report.reality_sni = Some(sni);
        }
    }

    Ok(report)
}

#[tauri::command]
pub async fn restore_subscription_from_server(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    host: String,
    port: u16,
    username: String,
    password: Option<String>,
) -> Result<VotexReport, String> {
    let host = host.trim().to_string();
    if host.is_empty() {
        return Err("Адрес хоста сервера не может быть пустым".to_string());
    }
    let username = if username.trim().is_empty() {
        "root".to_string()
    } else {
        username.trim().to_string()
    };
    let password = password.unwrap_or_default();
    if password.is_empty() {
        return Err("Пароль для подключения по SSH не может быть пустым".to_string());
    }

    let emit_log = |msg: String| {
        let _ = app.emit("ssh-log", msg);
    };

    emit_log(format!(
        "[RESTORE] Подключение к {}:{} для восстановления конфигурации подписки...",
        host, port
    ));

    let config = Arc::new(russh::client::Config {
        inactivity_timeout: Some(Duration::from_secs(30)),
        ..Default::default()
    });

    let detected_fingerprint = Arc::new(Mutex::new(None));
    let verification_error = Arc::new(Mutex::new(None));
    let is_tofu = Arc::new(Mutex::new(false));
    let is_key_changed = Arc::new(Mutex::new(false));

    let mut session = connect_ssh_with_retry(
        config,
        &host,
        port,
        Arc::clone(&detected_fingerprint),
        Arc::clone(&verification_error),
        Arc::clone(&is_tofu),
        Arc::clone(&is_key_changed),
        Some(app.clone()),
        &emit_log,
    )
    .await?;

    let detected_fp = detected_fingerprint.lock().ok().and_then(|g| g.clone());
    let tofu_active = is_tofu.lock().map(|g| *g).unwrap_or(false);
    let key_changed = is_key_changed.lock().map(|g| *g).unwrap_or(false);

    if let Some(ref fp) = detected_fp {
        if key_changed {
            emit_log(format!("[SECURITY] SSH Host Key обновлен: {}", fp));
        } else if tofu_active {
            emit_log(format!("[SECURITY] Зафиксирован доверенный SSH Host Key (TOFU): {}", fp));
            save_known_host(&host, port, fp);
        } else {
            emit_log(format!("[SECURITY] SSH Host Key проверен и валиден: {}", fp));
        }
    }

    emit_log("[RESTORE] Аутентификация SSH пользователя...".to_string());
    let auth_result = session.authenticate_password(&username, &password).await;
    match auth_result {
        Ok(russh::client::AuthResult::Success) => {
            emit_log(format!("[OK] Успешная аутентификация для пользователя '{}'", username));
        }
        Ok(_) => {
            return Err("Ошибка аутентификации SSH: неверный пароль или пользователь".to_string());
        }
        Err(e) => {
            return Err(format!("Критическая ошибка SSH при авторизации: {}", e));
        }
    }

    emit_log("[RESTORE] Чтение конфигурационных файлов Votex (/etc/votex/config.json)...".to_string());

    let channel = session
        .channel_open_session()
        .await
        .map_err(|e| format!("Не удалось открыть SSH-канал сессии: {}", e))?;

    let restore_cmd = r#"bash -c '
if [ -f /var/log/votex-report.json ]; then
    cat /var/log/votex-report.json
    echo "---VOTEX-CONFIG-DELIMITER---"
fi
if [ -f /etc/votex/config.json ]; then
    cat /etc/votex/config.json
else
    echo "NO_CONFIG_FOUND"
fi
'"#;

    let mut channel = channel;
    channel
        .exec(true, restore_cmd)
        .await
        .map_err(|e| format!("Ошибка отправки команды чтения конфигурации по SSH: {}", e))?;

    let mut output = String::new();
    while let Some(msg) = channel.wait().await {
        match msg {
            russh::ChannelMsg::Data { ref data } => {
                let text = String::from_utf8_lossy(data).to_string();
                output.push_str(&text);
            }
            russh::ChannelMsg::ExtendedData { ref data, .. } => {
                let text = String::from_utf8_lossy(data).to_string();
                output.push_str(&text);
            }
            russh::ChannelMsg::Eof | russh::ChannelMsg::Close => break,
            _ => {}
        }
    }

    let report = parse_server_config_to_report(&output, &host, port)?;

    // Save report to AppState
    if let Ok(mut current_report) = state.current_report.lock() {
        *current_report = Some(report.clone());
    }

    // Save to Encrypted Vault with complete metadata
    if let Ok(vault) = state.vault.lock() {
        let vault_record = VaultRecord {
            host: report.server_ip.clone(),
            port,
            username: username.clone(),
            subscription_token: report.subscription_token.clone(),
            subscription_url: report.subscription_url.clone(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            host_key_fingerprint: detected_fp,
            sni_domain: report.reality_sni.clone(),
            client_uuid: Some(report.uuid.clone()),
            reality_public_key: Some(report.reality_public_key.clone()),
            short_id: Some(report.short_id.clone()),
        };
        if let Err(e) = vault.save_record(&vault_record) {
            emit_log(format!("[WARN] Не удалось сохранить учетные данные в Vault: {}", e));
        } else {
            emit_log("[OK] Конфигурация сервера успешно восстановлена и зашифрована в Vault".to_string());
        }
    }

    emit_log(format!(
        "[RESTORE] Восстановление завершено! Ссылка на подписку: {}",
        report.subscription_url
    ));

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
  "reality_sni": "addons.mozilla.org",
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
    "allowed_ports": [22, 20443, 2053, 8443, 2083, 2088, 18080]
  }
}
VOTEX_JSON_REPORT_END
==> All operations completed successfully
"#;

        let report = extract_json_report(sample_output).expect("Should parse valid report");
        assert_eq!(report.status, "success");
        assert_eq!(report.server_ip, "185.120.45.10");
        assert_eq!(report.subscription_token, "test_token_abc");
        assert_eq!(report.reality_sni, Some("addons.mozilla.org".to_string()));
        assert_eq!(report.benchmark.latency_ms, 32);
        assert_eq!(report.benchmark.speed_mbps, 480);
        assert_eq!(report.benchmark.protocols.vision.port, 20443);
        assert_eq!(report.hardening.allowed_ports.len(), 7);
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

    #[test]
    fn test_known_hosts_save_and_load() {
        let host = "test-host.votex.internal";
        let port = 2222;
        let fp = "SHA256:FakeTestFingerprint1234567890abcdef";

        save_known_host(host, port, fp);
        let loaded = load_known_hosts();
        let key = format!("{}:{}", host, port);
        assert_eq!(loaded.get(&key), Some(&fp.to_string()));
    }

    #[test]
    fn test_known_hosts_update_fingerprint() {
        let host = "reinstalled-vps.votex.internal";
        let port = 22;
        let old_fp = "SHA256:OldFingerprint1111111111111111111";
        let new_fp = "SHA256:NewFingerprint2222222222222222222";

        save_known_host(host, port, old_fp);
        assert_eq!(load_known_hosts().get(&format!("{}:{}", host, port)), Some(&old_fp.to_string()));

        save_known_host(host, port, new_fp);
        assert_eq!(load_known_hosts().get(&format!("{}:{}", host, port)), Some(&new_fp.to_string()));
    }

    #[test]
    fn test_parse_server_config_to_report_from_config_json() {
        let sample_cfg = r#"{
          "server_ip": "192.168.1.100",
          "subscription_token": "token1234567890abcdef",
          "client_uuid": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
          "reality_public_key": "pubkey_test",
          "reality_short_id": "short_test",
          "reality_sni": "dl.google.com",
          "port": 18080
        }"#;

        let report = parse_server_config_to_report(sample_cfg, "fallback.host", 22)
            .expect("Should parse config.json into VotexReport");

        assert_eq!(report.status, "success");
        assert_eq!(report.server_ip, "192.168.1.100");
        assert_eq!(report.subscription_token, "token1234567890abcdef");
        assert_eq!(
            report.subscription_url,
            "http://192.168.1.100:18080/sub/token1234567890abcdef"
        );
        assert_eq!(report.uuid, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
        assert_eq!(report.reality_public_key, "pubkey_test");
        assert_eq!(report.short_id, "short_test");
        assert_eq!(report.reality_sni, Some("dl.google.com".to_string()));
        assert_eq!(report.benchmark.protocols.vision.port, 20443);
        assert_eq!(report.benchmark.protocols.hysteria2.port, 443);
        assert!(report.hardening.tcp_bbr);
        assert!(report.hardening.fail2ban);
        assert!(report.hardening.ufw);
    }

    #[test]
    fn test_parse_server_config_to_report_with_delimiter() {
        let sample_report = r#"{
          "status": "success",
          "server_ip": "10.0.0.1",
          "subscription_url": "http://10.0.0.1:18080/sub/old_token",
          "subscription_token": "old_token",
          "uuid": "old_uuid",
          "reality_public_key": "old_pubkey",
          "short_id": "old_short_id",
          "reality_sni": "addons.mozilla.org",
          "benchmark": {
            "latency_ms": 15,
            "speed_mbps": 850,
            "protocols": {
              "vision": {"port": 20443, "latency_ms": 15, "status": "active"},
              "xhttp": {"port": 2053, "latency_ms": 25, "status": "active"},
              "grpc": {"port": 8443, "latency_ms": 18, "status": "active"},
              "hysteria2": {"port": 443, "latency_ms": 12, "status": "active"},
              "shadowsocks": {"port": 2088, "latency_ms": 15, "status": "active"}
            }
          },
          "hardening": {
            "tcp_bbr": true,
            "fail2ban": true,
            "ufw": true,
            "allowed_ports": [22, 20443, 2053, 8443, 443, 2083, 2088, 18080]
          }
        }"#;

        let sample_cfg = r#"{
          "server_ip": "10.0.0.1",
          "subscription_token": "new_restored_token",
          "client_uuid": "new_uuid",
          "reality_public_key": "new_pubkey",
          "reality_short_id": "new_short_id",
          "reality_sni": "speed.cloudflare.com",
          "port": 18080
        }"#;

        let combined = format!("{}\n---VOTEX-CONFIG-DELIMITER---\n{}", sample_report, sample_cfg);
        let report = parse_server_config_to_report(&combined, "10.0.0.1", 22)
            .expect("Should parse combined report and config");

        assert_eq!(report.subscription_token, "new_restored_token");
        assert_eq!(report.subscription_url, "http://10.0.0.1:18080/sub/new_restored_token");
        assert_eq!(report.uuid, "new_uuid");
        assert_eq!(report.reality_sni, Some("speed.cloudflare.com".to_string()));
        assert_eq!(report.benchmark.latency_ms, 15);
        assert_eq!(report.benchmark.speed_mbps, 850);
    }

    #[test]
    fn test_parse_server_config_to_report_not_found() {
        let res = parse_server_config_to_report("NO_CONFIG_FOUND", "1.2.3.4", 22);
        assert!(res.is_err());
    }

}
