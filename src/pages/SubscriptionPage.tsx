import React, { useState, useEffect } from "react";
import {
  Globe,
  Copy,
  Check,
  RefreshCw,
  QrCode,
  CheckCircle2,
  Smartphone,
  Plus,
  ShieldCheck,
  Radio,
  Layers,
  KeyRound,
} from "lucide-react";
import QRCode from "qrcode";
import { BentoGrid, BentoCard, GlassButton, StatusBadge } from "../components/bento";
import { useAppStore } from "../store";

export const SubscriptionPage: React.FC = () => {
  const { report, regenerateToken, rotateServerKeysAction, vpsConfig } = useAppStore();
  const [copiedLink, setCopiedLink] = useState(false);
  const [tokenRegenerating, setTokenRegenerating] = useState(false);
  const [keyRotating, setKeyRotating] = useState(false);
  const [tokenFeedback, setTokenFeedback] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwdInput, setPwdInput] = useState("");

  const subUrl = report?.subscription_url || "";
  const hasSub = Boolean(report && subUrl);

  // Generate QR Code data URL whenever subUrl changes
  useEffect(() => {
    let isMounted = true;
    if (!subUrl) {
      setQrDataUrl(null);
      return;
    }
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

  const handleCopyLink = async () => {
    if (!subUrl) return;
    try {
      await navigator.clipboard.writeText(subUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.warn("Failed to copy subscription link:", err);
    }
  };

  const handleRegenerateToken = async () => {
    if (!hasSub) return;
    setTokenRegenerating(true);
    setTokenFeedback(null);
    try {
      const newToken = await regenerateToken();
      if (newToken) {
        setTokenFeedback(`Новый токен (${newToken.substring(0, 8)}...) успешно активирован и сохранен в Vault!`);
        setTimeout(() => setTokenFeedback(null), 3500);
      }
    } catch (err) {
      console.warn("Failed to regenerate token:", err);
    } finally {
      setTokenRegenerating(false);
    }
  };

  const handleRotateKeys = async (overridePwd?: string) => {
    if (!hasSub) return;
    const pwd = overridePwd || vpsConfig.password || pwdInput;
    if (!pwd) {
      setShowPasswordModal(true);
      return;
    }

    setKeyRotating(true);
    setTokenFeedback(null);
    try {
      await rotateServerKeysAction(pwd);
      setShowPasswordModal(false);
      setTokenFeedback("Ключи Reality, Hysteria и токен подписки успешно перегенерированы на сервере!");
      setTimeout(() => setTokenFeedback(null), 4500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTokenFeedback(`Ошибка ротации: ${msg}`);
      setTimeout(() => setTokenFeedback(null), 5000);
    } finally {
      setKeyRotating(false);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Page Header - Perfectly Aligned with Bento Grid */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-5 md:px-6 pt-4 pb-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#ECFDF5] font-sans">
          Подписка и маршруты
        </h1>
        <p className="text-sm text-[#A7F3D0]/70 mt-1">
          Единый профиль синхронизации для клиентов, быстрый импорт по QR-коду и умное разделение трафика
        </p>
      </div>

      <BentoGrid cols={12}>
        {/* Module 1: Subscription Parameters (Col 7) */}
        <BentoCard
          colSpan={7}
          glow
          icon={<Globe className="w-5 h-5 text-[#4ADE80]" />}
          title="Параметры подписки"
          subtitle="Совместимо с Happ, v2rayN, sing-box и Nekobox"
          badge={
            <StatusBadge
              status={hasSub ? "active" : "offline"}
              label={hasSub ? "Токен валиден" : "Ожидание VPS"}
            />
          }
        >
          <div className="space-y-4 my-1">
            <div>
              <span className="text-xs text-[#A7F3D0]/70 uppercase font-semibold block mb-1.5">
                Полный URL ссылки подписки:
              </span>
              <div className="p-3.5 rounded-xl bg-[rgba(8,20,15,0.85)] border border-[rgba(74,222,128,0.2)] font-mono text-sm break-all select-all">
                {subUrl ? (
                  <span className="text-[#4ADE80]">{subUrl}</span>
                ) : (
                  <span className="text-[#A7F3D0]/40 italic">
                    Подписка отсутствует. Запустите установку во вкладке «Мастер установки».
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.12)]">
                <span className="text-xs text-[#A7F3D0]/60 uppercase block">Токен доступа</span>
                <span className="text-sm font-mono text-[#ECFDF5] truncate block mt-0.5">
                  {report?.subscription_token ? `${report.subscription_token.substring(0, 12)}...` : "—"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.12)]">
                <span className="text-xs text-[#A7F3D0]/60 uppercase block">SNI Маскировка</span>
                <span className="text-sm font-mono text-[#4ADE80] truncate block mt-0.5" title="Проверен TLS 1.3 и ALPN HTTP/2">
                  {report?.reality_sni || "addons.mozilla.org"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.12)]">
                <span className="text-xs text-[#A7F3D0]/60 uppercase block">Формат выдачи</span>
                <span className="text-sm font-mono text-[#4ADE80] block mt-0.5">Base64 + JSON</span>
              </div>
            </div>

            {tokenFeedback && (
              <div className="p-3 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 text-sm text-[#4ADE80] flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{tokenFeedback}</span>
              </div>
            )}

            {/* Action Buttons: Primary Full Width + Secondary Actions Grid */}
            <div className="space-y-2.5 pt-2">
              {/* Row 1: Primary Action Button (Full Width) */}
              <div>
                <GlassButton
                  variant="primary"
                  size="lg"
                  onClick={handleCopyLink}
                  disabled={!hasSub}
                  icon={copiedLink ? <Check className="w-5 h-5 text-[#06100C]" /> : <Copy className="w-5 h-5" />}
                  className="w-full whitespace-nowrap"
                >
                  {copiedLink
                    ? "Ссылка скопирована в буфер!"
                    : hasSub
                    ? "Копировать ссылку для Happ"
                    : "Ссылка недоступна (настройте сервер)"}
                </GlassButton>
                <span className="text-[11px] text-[#A7F3D0]/70 block mt-1 text-center">
                  Включает 5 протоколов обхода блокировок (Vision, SplitHTTP, gRPC, Hysteria 2, Shadowsocks-2022)
                </span>
              </div>

              {/* Row 2: Secondary Actions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <GlassButton
                  variant="secondary"
                  size="md"
                  onClick={() => setShowQr(!showQr)}
                  disabled={!hasSub}
                  icon={<QrCode className="w-4 h-4 text-[#4ADE80]" />}
                  className="w-full whitespace-nowrap text-xs"
                >
                  {showQr ? "Скрыть QR-код" : "QR-код для телефона"}
                </GlassButton>

                <GlassButton
                  variant="secondary"
                  size="md"
                  onClick={handleRegenerateToken}
                  disabled={!hasSub}
                  loading={tokenRegenerating}
                  icon={<RefreshCw className={`w-4 h-4 text-[#4ADE80] ${tokenRegenerating ? "animate-spin" : ""}`} />}
                  className="w-full whitespace-nowrap text-xs"
                >
                  Обновить токен
                </GlassButton>

                <GlassButton
                  variant="secondary"
                  size="md"
                  onClick={() => handleRotateKeys()}
                  disabled={!hasSub}
                  loading={keyRotating}
                  icon={<KeyRound className={`w-4 h-4 text-[#4ADE80] ${keyRotating ? "animate-spin" : ""}`} />}
                  className="w-full whitespace-nowrap text-xs"
                >
                  Ротация ключей
                </GlassButton>
              </div>

              {showPasswordModal && (
                <div className="p-3.5 rounded-xl bg-[rgba(8,20,15,0.9)] border border-[rgba(74,222,128,0.3)] space-y-2 mt-2">
                  <span className="text-xs text-[#A7F3D0] block">
                    Введите пароль root SSH для безопасного обновления ключей на сервере:
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={pwdInput}
                      onChange={(e) => setPwdInput(e.target.value)}
                      placeholder="Пароль SSH"
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-[rgba(6,16,12,0.8)] border border-[rgba(74,222,128,0.2)] text-[#ECFDF5] focus:outline-none focus:border-[#4ADE80]"
                    />
                    <GlassButton
                      variant="primary"
                      size="sm"
                      onClick={() => handleRotateKeys(pwdInput)}
                      className="whitespace-nowrap text-xs"
                    >
                      Подтвердить
                    </GlassButton>
                    <GlassButton
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPasswordModal(false)}
                      className="whitespace-nowrap text-xs"
                    >
                      Отмена
                    </GlassButton>
                  </div>
                </div>
              )}
            </div>

            {/* Expandable Mobile QR-Code View */}
            {showQr && (
              <div className="mt-3 p-5 rounded-2xl bg-[rgba(8,20,15,0.9)] border border-[rgba(74,222,128,0.3)] flex flex-col items-center justify-center animate-fadeIn text-center">
                <span className="text-sm font-semibold text-[#ECFDF5] mb-1">
                  Сканирование для мобильных устройств
                </span>
                <p className="text-xs text-[#A7F3D0]/70 mb-3 max-w-sm">
                  Откройте приложение Happ на телефоне и отсканируйте QR-код для добавления всех 5 протоколов:
                </p>

                {qrDataUrl ? (
                  <div className="p-3.5 bg-white rounded-2xl shadow-[0_0_24px_rgba(74,222,128,0.3)]">
                    <img
                      src={qrDataUrl}
                      alt="Votex Subscription QR"
                      className="w-52 h-52 block"
                    />
                  </div>
                ) : (
                  <div className="w-52 h-52 flex items-center justify-center text-sm text-[#A7F3D0]/60">
                    Генерация QR-кода...
                  </div>
                )}

                <div className="mt-3 text-xs font-mono text-[#6EE7B7]">
                  Профиль: Votex (5 протоколов: Vision, SplitHTTP, gRPC, Hysteria 2, Shadowsocks-2022)
                </div>
              </div>
            )}
          </div>
        </BentoCard>

        {/* Module 2: Simple User Guide - Connect in Happ in 1 minute (Col 5) */}
        <BentoCard
          colSpan={5}
          glow
          icon={<Smartphone className="w-5 h-5 text-[#4ADE80]" />}
          title="Как подключить в Happ за 1 минуту"
          subtitle="Пошаговая инструкция для смартфона или ПК"
        >
          <div className="space-y-4 my-1">
            {/* Step 1 */}
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.14)]">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#22C55E]/20 text-[#4ADE80] font-bold font-mono text-sm shrink-0 mt-0.5">
                1
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-[#ECFDF5] flex items-center gap-1.5">
                  <Copy className="w-4 h-4 text-[#4ADE80]" />
                  Скопируйте ссылку подписки
                </h4>
                <p className="text-xs text-[#A7F3D0]/70 mt-1 leading-relaxed">
                  Нажмите кнопку «Копировать ссылку для Happ» выше или покажите QR-код для камеры смартфона.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.14)]">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#22C55E]/20 text-[#4ADE80] font-bold font-mono text-sm shrink-0 mt-0.5">
                2
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-[#ECFDF5] flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-[#4ADE80]" />
                  Откройте приложение Happ
                </h4>
                <p className="text-xs text-[#A7F3D0]/70 mt-1 leading-relaxed">
                  Запустите бесплатный клиент Happ на телефоне (App Store / Google Play) или на компьютере.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.14)]">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#22C55E]/20 text-[#4ADE80] font-bold font-mono text-sm shrink-0 mt-0.5">
                3
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-[#ECFDF5] flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-[#4ADE80]" />
                  Нажмите «+» и вставьте ссылку
                </h4>
                <p className="text-xs text-[#A7F3D0]/70 mt-1 leading-relaxed">
                  В правом верхнем углу нажмите значок «+» и выберите «Импорт из буфера». Все 5 протоколов будут мгновенно добавлены в клиент.
                </p>
              </div>
            </div>

            {/* Supported Client Badges */}
            <div className="pt-2 border-t border-[rgba(74,222,128,0.12)] flex flex-wrap items-center justify-between gap-2 text-xs text-[#A7F3D0]/80">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#4ADE80]" />
                Клиенты:
              </span>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded bg-[rgba(15,34,26,0.8)] border border-[rgba(74,222,128,0.2)] text-[#ECFDF5] font-mono text-xs">Happ</span>
                <span className="px-2 py-0.5 rounded bg-[rgba(15,34,26,0.8)] border border-[rgba(74,222,128,0.2)] text-[#ECFDF5] font-mono text-xs">v2rayN</span>
                <span className="px-2 py-0.5 rounded bg-[rgba(15,34,26,0.8)] border border-[rgba(74,222,128,0.2)] text-[#ECFDF5] font-mono text-xs">sing-box</span>
              </div>
            </div>
          </div>
        </BentoCard>

        {/* Module 3: Status Badge - Russian Direct Routing (Col 6) */}
        <BentoCard
          colSpan={6}
          icon={<ShieldCheck className="w-5 h-5 text-[#4ADE80]" />}
          title={hasSub ? "Маршрутизация РФ: Активна" : "Маршрутизация РФ: Не настроена"}
          subtitle="Банки, Госуслуги и российские сервисы работают напрямую"
          badge={
            <StatusBadge
              status={hasSub ? "online" : "neutral"}
              label={hasSub ? "Direct Bypass" : "Ожидание настройки"}
            />
          }
        >
          <div className="space-y-3 text-sm text-[#A7F3D0]/85">
            <p className="leading-relaxed">
              В подписку зашиты правила прямого доступа (DIRECT): Сбербанк, Т-Банк, Госуслуги, Яндекс, VK и любые сайты в доменных зонах .ru и .su открываются без задержки через вашего местного провайдера.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-[rgba(15,34,26,0.8)] border border-[rgba(74,222,128,0.2)] text-[#4ADE80]">*.gosuslugi.ru</span>
              <span className="px-2.5 py-1 rounded-lg bg-[rgba(15,34,26,0.8)] border border-[rgba(74,222,128,0.2)] text-[#4ADE80]">*.sberbank.ru</span>
              <span className="px-2.5 py-1 rounded-lg bg-[rgba(15,34,26,0.8)] border border-[rgba(74,222,128,0.2)] text-[#4ADE80]">*.tbank.ru</span>
              <span className="px-2.5 py-1 rounded-lg bg-[rgba(15,34,26,0.8)] border border-[rgba(74,222,128,0.2)] text-[#4ADE80]">*.yandex.ru</span>
              <span className="px-2.5 py-1 rounded-lg bg-[rgba(15,34,26,0.8)] border border-[rgba(74,222,128,0.2)] text-[#4ADE80]">*.ru / *.su</span>
            </div>
          </div>
        </BentoCard>

        {/* Module 4: Status Badge - Anti-Censorship & DPI Protection (Col 6) */}
        <BentoCard
          colSpan={6}
          icon={<Radio className="w-5 h-5 text-[#4ADE80]" />}
          title={hasSub ? "Защита от блокировок: Включена" : "Защита от блокировок: Не активна"}
          subtitle="Автоматический обход ТСПУ и DPI фильтрации"
          badge={
            <StatusBadge
              status={hasSub ? "protected" : "neutral"}
              label={hasSub ? "Anti-DPI Active" : "Ожидание настройки"}
            />
          }
        >
          <div className="space-y-3 text-sm text-[#A7F3D0]/85">
            <p className="leading-relaxed">
              YouTube, Discord, зарубежные сервисы и нейросети (ChatGPT, Claude, Gemini) автоматически направляются в персональный туннель Votex с маскировкой TLS 1.3 Reality и устойчивостью к глушению.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-[rgba(15,34,26,0.8)] border border-[rgba(74,222,128,0.2)] text-[#4ADE80]">*.youtube.com</span>
              <span className="px-2.5 py-1 rounded-lg bg-[rgba(15,34,26,0.8)] border border-[rgba(74,222,128,0.2)] text-[#4ADE80]">*.discord.com</span>
              <span className="px-2.5 py-1 rounded-lg bg-[rgba(15,34,26,0.8)] border border-[rgba(74,222,128,0.2)] text-[#4ADE80]">*.chatgpt.com</span>
              <span className="px-2.5 py-1 rounded-lg bg-[rgba(15,34,26,0.8)] border border-[rgba(74,222,128,0.2)] text-[#4ADE80]">*.claude.ai</span>
            </div>
          </div>
        </BentoCard>
      </BentoGrid>
    </div>
  );
};
