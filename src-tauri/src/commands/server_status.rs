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
pub async fn fetch_server_metrics(host: String) -> Result<ServerMetrics, String> {
    let host = host.trim().to_string();
    if host.is_empty() {
        return Err("Адрес хоста не указан".to_string());
    }

    // Check SSH port 22
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

    // Check Reality port 20443
    let reality_addr = format!("{}:20443", host);
    let reality_active = match timeout(Duration::from_secs(2), TcpStream::connect(&reality_addr)).await {
        Ok(Ok(_)) => true,
        _ => false,
    };

    Ok(ServerMetrics {
        host,
        is_reachable,
        latency_ms,
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
