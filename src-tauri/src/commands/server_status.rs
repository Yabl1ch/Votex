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

#[cfg(test)]
mod tests {
    use super::*;

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
