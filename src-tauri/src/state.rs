use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use crate::vault::Vault;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProtocolBenchmark {
    pub port: u16,
    pub latency_ms: u32,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchmarkProtocols {
    pub vision: ProtocolBenchmark,
    pub xhttp: ProtocolBenchmark,
    pub grpc: ProtocolBenchmark,
    pub hysteria2: ProtocolBenchmark,
    pub shadowsocks: ProtocolBenchmark,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BenchmarkReport {
    pub latency_ms: u32,
    pub speed_mbps: u32,
    pub protocols: BenchmarkProtocols,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardeningReport {
    pub tcp_bbr: bool,
    pub fail2ban: bool,
    pub ufw: bool,
    pub allowed_ports: Vec<u16>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VotexReport {
    pub status: String,
    pub server_ip: String,
    pub subscription_url: String,
    pub subscription_token: String,
    pub uuid: String,
    pub reality_public_key: String,
    pub short_id: String,
    pub benchmark: BenchmarkReport,
    pub hardening: HardeningReport,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionTestResult {
    pub host: String,
    pub port: u16,
    pub reachable: bool,
    pub latency_ms: Option<u64>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerMetrics {
    pub host: String,
    pub is_reachable: bool,
    pub latency_ms: Option<u64>,
    pub subscription_active: bool,
    pub ufw_ok: bool,
    pub timestamp: String,
}

pub struct AppState {
    pub current_report: Mutex<Option<VotexReport>>,
    pub is_provisioning: Mutex<bool>,
    pub vault: Mutex<Vault>,
}

impl AppState {
    pub fn new() -> Result<Self, String> {
        let vault = Vault::new().map_err(|e| format!("Failed to initialize vault: {}", e))?;
        Ok(Self {
            current_report: Mutex::new(None),
            is_provisioning: Mutex::new(false),
            vault: Mutex::new(vault),
        })
    }
}
