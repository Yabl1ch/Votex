import { create } from "zustand";
import type {
  TabId,
  AppTheme,
  ProvisioningStatus,
  ProvisioningRequest,
  VotexReport,
  ServerMetrics,
  BannedIP,
  FirewallPort,
  SmartRouteItem,
} from "../types";

export interface AppState {
  // Navigation & Appearance
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;

  // VPS & Provisioning
  vpsConfig: ProvisioningRequest;
  setVpsConfig: (config: Partial<ProvisioningRequest>) => void;
  status: ProvisioningStatus;
  setStatus: (status: ProvisioningStatus) => void;
  progress: number;
  setProgress: (progress: number) => void;
  logs: string[];
  appendLog: (log: string) => void;
  clearLogs: () => void;

  // Server Data & State
  report: VotexReport | null;
  setReport: (report: VotexReport | null) => void;
  metrics: ServerMetrics | null;
  setMetrics: (metrics: ServerMetrics | null) => void;
  error: string | null;
  setError: (error: string | null) => void;
  isConnected: boolean | null;
  setIsConnected: (connected: boolean | null) => void;
  latency: number | null;
  setLatency: (ms: number | null) => void;

  // Security & Hardening Data
  bannedIPs: BannedIP[];
  unbanIP: (ip: string) => void;
  firewallPorts: FirewallPort[];

  // Routing
  smartRoutes: SmartRouteItem[];

  // Actions
  reset: () => void;
  loadSampleReport: () => void;
}

export const initialFirewallPorts: FirewallPort[] = [
  { port: 22, proto: "tcp", service: "SSH Remote Shell", status: "ALLOW" },
  { port: 20443, proto: "tcp", service: "VLESS Reality Vision", status: "ALLOW" },
  { port: 2053, proto: "tcp", service: "SplitHTTP (xhttp)", status: "ALLOW" },
  { port: 8443, proto: "tcp", service: "gRPC Multi-Stream", status: "ALLOW" },
  { port: 2083, proto: "udp", service: "Hysteria 2 (QUIC)", status: "ALLOW" },
  { port: 2088, proto: "tcp", service: "Shadowsocks-2022", status: "ALLOW" },
  { port: 18080, proto: "tcp", service: "Encrypted Sub Service", status: "ALLOW" },
];

export const initialBannedIPs: BannedIP[] = [
  { ip: "194.26.29.112", timestamp: "Сегодня, 14:32", reason: "SSH brute-force (fail2ban)", country: "NL" },
  { ip: "45.148.10.87", timestamp: "Сегодня, 11:15", reason: "Port scan syn-flood", country: "US" },
  { ip: "185.196.8.23", timestamp: "Вчера, 23:40", reason: "Unauthorized probe", country: "DE" },
  { ip: "91.240.118.5", timestamp: "Вчера, 19:04", reason: "SSH invalid user attempt", country: "FR" },
];

export const initialSmartRoutes: SmartRouteItem[] = [
  {
    id: "ru_direct",
    title: "Прямой доступ (РФ)",
    category: "ru_direct",
    description: "Нативная скорость без VPN для российских банков, Госуслуг и маркетплейсов.",
    domains: [
      "*.ru",
      "*.gosuslugi.ru",
      "*.sberbank.ru",
      "*.tbank.ru",
      "*.yandex.ru",
      "*.vk.com",
      "*.ozon.ru",
      "*.wildberries.ru",
      "*.kinopoisk.ru",
      "*.2gis.ru",
    ],
  },
  {
    id: "vpn_tunnel",
    title: "Защищенный туннель (VPN)",
    category: "vpn_tunnel",
    description: "Автоматическая маскировка и пропуск через VLESS Reality & SplitHTTP.",
    domains: [
      "*.youtube.com",
      "*.googlevideo.com",
      "*.anthropic.com",
      "*.claude.ai",
      "*.openai.com",
      "*.chatgpt.com",
      "*.gemini.google.com",
      "*.instagram.com",
      "*.twitter.com",
      "*.x.com",
      "*.discord.com",
      "*.notion.so",
    ],
  },
  {
    id: "blocked",
    title: "Блокировка (AdBlock & Safe)",
    category: "blocked",
    description: "Блокировка рекламы, фишинговых трекеров и телеметрии на уровне сервера.",
    domains: [
      "*.doubleclick.net",
      "*.adservice.google.com",
      "*.telemetry.*",
      "*.analytics.yahoo.com",
      "*.ads.*",
    ],
  },
];

