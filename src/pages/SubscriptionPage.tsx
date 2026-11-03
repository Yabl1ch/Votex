import React, { useState } from "react";
import {
  Globe,
  Copy,
  Check,
  RefreshCw,
  Split,
  Shield,
  Layers,
  ArrowRight,
  Ban,
  Radio,
} from "lucide-react";
import { BentoGrid, BentoCard, GlassButton, StatusBadge } from "../components/bento";
import { useAppStore } from "../store";

export const SubscriptionPage: React.FC = () => {
  const { report, smartRoutes } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [activeCategory, setActiveCategory] = useState<"ru_direct" | "vpn_tunnel" | "blocked">("ru_direct");
  const [tokenRegenerated, setTokenRegenerated] = useState(false);

  const subUrl =
    report?.subscription_url ||
    "https://89.125.126.90:18080/sub/9f8a3c2e1b4d5e6f7a8b9c0d1e2f3a4b";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(subUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleRegenerateToken = () => {
    setTokenRegenerated(true);
    setTimeout(() => {
      setTokenRegenerated(false);
    }, 2000);
  };

  const currentRoute = smartRoutes.find((r) => r.category === activeCategory);

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Page Header */}
      <div className="px-4 sm:px-6 pt-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#ECFDF5] font-sans">
          Подписка и правила маршрутизации
        </h1>
        <p className="text-xs text-[#A7F3D0]/70 mt-0.5">
          Единый профиль синхронизации для клиентов и правила разделения трафика Smart Routing
        </p>
      </div>

      <BentoGrid cols={12}>
        {/* Module 1: Full Subscription Details (Col 6) */}
        <BentoCard
          colSpan={6}
          glow
          icon={<Globe className="w-4 h-4 text-[#4ADE80]" />}
          title="Параметры подписки"
          subtitle="Совместимо с Happ, v2rayN, sing-box и Nekobox"
          badge={
            <StatusBadge
              status="active"
              label="Токен валиден"
            />
          }
        >
          <div className="space-y-3.5 my-2">
            <div>
              <span className="text-[10px] text-[#A7F3D0]/70 uppercase font-semibold block mb-1">
                Полный URL подписки:
              </span>
              <div className="p-3 rounded-xl bg-[rgba(8,20,15,0.85)] border border-[rgba(74,222,128,0.2)] font-mono text-xs text-[#4ADE80] break-all select-all">
                {subUrl}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.12)]">
                <span className="text-[10px] text-[#A7F3D0]/60 uppercase block">Дата создания</span>
                <span className="text-xs font-mono text-[#ECFDF5]">Сегодня, 14:20</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.12)]">
                <span className="text-[10px] text-[#A7F3D0]/60 uppercase block">Формат выдачи</span>
                <span className="text-xs font-mono text-[#4ADE80]">Base64 + JSON</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2">
              <GlassButton
                variant="primary"
                size="md"
                onClick={handleCopy}
                icon={copied ? <Check className="w-4 h-4 text-[#06100C]" /> : <Copy className="w-4 h-4" />}
                className="flex-1 whitespace-nowrap"
              >
                {copied ? "Скопировано!" : "Копировать ссылку для Happ"}
              </GlassButton>

              <GlassButton
                variant="secondary"
                size="md"
                onClick={handleRegenerateToken}
                icon={<RefreshCw className="w-4 h-4 text-[#4ADE80]" />}
                className="whitespace-nowrap"
              >
                {tokenRegenerated ? "Токен обновлен" : "Перегенерировать токен"}
              </GlassButton>
            </div>
          </div>
        </BentoCard>

        {/* Module 2: TLS Fragmentation Module (Col 6) */}
        <BentoCard
          colSpan={6}
          glow
          icon={<Split className="w-4 h-4 text-[#4ADE80]" />}
          title="TLS-фрагментация пакетов"
          subtitle="Защита от глубокого анализа пакетов (DPI)"
          badge={
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#22C55E]/15 text-[#4ADE80] border border-[#22C55E]/30">
              Active ON
            </span>
          }
        >
          <div className="space-y-3 my-1">
            <p className="text-xs text-[#A7F3D0]/80 leading-relaxed">
              Votex автоматически делит ClientHello рукопожатия TLS на микросегменты. ТСПУ видит лишь разрозненные байты и не может распознать SNI или заблокировать сессию.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.16)]">
                <span className="text-[10px] text-[#A7F3D0]/60 uppercase block mb-1">Срез пакетов</span>
                <span className="text-sm font-mono font-bold text-[#4ADE80]">packets: 1-3</span>
                <span className="text-[10px] text-[#6EE7B7] block mt-0.5">Первые 3 фрагмента</span>
              </div>
              <div className="p-3 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.16)]">
                <span className="text-[10px] text-[#A7F3D0]/60 uppercase block mb-1">Длина фрагментов</span>
                <span className="text-sm font-mono font-bold text-[#4ADE80]">length: 100-200</span>
                <span className="text-[10px] text-[#6EE7B7] block mt-0.5">Случайный размер</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[rgba(15,34,26,0.6)] border border-[rgba(74,222,128,0.12)] text-xs text-[#A7F3D0]/80 flex items-center justify-between">
              <span>Совместимость с протоколами:</span>
              <span className="font-mono text-[#4ADE80]">Reality + SplitHTTP</span>
            </div>
          </div>
        </BentoCard>

        {/* Module 3: Routing Visualizer Module (Col 12) */}
        <BentoCard
          colSpan={12}
          title="Интерактивная карта умной маршрутизации (Smart Routing)"
          subtitle="Разделение потоков: российские ресурсы открываются напрямую, заблокированные сервисы идут в туннель"
          icon={<Radio className="w-4 h-4 text-[#4ADE80]" />}
        >
          {/* Navigation Category Tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => setActiveCategory("ru_direct")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeCategory === "ru_direct"
                  ? "bg-gradient-to-r from-[#22C55E] to-[#4ADE80] text-[#06100C] shadow-[0_4px_16px_rgba(74,222,128,0.3)]"
                  : "bg-[rgba(15,34,26,0.6)] text-[#A7F3D0] hover:bg-[rgba(22,49,38,0.8)] border border-[rgba(74,222,128,0.18)]"
              }`}
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Прямой доступ (РФ)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("vpn_tunnel")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeCategory === "vpn_tunnel"
                  ? "bg-gradient-to-r from-[#22C55E] to-[#4ADE80] text-[#06100C] shadow-[0_4px_16px_rgba(74,222,128,0.3)]"
                  : "bg-[rgba(15,34,26,0.6)] text-[#A7F3D0] hover:bg-[rgba(22,49,38,0.8)] border border-[rgba(74,222,128,0.18)]"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Защищенный туннель (VPN)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory("blocked")}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeCategory === "blocked"
                  ? "bg-gradient-to-r from-[#22C55E] to-[#4ADE80] text-[#06100C] shadow-[0_4px_16px_rgba(74,222,128,0.3)]"
                  : "bg-[rgba(15,34,26,0.6)] text-[#A7F3D0] hover:bg-[rgba(22,49,38,0.8)] border border-[rgba(74,222,128,0.18)]"
              }`}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Блокировка (Реклама и трекеры)</span>
            </button>
          </div>

          {/* Active Category Domain Rules */}
          {currentRoute && (
            <div className="p-4 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.16)] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#ECFDF5]">{currentRoute.title}</h4>
                  <p className="text-[11px] text-[#A7F3D0]/70 mt-0.5">{currentRoute.description}</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[rgba(15,34,26,0.8)] border border-[rgba(74,222,128,0.2)] text-[#4ADE80]">
                  {currentRoute.domains.length} правил
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {currentRoute.domains.map((domain, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-[rgba(15,34,26,0.8)] text-[#A7F3D0] border border-[rgba(74,222,128,0.15)] shadow-sm"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />
                    {domain}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Supported Client Badges */}
          <div className="mt-4 pt-3 border-t border-[rgba(74,222,128,0.12)] flex flex-wrap items-center justify-between gap-3 text-xs text-[#A7F3D0]/80">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#4ADE80]" />
              Поддерживаемые клиентские приложения:
            </span>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[rgba(15,34,26,0.8)] border border-[rgba(74,222,128,0.2)] text-[#ECFDF5] font-mono text-[11px]">Happ (iOS/Android)</span>
              <span className="px-2 py-0.5 rounded bg-[rgba(15,34,26,0.8)] border border-[rgba(74,222,128,0.2)] text-[#ECFDF5] font-mono text-[11px]">v2rayN (Windows)</span>
              <span className="px-2 py-0.5 rounded bg-[rgba(15,34,26,0.8)] border border-[rgba(74,222,128,0.2)] text-[#ECFDF5] font-mono text-[11px]">sing-box</span>
              <span className="px-2 py-0.5 rounded bg-[rgba(15,34,26,0.8)] border border-[rgba(74,222,128,0.2)] text-[#ECFDF5] font-mono text-[11px]">Nekobox</span>
            </div>
          </div>
        </BentoCard>
      </BentoGrid>
    </div>
  );
};
