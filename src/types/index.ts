export type TabId =
  | "dashboard"
  | "provisioning"
  | "reports"
  | "subscription"
  | "security"
  | "settings";

export type AppTheme = "obsidian" | "sage";

export type ProvisioningStatus = "idle" | "testing" | "provisioning" | "success" | "error";

export interface ProvisioningRequest {
  host: string;
  port: number;
  username: string;
  password?: string;
}

export interface ProtocolBenchmark {
  port: number;
  latency_ms: number;
  status: string;
}

export interface BenchmarkData {
  latency_ms: number;
  speed_mbps: number;
  protocols: {
    vision: ProtocolBenchmark;
    xhttp: ProtocolBenchmark;
    grpc: ProtocolBenchmark;
    hysteria2: ProtocolBenchmark;
    shadowsocks: ProtocolBenchmark;
    [key: string]: ProtocolBenchmark;
  };
}

export interface HardeningData {
  tcp_bbr: boolean;
  fail2ban: boolean;
  ufw: boolean;
  allowed_ports: number[];
}

export interface VotexReport {
  status: string;
  server_ip: string;
  subscription_url: string;
  subscription_token: string;
  uuid: string;
  reality_public_key: string;
  short_id: string;
  benchmark: BenchmarkData;
  hardening: HardeningData;
}

export interface ConnectionTestResult {
  host: string;
  port: number;
  reachable: boolean;
  latency_ms?: number;
  error?: string;
}

export interface SpeedTestResult {
  download_mbps: number;
  upload_mbps: number;
  ping_ms: number;
  timestamp: string;
}

export interface ServerMetrics {
  host: string;
  is_reachable: boolean;
  latency_ms?: number;
  uptime_seconds?: number;
  uptime_str?: string;
  cpu_percent?: number;
  ram_used_mb?: number;
  ram_total_mb?: number;
  ram_percent?: number;
  location_city?: string;
  location_country?: string;
  location_country_code?: string;
  subscription_active: boolean;
  ufw_ok: boolean;
  timestamp: string;
}

export interface VaultRecord {
  host: string;
  port: number;
  username?: string;
  subscription_token: string;
  subscription_url: string;
  updated_at: string;
}

export interface GitHubReleaseInfo {
  version: string;
  published_at: string;
  html_url: string;
  is_latest: boolean;
  notes?: string;
}

export interface BannedIP {
  ip: string;
  timestamp: string;
  reason: string;
  country?: string;
}

export interface FirewallPort {
  port: number;
  proto: "tcp" | "udp" | "tcp/udp";
  service: string;
  status: "ALLOW" | "DENY";
  comment?: string;
}

export interface SmartRouteItem {
  id: string;
  title: string;
  category: "ru_direct" | "vpn_tunnel" | "blocked";
  description: string;
  domains: string[];
}

declare global {
  const __BUILD_TIME__: string;
  const __APP_VERSION__: string;
}
