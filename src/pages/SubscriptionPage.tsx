import React, { useState, useEffect } from "react";
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
  QrCode,
  Search,
  CheckCircle2,
} from "lucide-react";
import QRCode from "qrcode";
import { BentoGrid, BentoCard, GlassButton, StatusBadge } from "../components/bento";
import { useAppStore } from "../store";

export const SubscriptionPage: React.FC = () => {
  const { report, smartRoutes, regenerateToken, vpsConfig } = useAppStore();
  const [copied, setCopied] = useState(false);
  const [activeCategory, setActiveCategory] = useState<"ru_direct" | "vpn_tunnel" | "blocked">("ru_direct");
  const [tokenRegenerating, setTokenRegenerating] = useState(false);
  const [tokenFeedback, setTokenFeedback] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  const subUrl =
    report?.subscription_url ||
    `https://${vpsConfig.host || "89.125.126.90"}:18080/sub/9f8a3c2e1b4d5e6f7a8b9c0d1e2f3a4b`;

  // Generate QR Code data URL whenever subUrl changes
  useEffect(() => {
    let isMounted = true;
    const generateQr = async () => {
      try {
        const url = await QRCode.toDataURL(subUrl, {
          width: 280,
          margin: 2,
          color: {
            dark: "#06100C",
            light: "#ECFDF5",
          },
        });
        if (isMounted) {
          setQrDataUrl(url);
        }
      } catch (err) {
        console.warn("QR code generation error:", err);
      }
    };

    generateQr();
    return () => {
      isMounted = false;
    };
  }, [subUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(subUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Failed to copy link:", err);
    }
  };

  const handleRegenerateToken = async () => {
    setTokenRegenerating(true);
    setTokenFeedback(null);
    try {
      const newToken = await regenerateToken();
      setTokenFeedback(`Новый токен (${newToken.substring(0, 8)}...) успешно активирован и сохранен в Vault!`);
      setTimeout(() => setTokenFeedback(null), 3500);
    } catch (err) {
      console.warn("Failed to regenerate token:", err);
    } finally {
      setTokenRegenerating(false);
    }
  };

  const currentRoute = smartRoutes.find((r) => r.category === activeCategory);
  const filteredDomains = (currentRoute?.domains || []).filter((d) =>
    d.toLowerCase().includes(searchFilter.trim().toLowerCase())
  );

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Page Header */}
      <div className="px-4 sm:px-6 pt-4">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#ECFDF5] font-sans">
          Подписка и правила маршрутизации
        </h1>
        <p className="text-xs text-[#A7F3D0]/70 mt-0.5">
          Единый профиль синхронизации для клиентов, генерация QR-кода и правила разделения трафика Smart Routing
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
                <span className="text-[10px] text-[#A7F3D0]/60 uppercase block">Токен доступа</span>
                <span className="text-xs font-mono text-[#ECFDF5] truncate block">
                  {report?.subscription_token ? `${report.subscription_token.substring(0, 16)}...` : "9f8a3c2e1b4d..."}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.12)]">
                <span className="text-[10px] text-[#A7F3D0]/60 uppercase block">Формат выдачи</span>
                <span className="text-xs font-mono text-[#4ADE80]">Base64 + JSON</span>
              </div>
            </div>

            {tokenFeedback && (
              <div className="p-2.5 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 text-xs text-[#4ADE80] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{tokenFeedback}</span>
              </div>
            )}

            {/* Action Buttons: Strictly whitespace-nowrap */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2">
              <GlassButton
                variant="primary"
                size="md"
                onClick={handleCopy}
                icon={copied ? <Check className="w-4 h-4 text-[#06100C]" /> : <Copy className="w-4 h-4" />}
                className="flex-1 whitespace-nowrap"
              >
                {copied ? "Ссылка скопирована!" : "Копировать ссылку для Happ"}
              </GlassButton>

              <GlassButton
                variant="secondary"
                size="md"
                onClick={() => setShowQr(!showQr)}
                icon={<QrCode className="w-4 h-4 text-[#4ADE80]" />}
                className="whitespace-nowrap"
              >
                {showQr ? "Скрыть QR-код" : "Показать QR-код"}
              </GlassButton>

              <GlassButton
                variant="secondary"
                size="md"
                onClick={handleRegenerateToken}
                loading={tokenRegenerating}
                icon={<RefreshCw className={`w-4 h-4 text-[#4ADE80] ${tokenRegenerating ? "animate-spin" : ""}`} />}
                className="whitespace-nowrap"
              >
                Перегенерировать токен
              </GlassButton>
            </div>

            {/* Expandable Mobile QR-Code View */}
            {showQr && (
              <div className="mt-3 p-4 rounded-2xl bg-[rgba(8,20,15,0.9)] border border-[rgba(74,222,128,0.3)] flex flex-col items-center justify-center animate-fadeIn text-center">
                <span className="text-xs font-semibold text-[#ECFDF5] mb-1">
                  Сканирование для мобильных устройств
                </span>
                <p className="text-[11px] text-[#A7F3D0]/70 mb-3 max-w-xs">
                  Откройте Happ, v2rayNG или Streisand на телефоне и отсканируйте код для мгновенного добавления 5 протоколов:
                </p>

                {qrDataUrl ? (
                  <div className="p-3 bg-white rounded-2xl shadow-[0_0_24px_rgba(74,222,128,0.3)]">
                    <img
                      src={qrDataUrl}
                      alt="Votex Subscription QR"
                      className="w-48 h-48 block"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-xs text-[#A7F3D0]/60">
                    Генерация QR-кода...
                  </div>
                )}

                <div className="mt-3 text-[10px] font-mono text-[#6EE7B7]">
                  Совместимо с iOS (Happ) и Android (Happ / v2rayNG)
                </div>
              </div>
            )}
          </div>
        </BentoCard>

        {/* Module 2: TLS Fragmentation Module (Col 6) */}
        <BentoCard
          colSpan={6}
          glow
          icon={<Split className="w-4 h-4 text-[#4ADE80]" />}
          title="TLS-фрагментация пакетов (ClientHello)"
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

            {/* Visual Diagram of Fragmentation Flow */}
            <div className="p-3 rounded-xl bg-[rgba(8,20,15,0.65)] border border-[rgba(74,222,128,0.14)] space-y-2">
              <span className="text-[10px] font-semibold text-[#A7F3D0]/70 uppercase block">
                Схема обхода ТСПУ:
              </span>
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#ECFDF5]">
                <span className="px-2 py-1 rounded bg-[rgba(15,34,26,0.9)] border border-[rgba(74,222,128,0.2)]">
                  TLS ClientHello (512 B)
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-[#4ADE80] shrink-0" />
                <span className="px-2 py-1 rounded bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#4ADE80]">
                  Frag #1 (120 B)
                </span>
                <span className="px-2 py-1 rounded bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#4ADE80]">
                  Frag #2 (180 B)
                </span>
                <span className="px-2 py-1 rounded bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#4ADE80]">
                  Frag #3 (212 B)
                </span>
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
          {/* Header & Category Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-2">
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
                <span>DIRECT: Прямой доступ (РФ)</span>
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
                <span>PROXY: Защищенный туннель (VPN)</span>
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
                <span>BLOCK: Блокировка (Реклама и торренты)</span>
              </button>
            </div>

            {/* Domain Filter Input */}
            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#A7F3D0]/60 pointer-events-none" />
              <input
                type="text"
                placeholder="Поиск правил доменов..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.18)] text-xs text-[#ECFDF5] placeholder-[#A7F3D0]/40 focus:outline-none focus:border-[#4ADE80]"
              />
            </div>
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
                  {filteredDomains.length} из {currentRoute.domains.length} правил
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1 max-h-48 overflow-y-auto">
                {filteredDomains.length === 0 ? (
                  <span className="text-xs text-[#A7F3D0]/50 py-2">
                    Ничего не найдено по фильтру «{searchFilter}»
                  </span>
                ) : (
                  filteredDomains.map((domain, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono bg-[rgba(15,34,26,0.8)] text-[#A7F3D0] border border-[rgba(74,222,128,0.15)] shadow-sm hover:border-[#4ADE80] transition-colors"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />
                      {domain}
                    </span>
                  ))
                )}
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
