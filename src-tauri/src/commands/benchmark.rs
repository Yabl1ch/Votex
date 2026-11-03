use std::time::{Duration, Instant};
use tokio::net::TcpStream;
use tokio::time::timeout;

#[tauri::command]
pub async fn run_quick_ping(host: String, port: Option<u16>) -> Result<u64, String> {
    let port = port.unwrap_or(22);
    let addr = format!("{}:{}", host.trim(), port);
    let start = Instant::now();

    match timeout(Duration::from_secs(3), TcpStream::connect(&addr)).await {
        Ok(Ok(_)) => Ok(start.elapsed().as_millis() as u64),
        Ok(Err(e)) => Err(format!("Ошибка соединения с {}: {}", addr, e)),
        Err(_) => Err(format!("Таймаут соединения с {}", addr)),
    }
}
