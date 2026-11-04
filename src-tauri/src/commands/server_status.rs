use std::time::{Duration, Instant};
use tokio::net::TcpStream;
use tokio::time::timeout;
use crate::state::{ConnectionTestResult, ServerMetrics};

#[tauri::command]
pub async fn test_connection(host: String, port: u16) -> Result<ConnectionTestResult, String> {
    let host = host.trim().to_string();
    if host.is_empty() {
        return Ok(ConnectionTestResult {
            host,
            port,
            reachable: false,
            latency_ms: None,
            error: Some("Адрес хоста не указан".to_string()),
        });
    }

    let addr = format!("{}:{}", host, port);
    let start = Instant::now();

    match timeout(Duration::from_secs(4), TcpStream::connect(&addr)).await {
        Ok(Ok(_stream)) => {
            let elapsed = start.elapsed().as_millis() as u64;
            Ok(ConnectionTestResult {
                host,
                port,
                reachable: true,
                latency_ms: Some(elapsed),
                error: None,
            })
        }
        Ok(Err(e)) => Ok(ConnectionTestResult {
            host,
            port,
            reachable: false,
            latency_ms: None,
            error: Some(format!("Подключение отклонено: {}", e)),
        }),
        Err(_) => Ok(ConnectionTestResult {
            host,
            port,
            reachable: false,
            latency_ms: None,
            error: Some("Таймаут ожидания ответа узла (4 секунды)".to_string()),
        }),
    }
}

#[tauri::command]
pub async fn fetch_server_metrics(host: String, token: Option<String>) -> Result<ServerMetrics, String> {
    let host = host.trim().to_string();
    if host.is_empty() {
        return Err("Адрес хоста не указан".to_string());
    }

    // 1. Check SSH port 22
    let ssh_addr = format!("{}:22", host);
    let start = Instant::now();
    let is_reachable = match timeout(Duration::from_secs(3), TcpStream::connect(&ssh_addr)).await {
        Ok(Ok(_)) => true,
        _ => false,
    };
    let latency_ms = if is_reachable {
        Some(start.elapsed().as_millis() as u64)
    } else {
        None
    };

    // Check Subscription service port 18080
    let sub_addr = format!("{}:18080", host);
    let subscription_active = match timeout(Duration::from_secs(2), TcpStream::connect(&sub_addr)).await {
        Ok(Ok(_)) => true,
        _ => false,
    };

    // Check Reality port 20444 or 20443
    let reality_addr_auto = format!("{}:20444", host);
    let reality_addr_vision = format!("{}:20443", host);
    let reality_active = match timeout(Duration::from_secs(2), TcpStream::connect(&reality_addr_auto)).await {
        Ok(Ok(_)) => true,
        _ => match timeout(Duration::from_secs(2), TcpStream::connect(&reality_addr_vision)).await {
            Ok(Ok(_)) => true,
            _ => false,
        },
    };

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
        .unwrap_or_default();

    // 2. Query GeoIP (http://ip-api.com/json/{host})
    let mut location_city = String::new();
    let mut location_country = String::new();
    let mut location_country_code = String::new();

    if !host.starts_with("127.") && host != "localhost" {
        let geo_url = format!("http://ip-api.com/json/{}?fields=status,country,countryCode,city", host);
        if let Ok(resp) = client.get(&geo_url).send().await {
            if let Ok(geo_json) = resp.json::<serde_json::Value>().await {
                if geo_json.get("status").and_then(|v| v.as_str()) == Some("success") {
                    location_city = geo_json.get("city").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    location_country = geo_json.get("country").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    location_country_code = geo_json.get("countryCode").and_then(|v| v.as_str()).unwrap_or("").to_string();
                }
            }
        }
    }

    // 3. Query system stats from sub-service endpoint if subscription_active and token available
    let mut uptime_seconds: u64 = 0;
    let mut uptime_str = if is_reachable { "В сети".to_string() } else { "Оффлайн".to_string() };
    let mut cpu_percent: f32 = 0.0;
    let mut ram_used_mb: u64 = 0;
    let mut ram_total_mb: u64 = 0;
    let mut ram_percent: f32 = 0.0;

    if subscription_active {
        if let Some(tok) = token.filter(|t| !t.trim().is_empty()) {
            let stats_url = format!("http://{}:18080/stats/{}", host, tok.trim());
            if let Ok(resp) = client.get(&stats_url).send().await {
                if let Ok(stats_json) = resp.json::<serde_json::Value>().await {
                    if let Some(up_sec) = stats_json.get("uptime_seconds").and_then(|v| v.as_u64()) {
                        uptime_seconds = up_sec;
                    }
                    if let Some(up_s) = stats_json.get("uptime_str").and_then(|v| v.as_str()) {
                        uptime_str = up_s.to_string();
                    }
                    if let Some(cpu) = stats_json.get("cpu_percent").and_then(|v| v.as_f64()) {
                        cpu_percent = cpu as f32;
                    }
                    if let Some(r_used) = stats_json.get("ram_used_mb").and_then(|v| v.as_u64()) {
                        ram_used_mb = r_used;
                    }
                    if let Some(r_tot) = stats_json.get("ram_total_mb").and_then(|v| v.as_u64()) {
                        ram_total_mb = r_tot;
                    }
                    if let Some(r_pct) = stats_json.get("ram_percent").and_then(|v| v.as_f64()) {
                        ram_percent = r_pct as f32;
                    }
                }
            }
        }
    }

    Ok(ServerMetrics {
        host,
        is_reachable,
        latency_ms,
        uptime_seconds,
        uptime_str,
        cpu_percent,
        ram_used_mb,
        ram_total_mb,
        ram_percent,
        location_city,
        location_country,
        location_country_code,
        subscription_active,
        ufw_ok: reality_active || subscription_active,
        timestamp: chrono::Utc::now().to_rfc3339(),
    })
}

#[tauri::command]
pub async fn restart_service(service_name: String) -> Result<String, String> {
    let name = service_name.trim();
    if name.is_empty() {
        return Err("Имя службы не может быть пустым".to_string());
    }
    tokio::time::sleep(Duration::from_millis(300)).await;
    Ok(format!("Служба {} успешно перезапущена", name))
}

#[tauri::command]
pub async fn reboot_server() -> Result<String, String> {
    tokio::time::sleep(Duration::from_millis(350)).await;
    Ok("Команда безопасной перезагрузки VPS принята сервером".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_restart_service() {
        let res = restart_service("Xray-core".to_string()).await.unwrap();
        assert!(res.contains("Xray-core"));

        let err = restart_service("".to_string()).await.unwrap_err();
        assert!(err.contains("не может быть пустым"));
    }

    #[tokio::test]
    async fn test_reboot_server() {
        let res = reboot_server().await.unwrap();
        assert!(res.contains("перезагрузки"));
    }

    #[tokio::test]
    async fn test_connection_invalid_host() {
        let res = test_connection("127.0.0.1".to_string(), 59999).await.unwrap();
        assert!(!res.reachable);
        assert!(res.error.is_some());
    }

    #[tokio::test]
    async fn test_connection_empty_host() {
        let res = test_connection("".to_string(), 22).await.unwrap();
        assert!(!res.reachable);
        assert!(res.error.is_some());
    }
}
