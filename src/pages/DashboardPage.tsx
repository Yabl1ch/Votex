import React, { useState } from "react";
import {
  Server,
  Globe,
  Copy,
  Check,
  Shield,
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
} from "lucide-react";
import { BentoGrid, BentoCard, GlassButton, StatusBadge } from "../components/bento";
import { useAppStore } from "../store";

export const DashboardPage: React.FC = () => {
  const { report, isConnected, latency, setActiveTab } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const subUrl =
    report?.subscription_url ||
    "https://89.125.126.90:18080/sub/9f8a3c2e1b4d5e6f7a8b9c0d1e2f3a4b";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(subUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 pt-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#ECFDF5] font-sans">
            Панель управления сервером
          </h1>
          <p className="text-xs text-[#A7F3D0]/70 mt-0.5">
            Оперативный мониторинг антицензурного узла и быстрая синхронизация клиентов
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <GlassButton
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            loading={isRefreshing}
            icon={<RefreshCw className="w-3.5 h-3.5 text-[#4ADE80]" />}
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
          icon={<Server className="w-4 h-4 text-[#4ADE80]" />}
          title="Состояние VPS узла"
          subtitle="Персональный выделенный сервер Votex"
          badge={
            <StatusBadge
              status={isConnected ? "protected" : "offline"}
              label={isConnected ? "Сервер защищен и активен" : "Отключен"}
            />
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-2">
            <div className="p-3 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.14)]">
              <span className="text-[10px] text-[#A7F3D0]/60 uppercase font-semibold flex items-center gap-1 mb-1">
                <Globe className="w-3 h-3 text-[#4ADE80]" /> IP Адрес
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-[#ECFDF5] truncate block">
                {report?.server_ip || "89.125.126.90"}
              </span>
              <span className="text-[10px] text-[#6EE7B7] truncate block mt-0.5">
                Амстердам, NL
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.14)]">
              <span className="text-[10px] text-[#A7F3D0]/60 uppercase font-semibold flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3 text-[#4ADE80]" /> Uptime
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-[#ECFDF5] truncate block">
                14д 6ч 22м
              </span>
              <span className="text-[10px] text-[#6EE7B7] truncate block mt-0.5">
                Без перезагрузок
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.14)]">
              <span className="text-[10px] text-[#A7F3D0]/60 uppercase font-semibold flex items-center gap-1 mb-1">
                <Activity className="w-3 h-3 text-[#4ADE80]" /> Пинг (TCP)
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-[#ECFDF5] truncate block">
                {latency ?? 28} мс
              </span>
              <span className="text-[10px] text-[#4ADE80] truncate block mt-0.5">
                0% потерь пакетов
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.14)]">
              <span className="text-[10px] text-[#A7F3D0]/60 uppercase font-semibold flex items-center gap-1 mb-1">
                <Cpu className="w-3 h-3 text-[#4ADE80]" /> Нагрузка ЦП
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-[#ECFDF5] truncate block">
                3.2% / 1.8 ГБ
              </span>
              <span className="text-[10px] text-[#6EE7B7] truncate block mt-0.5">
                ОЗУ: 24% свободно
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[rgba(74,222,128,0.1)] flex items-center justify-between text-xs text-[#A7F3D0]/80">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#4ADE80]" />
              Защита ядра Linux: TCP BBR + Fail2ban + UFW Firewall активны
            </span>
            <button
              type="button"
              onClick={() => setActiveTab("security")}
              className="text-[#4ADE80] hover:underline font-medium cursor-pointer"
            >
              Подробнее о защите
            </button>
          </div>
        </BentoCard>

        {/* Module 2: Quick Copy Subscription (Col 5) */}
        <BentoCard
          colSpan={5}
          glow
          icon={<ExternalLink className="w-4 h-4 text-[#4ADE80]" />}
          title="Ссылка подписки"
          subtitle="Формат Base64 + Sing-Box JSON"
          badge={
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#22C55E]/15 text-[#4ADE80] border border-[#22C55E]/30 font-mono">
              Happ / v2rayN
            </span>
          }
        >
          <div className="space-y-3 my-1">
            <p className="text-xs text-[#A7F3D0]/80 leading-relaxed">
              Персональный URL для автоматического импорта 5 настроенных протоколов в мобильный или десктопный клиент.
            </p>

            <div className="p-3 rounded-xl bg-[rgba(8,20,15,0.85)] border border-[rgba(74,222,128,0.2)] flex items-center gap-2">
              <div className="truncate font-mono text-xs text-[#4ADE80] select-all flex-1">
                {subUrl}
              </div>
            </div>

            <div className="pt-2">
              <GlassButton
                variant="primary"
                size="md"
                onClick={handleCopyLink}
                icon={copied ? <Check className="w-4 h-4 text-[#06100C]" /> : <Copy className="w-4 h-4" />}
                className="w-full whitespace-nowrap"
              >
                {copied ? "Ссылка скопирована в буфер!" : "Копировать ссылку для Happ"}
              </GlassButton>
            </div>
          </div>
        </BentoCard>

        {/* Module 3: Protocol Quick Matrix (Col 12) */}
        <BentoCard
          colSpan={12}
          title="Матрица активных протоколов обхода блокировок"
          subtitle="Все 5 независимых инстансов запущены и слушают защищенные порты"
          icon={<Layers className="w-4 h-4 text-[#4ADE80]" />}
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
                <StatusBadge size="sm" status="online" label="TCP 20443" />
              </div>
              <h4 className="text-xs font-bold text-[#ECFDF5]">VLESS Reality</h4>
              <p className="text-[11px] text-[#A7F3D0]/70 mt-0.5">Vision TLS-маскировка</p>
              <div className="mt-3 pt-2 border-t border-[rgba(74,222,128,0.1)] flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#6EE7B7]">SNI: yahoo.com</span>
                <span className="text-[#4ADE80] font-bold">~34 мс</span>
              </div>
            </div>

            {/* Protocol 2: SplitHTTP */}
            <div className="p-3.5 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.18)] hover:border-[rgba(74,222,128,0.4)] transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-[#4ADE80]/15 text-[#86EFAC]">
                  <Radio className="w-4 h-4" />
                </div>
                <StatusBadge size="sm" status="online" label="TCP 2053" />
              </div>
              <h4 className="text-xs font-bold text-[#ECFDF5]">SplitHTTP (xhttp)</h4>
              <p className="text-[11px] text-[#A7F3D0]/70 mt-0.5">Обход белых списков</p>
              <div className="mt-3 pt-2 border-t border-[rgba(74,222,128,0.1)] flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#6EE7B7]">MIME Stream</span>
                <span className="text-[#4ADE80] font-bold">~52 мс</span>
              </div>
            </div>

            {/* Protocol 3: gRPC Multi */}
            <div className="p-3.5 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.18)] hover:border-[rgba(74,222,128,0.4)] transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-[#6EE7B7]/15 text-[#4ADE80]">
                  <Layers className="w-4 h-4" />
                </div>
                <StatusBadge size="sm" status="online" label="TCP 8443" />
              </div>
              <h4 className="text-xs font-bold text-[#ECFDF5]">gRPC Multi-Stream</h4>
              <p className="text-[11px] text-[#A7F3D0]/70 mt-0.5">Мультиплексный туннель</p>
              <div className="mt-3 pt-2 border-t border-[rgba(74,222,128,0.1)] flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#6EE7B7]">gun multiplex</span>
                <span className="text-[#4ADE80] font-bold">~38 мс</span>
              </div>
            </div>

            {/* Protocol 4: Hysteria 2 */}
            <div className="p-3.5 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.18)] hover:border-[rgba(74,222,128,0.4)] transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-[#22C55E]/15 text-[#4ADE80]">
                  <Flame className="w-4 h-4" />
                </div>
                <StatusBadge size="sm" status="online" label="UDP 2083" />
              </div>
              <h4 className="text-xs font-bold text-[#ECFDF5]">Hysteria 2 (QUIC)</h4>
              <p className="text-[11px] text-[#A7F3D0]/70 mt-0.5">Низкий пинг для игр</p>
              <div className="mt-3 pt-2 border-t border-[rgba(74,222,128,0.1)] flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#6EE7B7]">Brutal Congestion</span>
                <span className="text-[#4ADE80] font-bold">~28 мс</span>
              </div>
            </div>

            {/* Protocol 5: Shadowsocks-2022 */}
            <div className="p-3.5 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.18)] hover:border-[rgba(74,222,128,0.4)] transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-[#86EFAC]/15 text-[#34D399]">
                  <Lock className="w-4 h-4" />
                </div>
                <StatusBadge size="sm" status="online" label="TCP 2088" />
              </div>
              <h4 className="text-xs font-bold text-[#ECFDF5]">Shadowsocks-2022</h4>
              <p className="text-[11px] text-[#A7F3D0]/70 mt-0.5">2022-blake3-aes-128</p>
              <div className="mt-3 pt-2 border-t border-[rgba(74,222,128,0.1)] flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#6EE7B7]">Резервный шифр</span>
                <span className="text-[#4ADE80] font-bold">~36 мс</span>
              </div>
            </div>
          </div>
        </BentoCard>
      </BentoGrid>
    </div>
  );
};
