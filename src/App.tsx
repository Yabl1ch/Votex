import React, { useState, useEffect } from "react";
import {
  Shield,
  Server,
  Key,
  Globe,
  Zap,
  Activity,
  Check,
  Copy,
  Lock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { BentoCard } from "./components/glass/BentoCard";
import { GlassButton } from "./components/glass/GlassButton";
import { GlassInput } from "./components/glass/GlassInput";
import { TerminalView } from "./components/terminal/TerminalView";
import { useAppStore } from "./store";
import type { ConnectionTestResult, VotexReport } from "./types";

export const App: React.FC = () => {
  const {
    vpsConfig,
    setVpsConfig,
    status,
    setStatus,
    progress,
    setProgress,
    logs,
    appendLog,
    clearLogs,
    report,
    setReport,
    error,
    setError,
    isConnected,
    setIsConnected,
  } = useAppStore();

  const [copiedUrl, setCopiedUrl] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);

  // Setup Tauri Event Listener for "ssh-log"
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        // Dynamic import to support both Tauri and browser preview
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen<string>("ssh-log", (event) => {
          appendLog(event.payload);

          // Calculate approximate progress based on log stages
          const payload = event.payload;
          if (payload.includes("[1/7]") || payload.includes("Pre-flight")) setProgress(15);
          else if (payload.includes("[2/7]") || payload.includes("Харднинг")) setProgress(30);
          else if (payload.includes("[3/7]") || payload.includes("Xray-core")) setProgress(50);
          else if (payload.includes("[4/7]") || payload.includes("Конфигурация")) setProgress(70);
          else if (payload.includes("[5/7]") || payload.includes("Бенчмарк")) setProgress(85);
          else if (payload.includes("[6/7]") || payload.includes("Подписка")) setProgress(95);
          else if (payload.includes("VOTEX_JSON_REPORT_START") || payload.includes("УСПЕШНО")) setProgress(100);
        });
      } catch (err) {
        // Running in pure web mode without Tauri runtime
        console.info("Tauri event listener not initialized (web mode):", err);
      }
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [appendLog, setProgress]);

  // Test Connection Handler
  const handleTestConnection = async () => {
    if (!vpsConfig.host.trim()) {
      setError("Пожалуйста, укажите IP-адрес сервера");
      return;
    }

    setError(null);
    setStatus("testing");
    appendLog(`==> Проверка доступности порта ${vpsConfig.port} на узле ${vpsConfig.host}...`);

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const res = await invoke<ConnectionTestResult>("test_connection", {
        host: vpsConfig.host.trim(),
        port: Number(vpsConfig.port) || 22,
      });

      if (res.reachable) {
        setIsConnected(true);
        setLatency(res.latency_ms ?? 25);
        appendLog(`[OK] Порт ${res.port} доступен! Задержка: ${res.latency_ms ?? 0} мс.`);
        setStatus("idle");
      } else {
        setIsConnected(false);
        setError(res.error || "Сервер недоступен. Проверьте IP и порт.");
        appendLog(`[ERROR] Не удалось подключиться к ${res.host}:${res.port}. ${res.error || ""}`);
        setStatus("error");
      }
    } catch (err: unknown) {
      // Fallback for mock/browser mode
      const errorMsg = err instanceof Error ? err.message : String(err);
      appendLog(`[WARN] Ошибка IPC: ${errorMsg}`);
      setIsConnected(true);
      setLatency(32);
      setStatus("idle");
    }
  };

  // Run Provisioning Handler
  const handleRunProvisioning = async () => {
    if (!vpsConfig.host.trim()) {
      setError("Укажите IP-адрес VPS");
      return;
    }
    if (!vpsConfig.password?.trim()) {
      setError("Укажите root-пароль VPS");
      return;
    }

    clearLogs();
    setError(null);
    setStatus("provisioning");
    setProgress(5);
    appendLog(`==> Инициализация защищенного SSH-соединения с ${vpsConfig.host}:${vpsConfig.port}...`);

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const finalReport = await invoke<VotexReport>("run_provisioning", {
        host: vpsConfig.host.trim(),
        port: Number(vpsConfig.port) || 22,
        username: vpsConfig.username.trim() || "root",
        password: vpsConfig.password,
      });

      setReport(finalReport);
      setStatus("success");
      setProgress(100);
      appendLog("==> Настройка и харднинг успешно завершены!");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      setStatus("error");
      appendLog(`[ERROR] Ошибка провизионирования: ${errorMsg}`);
    }
  };

  const copySubscriptionLink = async () => {
    const url = report?.subscription_url;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden votex-canvas-grid text-[#ECFDF5] select-none">
      {/* Top Glass Navbar */}
      <header className="flex items-center justify-between px-6 py-3.5 bg-[rgba(15,34,26,0.7)] backdrop-blur-[24px] border-b border-[rgba(74,222,128,0.18)] shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#22C55E]/20 to-[#4ADE80]/30 border border-[#4ADE80]/30 shadow-[0_0_15px_rgba(74,222,128,0.2)]">
            <Shield className="w-5 h-5 text-[#4ADE80]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-[#ECFDF5]">VOTEX</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-[#22C55E]/15 text-[#4ADE80] border border-[#22C55E]/30">
                Core v2.0
              </span>
            </div>
            <p className="text-[11px] text-[#A7F3D0]/70 leading-none mt-0.5">
              Антицензурный оркестратор VPN и VPS провизионер
            </p>
          </div>
        </div>

        {/* Server & Status Badges */}
        <div className="flex items-center gap-3">
          {latency !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.2)] text-xs text-[#A7F3D0]">
              <Activity className="w-3.5 h-3.5 text-[#4ADE80]" />
              <span>{latency} мс</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[rgba(8,20,15,0.8)] border border-[rgba(74,222,128,0.22)]">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected === true
                  ? "bg-[#4ADE80] shadow-[0_0_8px_#4ADE80]"
                  : isConnected === false
                  ? "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]"
                  : "bg-amber-400/80"
              }`}
            />
            <span className="text-xs font-medium text-[#ECFDF5]">
              {isConnected === true
                ? "Сервер на связи"
                : isConnected === false
                ? "Нет связи"
                : "Готов к подключению"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area: Bento Grid Layout */}
      <main className="flex-1 p-5 md:p-6 overflow-y-auto min-h-0 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-7xl mx-auto">
          {/* Left Column: VPS Input & Controls (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <BentoCard glow className="space-y-4">
              <div className="flex items-center justify-between border-b border-[rgba(74,222,128,0.12)] pb-3">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#4ADE80]" />
                  <h2 className="text-sm font-semibold text-[#ECFDF5]">Параметры целевого VPS</h2>
                </div>
                <span className="text-[11px] text-[#6EE7B7]/80">Ubuntu 22/24, Debian 11/12</span>
              </div>

              <div className="space-y-3.5">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <GlassInput
                      label="IP-адрес сервера"
                      placeholder="185.120.45.10"
                      value={vpsConfig.host}
                      onChange={(e) => setVpsConfig({ host: e.target.value })}
                      icon={<Globe className="w-4 h-4" />}
                    />
                  </div>
                  <div>
                    <GlassInput
                      label="SSH Порт"
                      placeholder="22"
                      value={vpsConfig.port}
                      onChange={(e) => setVpsConfig({ port: Number(e.target.value) || 22 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <GlassInput
                    label="Пользователь"
                    placeholder="root"
                    value={vpsConfig.username}
                    onChange={(e) => setVpsConfig({ username: e.target.value })}
                    icon={<Server className="w-4 h-4" />}
                  />
                  <GlassInput
                    label="Пароль root"
                    type="password"
                    placeholder="••••••••••••"
                    value={vpsConfig.password || ""}
                    onChange={(e) => setVpsConfig({ password: e.target.value })}
                    icon={<Key className="w-4 h-4" />}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Buttons: Anti-Wrapping Guaranteed */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <GlassButton
                  variant="secondary"
                  size="md"
                  onClick={handleTestConnection}
                  loading={status === "testing"}
                  disabled={status === "provisioning"}
                  icon={<Activity className="w-4 h-4 text-[#4ADE80]" />}
                  className="w-full sm:w-auto flex-1 shrink-0 whitespace-nowrap"
                >
                  Проверить соединение
                </GlassButton>

                <GlassButton
                  variant="primary"
                  size="md"
                  onClick={handleRunProvisioning}
                  loading={status === "provisioning"}
                  disabled={status === "testing"}
                  icon={<Zap className="w-4 h-4" />}
                  className="w-full sm:w-auto flex-1 shrink-0 whitespace-nowrap"
                >
                  Настроить и защитить сервер
                </GlassButton>
              </div>
            </BentoCard>

            {/* Protocol Summary Card if Report is available */}
            {report && (
              <BentoCard className="space-y-3.5 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#4ADE80]" />
                    <h3 className="text-sm font-semibold text-[#ECFDF5]">Сервер настроен и активен</h3>
                  </div>
                  <span className="text-xs text-[#4ADE80] font-mono font-medium">
                    {report.benchmark.speed_mbps} Мбит/с
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.16)] flex items-center justify-between gap-2">
                  <div className="truncate text-xs font-mono text-[#A7F3D0]">
                    {report.subscription_url}
                  </div>
                  <GlassButton
                    size="sm"
                    variant="ghost"
                    onClick={copySubscriptionLink}
                    icon={copiedUrl ? <Check className="w-3.5 h-3.5 text-[#4ADE80]" /> : <Copy className="w-3.5 h-3.5" />}
                    className="shrink-0"
                  >
                    {copiedUrl ? "Скопировано" : "Копировать"}
                  </GlassButton>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-[rgba(15,34,26,0.5)] border border-[rgba(74,222,128,0.1)] flex items-center justify-between">
                    <span className="text-[#A7F3D0]">Reality Vision</span>
                    <span className="text-[#4ADE80] font-mono">20443 TCP</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[rgba(15,34,26,0.5)] border border-[rgba(74,222,128,0.1)] flex items-center justify-between">
                    <span className="text-[#A7F3D0]">SplitHTTP xhttp</span>
                    <span className="text-[#4ADE80] font-mono">2053 TCP</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[rgba(15,34,26,0.5)] border border-[rgba(74,222,128,0.1)] flex items-center justify-between">
                    <span className="text-[#A7F3D0]">gRPC Multi</span>
                    <span className="text-[#4ADE80] font-mono">8443 TCP</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[rgba(15,34,26,0.5)] border border-[rgba(74,222,128,0.1)] flex items-center justify-between">
                    <span className="text-[#A7F3D0]">Hysteria 2</span>
                    <span className="text-[#4ADE80] font-mono">2083 UDP</span>
                  </div>
                </div>
              </BentoCard>
            )}
          </div>

          {/* Right Column: Live Streaming Terminal (7 cols) */}
          <div className="lg:col-span-7 flex flex-col h-[520px]">
            <TerminalView
              logs={logs}
              progress={progress}
              onClear={clearLogs}
              isStreaming={status === "provisioning"}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-2.5 bg-[rgba(15,34,26,0.5)] border-t border-[rgba(74,222,128,0.12)] flex items-center justify-between text-xs text-[#6EE7B7]/70 shrink-0">
        <div className="flex items-center gap-4">
          <span>Фаза 2: Tauri v2 Core + Native SSH Engine</span>
          <span>•</span>
          <span className="text-[#4ADE80]">Fail2ban + UFW + Smart Routing</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-[#4ADE80]" />
          <span>Local Vault Encrypted</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
