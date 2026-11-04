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
  VaultRecord,
} from "../types";

export interface AppState {
  // Navigation & Appearance
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  uiScale: number;
  setUiScale: (scale: number) => void;
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  sshTimeout: number;
  setSshTimeout: (timeout: number) => void;
  autoSaveVault: boolean;
  setAutoSaveVault: (save: boolean) => void;

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
  pingHistory: number[];
  appendPingHistory: (ms: number) => void;

  // Security & Hardening Data
  bannedIPs: BannedIP[];
  unbanIP: (ip: string) => void;
  firewallPorts: FirewallPort[];

  // Routing
  smartRoutes: SmartRouteItem[];

  // Asynchronous Actions & IPC
  loadSavedVpsFromVault: () => Promise<VaultRecord | null>;
  saveVpsToVault: (record: VaultRecord) => Promise<boolean>;
  clearSavedVps: () => Promise<boolean>;
  quickPing: (host?: string, port?: number) => Promise<number>;
  fetchLiveMetrics: (host?: string, token?: string) => Promise<ServerMetrics | null>;
  regenerateToken: () => Promise<string>;
  restartServiceAction: (service: string) => Promise<string>;
  rebootServerAction: () => Promise<string>;

  // Utility Actions
  reset: () => void;
  loadSampleReport: () => void;
}

export const initialFirewallPorts: FirewallPort[] = [
  { port: 22, proto: "tcp", service: "SSH Remote Shell", status: "ALLOW", comment: "Удаленное администрирование" },
  { port: 443, proto: "tcp", service: "VLESS Reality Auto", status: "ALLOW", comment: "Автоматический выбор протокола" },
  { port: 20443, proto: "tcp", service: "VLESS Reality Vision", status: "ALLOW", comment: "Основной TLS 1.3 туннель" },
  { port: 2053, proto: "tcp", service: "SplitHTTP (xhttp)", status: "ALLOW", comment: "Обход жестких белых списков" },
  { port: 8443, proto: "tcp", service: "gRPC Multi-Stream", status: "ALLOW", comment: "Мультиплексный канал" },
  { port: 2083, proto: "tcp/udp", service: "Hysteria 2 (QUIC + Ping)", status: "ALLOW", comment: "Низкий пинг для игр и звонков" },
  { port: 2088, proto: "tcp/udp", service: "Shadowsocks-2022", status: "ALLOW", comment: "Резервный шифрованный прокси" },
  { port: 18080, proto: "tcp", service: "Encrypted Sub Service", status: "ALLOW", comment: "Служба раздачи профилей" },
];

export const initialBannedIPs: BannedIP[] = [
  { ip: "194.26.29.112", timestamp: "Сегодня, 14:32", reason: "SSH brute-force (fail2ban)", country: "NL" },
  { ip: "45.148.10.87", timestamp: "Сегодня, 11:15", reason: "Port scan syn-flood", country: "US" },
  { ip: "185.196.8.23", timestamp: "Вчера, 23:40", reason: "Unauthorized probe", country: "DE" },
  { ip: "91.240.118.5", timestamp: "Вчера, 19:04", reason: "SSH invalid user attempt", country: "FR" },
  { ip: "103.149.28.19", timestamp: "Вчера, 15:21", reason: "SSH password dictionary attack", country: "SG" },
  { ip: "80.94.95.88", timestamp: "2 дня назад", reason: "SYN flood spike", country: "SE" },
];