export const defaultMockReport: VotexReport = {
  status: "active",
  server_ip: "89.125.126.90",
  subscription_url: "https://89.125.126.90:18080/sub/9f8a3c2e1b4d5e6f7a8b9c0d1e2f3a4b",
  subscription_token: "9f8a3c2e1b4d5e6f7a8b9c0d1e2f3a4b",
  uuid: "d39eb05f-b8c1-4bb2-9149-ece532946204",
  reality_public_key: "K8z9xL2pQ1vR4sT7uW0yA3bC6eH9jM1oP4rS7tU0wXA",
  short_id: "7b4c9e1f",
  benchmark: {
    latency_ms: 28,
    speed_mbps: 480,
    protocols: {
      hysteria2: { port: 2083, latency_ms: 28, status: "SUCCESS" },
      vision: { port: 20443, latency_ms: 34, status: "SUCCESS" },
      shadowsocks: { port: 2088, latency_ms: 36, status: "SUCCESS" },
      grpc: { port: 8443, latency_ms: 38, status: "SUCCESS" },
      xhttp: { port: 2053, latency_ms: 52, status: "SUCCESS" },
    },
  },
  hardening: {
    tcp_bbr: true,
    fail2ban: true,
    ufw: true,
    allowed_ports: [22, 20443, 2053, 8443, 2083, 2088, 18080],
  },
};

export const useAppStore = create<AppState>((set) => ({
  activeTab: "dashboard",
  setActiveTab: (activeTab) => set({ activeTab }),

  theme: "obsidian",
  setTheme: (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },

  vpsConfig: {
    host: "89.125.126.90",
    port: 22,
    username: "root",
    password: "",
  },
  setVpsConfig: (newConfig) =>
    set((state) => ({ vpsConfig: { ...state.vpsConfig, ...newConfig } })),

  status: "idle",
  setStatus: (status) => set({ status }),

  progress: 0,
  setProgress: (progress) => set({ progress }),

  logs: [],
  appendLog: (log) =>
    set((state) => ({
      logs: [...state.logs, log],
    })),
  clearLogs: () => set({ logs: [], progress: 0, error: null }),

  report: defaultMockReport,
  setReport: (report) => set({ report }),

  metrics: {
    host: "89.125.126.90",
    is_reachable: true,
    latency_ms: 28,
    subscription_active: true,
    ufw_ok: true,
    timestamp: new Date().toISOString(),
  },
  setMetrics: (metrics) => set({ metrics }),

  error: null,
  setError: (error) => set({ error }),

  isConnected: true,
  setIsConnected: (isConnected) => set({ isConnected }),

  latency: 28,
  setLatency: (latency) => set({ latency }),

  bannedIPs: initialBannedIPs,
  unbanIP: (ip) =>
    set((state) => ({
      bannedIPs: state.bannedIPs.filter((item) => item.ip !== ip),
    })),

  firewallPorts: initialFirewallPorts,
  smartRoutes: initialSmartRoutes,

  reset: () =>
    set({
      status: "idle",
      progress: 0,
      logs: [],
      report: null,
      error: null,
      isConnected: null,
      latency: null,
    }),

  loadSampleReport: () =>
    set({
      report: defaultMockReport,
      isConnected: true,
      latency: 28,
    }),
}));
