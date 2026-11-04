import React, { useState, useEffect } from "react";
import {
  Server,
  Globe,
  Copy,
  Check,
  ShieldCheck,
  Activity,
  Layers,
  Flame,
  Radio,
  Lock,
  ExternalLink,
  RefreshCw,
  Clock,
  Cpu,
  Shield,
  Zap,
} from "lucide-react";
import { BentoGrid, BentoCard, GlassButton, StatusBadge } from "../components/bento";
import { useAppStore } from "../store";

export const DashboardPage: React.FC = () => {
  const {
    report,
    isConnected,
    latency,
    metrics,
    pingHistory,
    quickPing,
    fetchLiveMetrics,
    setActiveTab,
    vpsConfig,
  } = useAppStore();

  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const serverIp = (report?.server_ip || vpsConfig.host || "").trim();
  const subUrl = report?.subscription_url || "";
  const hasVps = Boolean(serverIp && isConnected);

  // Initial live telemetry poll on mount
  useEffect(() => {
    if (serverIp) {
      fetchLiveMetrics(serverIp, report?.subscription_token);
      quickPing(serverIp, vpsConfig.port || 22);
    }
  }, [serverIp, report?.subscription_token]);

  const handleCopyLink = async () => {
    if (!subUrl) return;
    try {
      await navigator.clipboard.writeText(subUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Failed to copy link to clipboard:", err);
    }
  };

  const handleRefresh = async () => {
    if (!serverIp) return;
    setIsRefreshing(true);
    try {
      await Promise.all([
        quickPing(serverIp, vpsConfig.port || 22),
        fetchLiveMetrics(serverIp, report?.subscription_token),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Protocols dynamic latency from report if present
  const protoBench = report?.benchmark?.protocols;
  const visionLatency = hasVps ? (protoBench?.vision?.latency_ms ?? 0) : 0;
  const xhttpLatency = hasVps ? (protoBench?.xhttp?.latency_ms ?? 0) : 0;
  const grpcLatency = hasVps ? (protoBench?.grpc?.latency_ms ?? 0) : 0;
  const hysteriaLatency = hasVps ? (protoBench?.hysteria2?.latency_ms ?? 0) : 0;
  const ssLatency = hasVps ? (protoBench?.shadowsocks?.latency_ms ?? 0) : 0;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Page Header */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-5 md:px-6 pt-4 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#ECFDF5] font-sans">
            Панель управления сервером
          </h1>
          <p className="text-sm text-[#A7F3D0]/70 mt-1">
            Оперативный мониторинг антицензурного узла и быстрая синхронизация клиентов
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <GlassButton
            variant="secondary"
            size="md"
            onClick={handleRefresh}
            loading={isRefreshing}
            icon={<RefreshCw className={`w-4 h-4 text-[#4ADE80] ${isRefreshing ? "animate-spin" : ""}`} />}
            className="whitespace-nowrap"
          >
            Обновить статус
          </GlassButton>
        </div>
      </div>

      <BentoGrid cols={12}>
        {/* Module 1: Hero Server Status (Col 7) */}
        <BentoCard
          colSpan={7}
          glow
          icon={<Server className="w-5 h-5 text-[#4ADE80]" />}
          title="Состояние VPS узла"
          subtitle="Персональный выделенный сервер Votex"
          badge={
            <StatusBadge
              status={hasVps ? "protected" : "offline"}
              label={hasVps ? "Сервер защищен и активен" : "Сервер не настроен"}
            />
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-2">
            <div className="p-3 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.14)]">
              <span className="text-[10px] text-[#A7F3D0]/60 uppercase font-semibold flex items-center gap-1 mb-1">
                <Globe className="w-3 h-3 text-[#4ADE80]" /> IP Адрес
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-[#ECFDF5] truncate block">
                {serverIp || "—"}
              </span>
              <span className="text-[10px] text-[#6EE7B7] truncate block mt-0.5">
                {hasVps
                  ? metrics?.location_city
                    ? `${metrics.location_city}, ${metrics.location_country_code || metrics.location_country}`
                    : "Сервер в сети"
                  : "Отсутствует"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.14)]">
              <span className="text-[10px] text-[#A7F3D0]/60 uppercase font-semibold flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3 text-[#4ADE80]" /> Uptime
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-[#ECFDF5] truncate block">
                {hasVps ? (metrics?.uptime_str || "В сети") : "0ч 0м"}
              </span>
              <span className="text-[10px] text-[#6EE7B7] truncate block mt-0.5">
                {hasVps ? (metrics?.is_reachable ? "Без перезагрузок" : "Проверка связи...") : "Оффлайн"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.14)]">
              <span className="text-[10px] text-[#A7F3D0]/60 uppercase font-semibold flex items-center gap-1 mb-1">
                <Activity className="w-3 h-3 text-[#4ADE80]" /> Пинг (TCP)
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-[#ECFDF5] truncate block">
                {hasVps && (latency !== null || metrics?.latency_ms)
                  ? `${latency ?? metrics?.latency_ms} мс`
                  : "0 мс"}
              </span>
              <span className="text-[10px] text-[#4ADE80] truncate block mt-0.5">
                {hasVps ? "0% потерь пакетов" : "Нет связи"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.14)]">
              <span className="text-[10px] text-[#A7F3D0]/60 uppercase font-semibold flex items-center gap-1 mb-1">
                <Cpu className="w-3 h-3 text-[#4ADE80]" /> Нагрузка ЦП
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-[#ECFDF5] truncate block">
                {hasVps && metrics?.cpu_percent !== undefined && metrics.cpu_percent > 0
                  ? `${metrics.cpu_percent}% / ${metrics.ram_used_mb ? (metrics.ram_used_mb / 1024).toFixed(1) + ' ГБ' : '—'}`
                  : hasVps
                  ? "Минимальная"
                  : "0% / 0 ГБ"}
              </span>
              <span className="text-[10px] text-[#6EE7B7] truncate block mt-0.5">
                {hasVps && metrics?.ram_percent !== undefined && metrics.ram_percent > 0
                  ? `ОЗУ: ${metrics.ram_percent}% исп.`
                  : hasVps
                  ? "ОЗУ: в норме"
                  : "ОЗУ: 0%"}
              </span>
            </div>
          </div>

          {/* Mini Sparkline / History of Pings */}
          <div className="mt-3 p-3 rounded-xl bg-[rgba(8,20,15,0.55)] border border-[rgba(74,222,128,0.12)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#4ADE80]" />
              <span className="text-xs text-[#A7F3D0]/80">Стабильность пинга (последние запросы):</span>
            </div>
            <div className="flex items-end gap-1.5 h-6">
              {pingHistory.length > 0 ? (
                pingHistory.map((val, idx) => {
                  const heightPct = Math.min(100, Math.max(25, (val / 50) * 100));
                  return (
                    <div
                      key={idx}
                      title={`${val} мс`}
                      style={{ height: `${heightPct}%` }}
                      className="w-1.5 rounded-full bg-gradient-to-t from-[#22C55E] to-[#4ADE80] opacity-80 hover:opacity-100 transition-all cursor-default"
                    />
                  );
                })
              ) : (
                <span className="text-[11px] text-[#A7F3D0]/50 italic">Нет замеров</span>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[rgba(74,222,128,0.1)] flex items-center justify-between text-xs sm:text-sm text-[#A7F3D0]/80">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#4ADE80]" />
              {hasVps
                ? "Защита ядра Linux: TCP BBR + Fail2ban + UFW Firewall активны"
                : "Серверная защита ядра Linux: не развернута"}
            </span>
            <span className={`text-xs font-mono font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
              hasVps
                ? "bg-[#22C55E]/15 text-[#4ADE80] border border-[#22C55E]/30"
                : "bg-zinc-800 text-zinc-400 border border-zinc-700"
            }`}>
              {hasVps ? "100% Защищено" : "0% Не настроено"}
            </span>
          </div>
        </BentoCard>

        {/* Module 2: Quick Copy Subscription (Col 5) */}
        <BentoCard
          colSpan={5}
          glow
          icon={<ExternalLink className="w-5 h-5 text-[#4ADE80]" />}
          title="Ссылка подписки"
          subtitle="Умная маршрутизация Votex-auto и 5 протоколов"
          badge={
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full font-mono ${
              hasVps
                ? "bg-[#22C55E]/15 text-[#4ADE80] border border-[#22C55E]/30"
                : "bg-zinc-800 text-zinc-400 border border-zinc-700"
            }`}>
              {hasVps ? "Happ / v2rayN" : "Ожидание VPS"}
            </span>
          }
        >
          <div className="space-y-3.5 my-1">
            <p className="text-sm text-[#A7F3D0]/80 leading-relaxed">
              {hasVps
                ? "Персональный URL для автоматического импорта узла Votex-auto (leastPing) или 5 протоколов в мобильный и десктопный клиент."
                : "Ссылка появится здесь после первоначальной настройки сервера в Мастере установки."}
            </p>

            <div className="p-3.5 rounded-xl bg-[rgba(8,20,15,0.85)] border border-[rgba(74,222,128,0.2)] flex items-center gap-2">
              <div className="truncate font-mono text-sm select-all flex-1">
                {subUrl ? (
                  <span className="text-[#4ADE80]">{subUrl}</span>
                ) : (
                  <span className="text-[#A7F3D0]/40 italic">Подписка не создана (VPN не настроен)</span>
                )}
              </div>
            </div>

            <div className="pt-2">
              <GlassButton
                variant="primary"
                size="md"
                onClick={handleCopyLink}
                disabled={!subUrl}
                icon={copied ? <Check className="w-5 h-5 text-[#06100C]" /> : <Copy className="w-5 h-5" />}
                className="w-full whitespace-nowrap"
              >
                {copied
                  ? "Ссылка скопирована в буфер!"
                  : subUrl
                  ? "Копировать ссылку для Happ (Votex-auto)"
                  : "Сначала настройте сервер"}
              </GlassButton>
            </div>

            <div className="flex items-center justify-between pt-1 text-xs text-[#A7F3D0]/70">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#4ADE80]" />
                {hasVps ? "Auto-Select узел включен" : "Ожидание настройки"}
              </span>
              <button
                type="button"
                onClick={() => setActiveTab("subscription")}
                className="text-[#4ADE80] hover:underline cursor-pointer font-medium"
              >
                QR-код и параметры
              </button>
            </div>
          </div>
        </BentoCard>

        {/* Module 3: Protocol Quick Matrix (Col 12) */}
        <BentoCard
          colSpan={12}
          title="Матрица активных протоколов обхода блокировок"
          subtitle={
            hasVps
              ? "Все 5 независимых инстансов запущены и слушают защищенные порты"
              : "Протоколы будут запущены после развертывания сервера в Мастере установки"
          }
          icon={<Layers className="w-5 h-5 text-[#4ADE80]" />}
          action={
            <GlassButton
              size="sm"
              variant="outline"
              onClick={() => setActiveTab("reports")}
              className="whitespace-nowrap"
            >
              Тесты скорости
            </GlassButton>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-1">
            {/* Protocol 1: Reality Vision */}
            <div className="p-3.5 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.18)] hover:border-[rgba(74,222,128,0.4)] transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-[#22C55E]/15 text-[#4ADE80]">
                  <Shield className="w-4 h-4" />
                </div>
                <StatusBadge size="sm" status={hasVps ? "online" : "neutral"} label={hasVps ? "TCP 20443" : "—"} />
              </div>
              <h4 className="text-xs font-bold text-[#ECFDF5]">VLESS Reality</h4>
              <p className="text-[11px] text-[#A7F3D0]/70 mt-0.5">Vision TLS-маскировка</p>
              <div className="mt-3 pt-2 border-t border-[rgba(74,222,128,0.1)] flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#6EE7B7]">addons.mozilla.org</span>
                <span className={`font-bold ${hasVps ? "text-[#4ADE80]" : "text-zinc-500"}`}>
                  {hasVps && visionLatency ? `~${visionLatency} мс` : "0 мс"}
                </span>
              </div>
            </div>

            {/* Protocol 2: SplitHTTP */}
            <div className="p-3.5 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.18)] hover:border-[rgba(74,222,128,0.4)] transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-[#4ADE80]/15 text-[#86EFAC]">
                  <Radio className="w-4 h-4" />
                </div>
                <StatusBadge size="sm" status={hasVps ? "online" : "neutral"} label={hasVps ? "TCP 2053" : "—"} />
              </div>
              <h4 className="text-xs font-bold text-[#ECFDF5]">SplitHTTP (xhttp)</h4>
              <p className="text-[11px] text-[#A7F3D0]/70 mt-0.5">Обход белых списков</p>
              <div className="mt-3 pt-2 border-t border-[rgba(74,222,128,0.1)] flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#6EE7B7]">MIME Stream</span>
                <span className={`font-bold ${hasVps ? "text-[#4ADE80]" : "text-zinc-500"}`}>
                  {hasVps && xhttpLatency ? `~${xhttpLatency} мс` : "0 мс"}
                </span>
              </div>
            </div>

            {/* Protocol 3: gRPC Multi */}
            <div className="p-3.5 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.18)] hover:border-[rgba(74,222,128,0.4)] transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-[#6EE7B7]/15 text-[#4ADE80]">
                  <Layers className="w-4 h-4" />
                </div>
                <StatusBadge size="sm" status={hasVps ? "online" : "neutral"} label={hasVps ? "TCP 8443" : "—"} />
              </div>
              <h4 className="text-xs font-bold text-[#ECFDF5]">gRPC Multi-Stream</h4>
              <p className="text-[11px] text-[#A7F3D0]/70 mt-0.5">Мультиплексный туннель</p>
              <div className="mt-3 pt-2 border-t border-[rgba(74,222,128,0.1)] flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#6EE7B7]">gun multiplex</span>
                <span className={`font-bold ${hasVps ? "text-[#4ADE80]" : "text-zinc-500"}`}>
                  {hasVps && grpcLatency ? `~${grpcLatency} мс` : "0 мс"}
                </span>
              </div>
            </div>

            {/* Protocol 4: Hysteria 2 */}
            <div className="p-3.5 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.18)] hover:border-[rgba(74,222,128,0.4)] transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-[#22C55E]/15 text-[#4ADE80]">
                  <Flame className="w-4 h-4" />
                </div>
                <StatusBadge size="sm" status={hasVps ? "online" : "neutral"} label={hasVps ? "UDP 2083" : "—"} />
              </div>
              <h4 className="text-xs font-bold text-[#ECFDF5]">Hysteria 2 (QUIC)</h4>
              <p className="text-[11px] text-[#A7F3D0]/70 mt-0.5">Низкий пинг для игр</p>
              <div className="mt-3 pt-2 border-t border-[rgba(74,222,128,0.1)] flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#6EE7B7]">Salamander / Brutal</span>
                <span className={`font-bold ${hasVps ? "text-[#4ADE80]" : "text-zinc-500"}`}>
                  {hasVps && hysteriaLatency ? `~${hysteriaLatency} мс` : "0 мс"}
                </span>
              </div>
            </div>

            {/* Protocol 5: Shadowsocks-2022 */}
            <div className="p-3.5 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.18)] hover:border-[rgba(74,222,128,0.4)] transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-[#86EFAC]/15 text-[#34D399]">
                  <Lock className="w-4 h-4" />
                </div>
                <StatusBadge size="sm" status={hasVps ? "online" : "neutral"} label={hasVps ? "TCP 2088" : "—"} />
              </div>
              <h4 className="text-xs font-bold text-[#ECFDF5]">Shadowsocks-2022</h4>
              <p className="text-[11px] text-[#A7F3D0]/70 mt-0.5">2022-blake3-aes-128</p>
              <div className="mt-3 pt-2 border-t border-[rgba(74,222,128,0.1)] flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#6EE7B7]">Резервный шифр</span>
                <span className={`font-bold ${hasVps ? "text-[#4ADE80]" : "text-zinc-500"}`}>
                  {hasVps && ssLatency ? `~${ssLatency} мс` : "0 мс"}
                </span>
              </div>
            </div>
          </div>
        </BentoCard>
      </BentoGrid>
    </div>
  );
};