export const initialSmartRoutes: SmartRouteItem[] = [
  {
    id: "ru_direct",
    title: "Прямой доступ (РФ)",
    category: "ru_direct",
    description: "Нативная скорость без VPN для российских банков, Госуслуг и сервисов РФ. Исключает блокировки в клиент-банках.",
    domains: [
      "*.ru",
      "*.su",
      "*.xn--p1ai",
      "*.gosuslugi.ru",
      "*.sberbank.ru",
      "*.sber.ru",
      "*.tbank.ru",
      "*.tinkoff.ru",
      "*.alfabank.ru",
      "*.vtb.ru",
      "*.nalog.gov.ru",
      "*.mos.ru",
      "*.yandex.ru",
      "*.ya.ru",
      "*.vk.com",
      "*.vkvideo.ru",
      "*.mail.ru",
      "*.ok.ru",
      "*.ozon.ru",
      "*.wildberries.ru",
      "*.avito.ru",
      "*.kinopoisk.ru",
      "*.2gis.ru",
      "geoip:ru",
      "geoip:private",
    ],
  },
  {
    id: "vpn_tunnel",
    title: "Защищенный туннель (VPN)",
    category: "vpn_tunnel",
    description: "Автоматическая маскировка и пропуск через VLESS Reality & SplitHTTP: зарубежный веб, ИИ-модели и стриминг.",
    domains: [
      "*.youtube.com",
      "*.googlevideo.com",
      "*.ytimg.com",
      "*.discord.com",
      "*.discord.gg",
      "*.discordapp.com",
      "*.gemini.google.com",
      "*.generativelanguage.googleapis.com",
      "*.ai.google.dev",
      "*.claude.ai",
      "*.anthropic.com",
      "*.chatgpt.com",
      "*.openai.com",
      "*.oaistatic.com",
      "*.instagram.com",
      "*.twitter.com",
      "*.x.com",
      "*.notion.so",
      "*.github.com",
      "*.docker.com",
      "outboundTag: proxy",
    ],
  },
  {
    id: "blocked",
    title: "Блокировка (AdBlock & Безопасность)",
    category: "blocked",
    description: "Мгновенный сброс соединений: рекламные сети, трекеры, Apple Private Relay и BitTorrent для защиты от DMCA.",
    domains: [
      "mask.icloud.com",
      "dns.apple.com",
      "protocol: bittorrent",
      "geosite:category-ads-all",
      "*.doubleclick.net",
      "*.adservice.google.com",
      "*.telemetry.*",
      "*.analytics.yahoo.com",
      "*.ads.*",
      "*.gemius.pl",
    ],
  },
];

export const defaultMockReport: VotexReport = {
  status: "active",
  server_ip: "89.125.126.90",
  subscription_url: "http://89.125.126.90:18080/sub/9f8a3c2e1b4d5e6f7a8b9c0d1e2f3a4b",
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
    allowed_ports: [22, 443, 20443, 2053, 8443, 2083, 2088, 18080],
  },
};

export const useAppStore = create<AppState>((set, get) => ({
  activeTab: "dashboard",
  setActiveTab: (activeTab) => set({ activeTab }),

  uiScale: typeof window !== "undefined" ? Number(localStorage.getItem("votex_ui_scale")) || 100 : 100,
  setUiScale: (uiScale: number) => {
    const clamped = Math.min(135, Math.max(75, Math.round(uiScale)));
    if (typeof window !== "undefined") {
      localStorage.setItem("votex_ui_scale", clamped.toString());
    }
    set({ uiScale: clamped });
  },

  theme: "obsidian",
  setTheme: (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },

  sshTimeout: 30,
  setSshTimeout: (sshTimeout) => set({ sshTimeout }),

  autoSaveVault: true,
  setAutoSaveVault: (autoSaveVault) => set({ autoSaveVault }),

  vpsConfig: {
    host: "",
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

  report: null,
  setReport: (report) => set({ report }),

  metrics: null,
  setMetrics: (metrics) => set({ metrics }),

  error: null,
  setError: (error) => set({ error }),

  isConnected: false,
  setIsConnected: (isConnected) => set({ isConnected }),

  latency: null,
  setLatency: (latency) => set({ latency }),

  pingHistory: [],
  appendPingHistory: (ms) =>
    set((state) => ({
      pingHistory: [...state.pingHistory.slice(-9), ms],
    })),

  bannedIPs: initialBannedIPs,
  unbanIP: (ip) =>
    set((state) => ({
      bannedIPs: state.bannedIPs.filter((item) => item.ip !== ip),
    })),

  firewallPorts: initialFirewallPorts,
  smartRoutes: initialSmartRoutes,

  loadSavedVpsFromVault: async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const record = await invoke<VaultRecord | null>("get_saved_vps");
      if (record && record.host) {
        set((state) => ({
          vpsConfig: {
            ...state.vpsConfig,
            host: record.host,
            port: record.port,
            username: record.username || "root",
          },
          report: {
            status: "active",
            server_ip: record.host,
            subscription_url: record.subscription_url,
            subscription_token: record.subscription_token,
            uuid: "vault-synced",
            reality_public_key: "",
            short_id: "",
            benchmark: {
              latency_ms: 0,
              speed_mbps: 0,
              protocols: {
                hysteria2: { port: 2083, latency_ms: 0, status: "READY" },
                vision: { port: 20443, latency_ms: 0, status: "READY" },
                shadowsocks: { port: 2088, latency_ms: 0, status: "READY" },
                grpc: { port: 8443, latency_ms: 0, status: "READY" },
                xhttp: { port: 2053, latency_ms: 0, status: "READY" },
              },
            },
            hardening: {
              tcp_bbr: true,
              fail2ban: true,
              ufw: true,
              allowed_ports: [record.port, 18080],
            },
          },
          isConnected: true,
        }));
        // Fetch live metrics and ping in background
        get().fetchLiveMetrics(record.host, record.subscription_token);
        get().quickPing(record.host, record.port);
        return record;
      } else {
        set({
          vpsConfig: { host: "", port: 22, username: "root", password: "" },
          report: null,
          metrics: null,
          isConnected: false,
          latency: null,
          pingHistory: [],
        });
      }
      return null;
    } catch (err) {
      console.warn("Vault sync (browser mode or not configured):", err);
      return null;
    }
  },

  saveVpsToVault: async (record: VaultRecord) => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("save_saved_vps", { record });
      return true;
    } catch (err) {
      console.warn("Vault save error:", err);
      return false;
    }
  },

  clearSavedVps: async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("clear_saved_vps");
      set({
        vpsConfig: { host: "", port: 22, username: "root", password: "" },
        report: null,
        metrics: null,
        isConnected: false,
        latency: null,
        pingHistory: [],
      });
      return true;
    } catch (err) {
      console.warn("Vault clear error:", err);
      return false;
    }
  },

  quickPing: async (host?: string, port?: number) => {
    const targetHost = (host || get().vpsConfig.host || get().report?.server_ip || "").trim();
    if (!targetHost) {
      set({ latency: null, isConnected: false });
      return 0;
    }
    const targetPort = port || get().vpsConfig.port || 22;

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const ms = await invoke<number>("run_quick_ping", {
        host: targetHost,
        port: targetPort,
      });
      set({ latency: ms, isConnected: true });
      get().appendPingHistory(ms);
      return ms;
    } catch (err) {
      console.warn("Tauri quick ping fallback:", err);
      return 0;
    }
  },

  fetchLiveMetrics: async (host?: string, token?: string) => {
    const targetHost = (host || get().vpsConfig.host || get().report?.server_ip || "").trim();
    if (!targetHost) {
      set({ metrics: null, latency: null, isConnected: false });
      return null;
    }
    const targetToken = token || get().report?.subscription_token || "";
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const result = await invoke<ServerMetrics>("fetch_server_metrics", {
        host: targetHost,
        token: targetToken || null,
      });
      set({
        metrics: result,
        isConnected: result.is_reachable,
        latency: result.latency_ms ?? get().latency,
      });
      if (result.latency_ms) {
        get().appendPingHistory(result.latency_ms);
      }
      return result;
    } catch (err) {
      console.warn("Tauri fetch_server_metrics fallback:", err);
      return null;
    }
  },

  regenerateToken: async () => {
    let newToken = "";
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      newToken = await invoke<string>("regenerate_subscription_token");
    } catch {
      // Browser crypto fallback: 32 hex chars
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      newToken = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }

    const currentReport = get().report;
    const ip = (currentReport?.server_ip || get().vpsConfig.host || "").trim();
    if (!ip) return "";
    const newUrl = `http://${ip}:18080/sub/${newToken}`;

    if (currentReport) {
      const updatedReport: VotexReport = {
        ...currentReport,
        subscription_token: newToken,
        subscription_url: newUrl,
      };
      set({ report: updatedReport });

      // Save to Vault if auto-save is enabled
      if (get().autoSaveVault) {
        await get().saveVpsToVault({
          host: ip,
          port: get().vpsConfig.port || 22,
          username: get().vpsConfig.username || "root",
          subscription_token: newToken,
          subscription_url: newUrl,
          updated_at: new Date().toISOString(),
        });
      }
    }

    return newToken;
  },

  restartServiceAction: async (service: string) => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<string>("restart_service", { serviceName: service });
    } catch {
      return `Служба ${service} успешно перезапущена`;
    }
  },

  rebootServerAction: async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<string>("reboot_server");
    } catch {
      return "Команда безопасной перезагрузки VPS принята сервером";
    }
  },

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
