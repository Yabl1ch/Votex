import React, { useState, useEffect } from "react";
import {
  Settings,
  Sliders,
  Shield,
  Trash2,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Lock,
  Globe,
  Clock,
  Key,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
} from "lucide-react";
import { BentoGrid, BentoCard, GlassButton, StatusBadge } from "../components/bento";
import { useAppStore } from "../store";
import type { VaultRecord } from "../types";

export interface UpdateDetails {
  hasUpdate: boolean;
  version: string;
  remoteDate: string;
  localDate: string;
  downloadUrl?: string;
  releaseUrl?: string;
  message: string;
}

export const SettingsPage: React.FC = () => {
  const {
    uiScale,
    setUiScale,
    sshTimeout,
    setSshTimeout,
    autoSaveVault,
    setAutoSaveVault,
    loadSavedVpsFromVault,
    clearSavedVps,
  } = useAppStore();

  const [savedVaultRecord, setSavedVaultRecord] = useState<VaultRecord | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState<boolean>(false);
  const [updateDetails, setUpdateDetails] = useState<UpdateDetails | null>(null);
  const [vaultCleared, setVaultCleared] = useState<boolean>(false);
  const [loadingVault, setLoadingVault] = useState<boolean>(false);

  // Load vault record on page mount
  useEffect(() => {
    let isMounted = true;
    const fetchVault = async () => {
      setLoadingVault(true);
      try {
        const record = await loadSavedVpsFromVault();
        if (isMounted) {
          setSavedVaultRecord(record);
        }
      } catch (err) {
        console.warn("Error loading vault record:", err);
      } finally {
        if (isMounted) {
          setLoadingVault(false);
        }
      }
    };

    fetchVault();
    return () => {
      isMounted = false;
    };
  }, [loadSavedVpsFromVault]);

  const formatDate = (isoString?: string): string => {
    if (!isoString) return "Неизвестно";
    try {
      const d = new Date(isoString);
      return d.toLocaleString("ru-RU", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateDetails(null);

    const localTimeStr = typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : new Date().toISOString();
    const localTime = new Date(localTimeStr).getTime();
    const localDateFormatted = formatDate(localTimeStr);

    try {
      // 1. Try GitHub Releases API first
      let remoteAssetDateStr: string | null = null;
      let remoteVersion = "1.0.0";
      let downloadUrl = "https://github.com/Yabl1ch/Votex/releases/latest/download/votex.exe";
      let releaseUrl = "https://github.com/Yabl1ch/Votex/releases/latest";

      try {
        const resp = await fetch("https://api.github.com/repos/Yabl1ch/Votex/releases/latest", {
          headers: { Accept: "application/vnd.github.v3+json" },
        });

        if (resp.ok) {
          const data = await resp.json();
          remoteVersion = data.tag_name || "1.0.0";
          releaseUrl = data.html_url || releaseUrl;

          // Find votex.exe asset to check its actual upload timestamp
          const exeAsset = Array.isArray(data.assets)
            ? data.assets.find((a: any) => a.name?.toLowerCase().endsWith(".exe"))
            : null;

          if (exeAsset) {
            remoteAssetDateStr = exeAsset.updated_at || exeAsset.created_at || data.published_at;
            downloadUrl = exeAsset.browser_download_url || downloadUrl;
          } else {
            remoteAssetDateStr = data.published_at;
          }
        }
      } catch (apiErr) {
        console.warn("GitHub API check failed, trying raw version.json fallback:", apiErr);
      }

      // 2. Fallback to raw githubusercontent if API was rate-limited
      if (!remoteAssetDateStr) {
        try {
          const rawResp = await fetch("https://raw.githubusercontent.com/Yabl1ch/Votex/main/version.json", {
            cache: "no-store",
          });
          if (rawResp.ok) {
            const rawData = await rawResp.json();
            remoteVersion = rawData.version || remoteVersion;
            remoteAssetDateStr = rawData.build_time;
            downloadUrl = rawData.download_url || downloadUrl;
            releaseUrl = rawData.release_url || releaseUrl;
          }
        } catch (rawErr) {
          console.warn("Raw fallback check error:", rawErr);
        }
      }

      if (remoteAssetDateStr) {
        const remoteTime = new Date(remoteAssetDateStr).getTime();
        const remoteDateFormatted = formatDate(remoteAssetDateStr);

        // If remote asset is newer than local build by more than 60 seconds
        const hasUpdate = remoteTime - localTime > 60 * 1000;

        if (hasUpdate) {
          setUpdateDetails({
            hasUpdate: true,
            version: remoteVersion,
            remoteDate: remoteDateFormatted,
            localDate: localDateFormatted,
            downloadUrl,
            releaseUrl,
            message: `Доступна новая сборка! Бинарный файл на GitHub обновлен: ${remoteDateFormatted}`,
          });
        } else {
          setUpdateDetails({
            hasUpdate: false,
            version: remoteVersion,
            remoteDate: remoteDateFormatted,
            localDate: localDateFormatted,
            downloadUrl,
            releaseUrl,
            message: `У вас установлена последняя сборка (от ${localDateFormatted}). Дата релиза на GitHub: ${remoteDateFormatted}.`,
          });
        }
      } else {
        // Pure offline fallback
        setUpdateDetails({
          hasUpdate: false,
          version: typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "1.0.0",
          remoteDate: "Недоступно (оффлайн)",
          localDate: localDateFormatted,
          downloadUrl,
          releaseUrl,
          message: `Текущая установленная сборка: ${localDateFormatted}. Сетевое подключение к GitHub временно недоступно.`,
        });
      }
    } catch (err) {
      console.warn("Update check total failure:", err);
      setUpdateDetails({
        hasUpdate: false,
        version: "1.0.0",
        remoteDate: "Ошибка сети",
        localDate: localDateFormatted,
        message: "Не удалось соединиться с сервером обновлений GitHub. Проверьте подключение к сети.",
      });
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleClearVault = async () => {
    const success = await clearSavedVps();
    if (success) {
      setSavedVaultRecord(null);
      setVaultCleared(true);
      setTimeout(() => setVaultCleared(false), 3000);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Page Header */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-5 md:px-6 pt-4 pb-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#ECFDF5] font-sans">
          Настройки приложения
        </h1>
        <p className="text-sm text-[#A7F3D0]/70 mt-1">
          Конфигурация масштаба интерфейса, параметров соединения и локального зашифрованного хранилища Vault
        </p>
      </div>

      <BentoGrid cols={12}>
        {/* Module 1: UI Scaling Controls (Col 6) - Replaces Theme Selector */}
        <BentoCard
          colSpan={6}
          glow
          icon={<Sliders className="w-5 h-5 text-[#4ADE80]" />}
          title="Масштаб интерфейса"
          subtitle="Регулировка размера шрифтов, кнопок и карточек приложения"
          badge={
            <StatusBadge
              status="online"
              label={`${uiScale}%`}
            />
          }
        >
          <div className="space-y-4 my-2">
            <p className="text-sm text-[#A7F3D0]/80 leading-relaxed">
              Настройте комфортный размер элементов интерфейса под разрешение вашего монитора. Тема оформления зафиксирована в фирменном стиле Obsidian Deep Forest по умолчанию.
            </p>

            {/* Continuous Smooth Range Slider */}
            <div className="space-y-2 p-3.5 rounded-xl bg-[rgba(8,20,15,0.75)] border border-[rgba(74,222,128,0.16)]">
              <div className="flex items-center justify-between text-xs text-[#A7F3D0]/80">
                <span className="font-medium">Плавная шкала:</span>
                <span className="font-mono font-bold text-[#4ADE80] text-sm">{uiScale}%</span>
              </div>
              <input
                type="range"
                min="75"
                max="135"
                step="1"
                value={uiScale}
                onChange={(e) => setUiScale(Number(e.target.value))}
                className="w-full h-2 bg-[#0F221A] rounded-lg appearance-none cursor-pointer accent-[#4ADE80] focus:outline-none"
              />
              <div className="flex justify-between text-[11px] text-[#A7F3D0]/50 font-mono">
                <span>75% (Компактный)</span>
                <span>100%</span>
                <span>135% (Крупный)</span>
              </div>
            </div>

            {/* Quick Scale Presets Grid */}
            <div className="grid grid-cols-6 gap-2">
              {[80, 85, 90, 100, 115, 125].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setUiScale(preset)}
                  className={`py-2 px-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-center ${
                    uiScale === preset
                      ? "bg-[#22C55E]/25 text-[#4ADE80] border border-[#22C55E]/50 shadow-[0_0_12px_rgba(74,222,128,0.25)]"
                      : "bg-[rgba(8,20,15,0.7)] text-[#A7F3D0]/70 border border-[rgba(74,222,128,0.14)] hover:border-[rgba(74,222,128,0.3)]"
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>

            {/* Precise Step Adjusters & Custom Input */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[rgba(8,20,15,0.75)] border border-[rgba(74,222,128,0.16)]">
              <span className="text-sm font-medium text-[#ECFDF5]">
                Точная регулировка:
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setUiScale(uiScale - 1)}
                  disabled={uiScale <= 75}
                  title="Уменьшить масштаб на 1%"
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-[rgba(15,34,26,0.8)] border border-[rgba(74,222,128,0.25)] text-[#4ADE80] hover:bg-[rgba(74,222,128,0.15)] disabled:opacity-40 cursor-pointer transition-colors"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center bg-[#06100C] rounded-lg border border-[rgba(74,222,128,0.25)] px-2 py-1">
                  <input
                    type="number"
                    min="75"
                    max="135"
                    value={uiScale}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (!isNaN(val)) setUiScale(val);
                    }}
                    className="w-10 bg-transparent text-center font-mono font-bold text-sm text-[#4ADE80] focus:outline-none"
                  />
                  <span className="text-xs text-[#A7F3D0]/60 font-mono">%</span>
                </div>

                <button
                  type="button"
                  onClick={() => setUiScale(uiScale + 1)}
                  disabled={uiScale >= 135}
                  title="Увеличить масштаб на 1%"
                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-[rgba(15,34,26,0.8)] border border-[rgba(74,222,128,0.25)] text-[#4ADE80] hover:bg-[rgba(74,222,128,0.15)] disabled:opacity-40 cursor-pointer transition-colors"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setUiScale(100)}
                  title="Сбросить на 100%"
                  className="flex items-center justify-center px-2.5 h-8 rounded-lg bg-[rgba(15,34,26,0.8)] border border-[rgba(74,222,128,0.25)] text-xs text-[#A7F3D0]/70 hover:text-[#4ADE80] hover:bg-[rgba(74,222,128,0.15)] cursor-pointer transition-colors ml-1"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  100%
                </button>
              </div>
            </div>
          </div>
        </BentoCard>

        {/* Module 2: Connection Parameters (Col 6) */}
        <BentoCard
          colSpan={6}
          glow
          icon={<Settings className="w-5 h-5 text-[#4ADE80]" />}
          title="Параметры соединения"
          subtitle="Сетевой стек и SSH тайм-ауты"
        >
          <div className="space-y-4 my-2">
            <div>
              <label className="text-sm font-medium text-[#A7F3D0] block mb-2">
                Тайм-аут ожидания SSH соединения:
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {[15, 30, 60].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setSshTimeout(sec)}
                    className={`py-2.5 px-3 rounded-xl text-sm font-mono font-medium transition-all cursor-pointer ${
                      sshTimeout === sec
                        ? "bg-[#22C55E]/20 text-[#4ADE80] border border-[#22C55E]/40"
                        : "bg-[rgba(8,20,15,0.7)] text-[#A7F3D0]/70 border border-[rgba(74,222,128,0.14)]"
                    }`}
                  >
                    {sec} сек
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.14)]">
              <div>
                <span className="text-sm font-medium text-[#ECFDF5] block">Автосохранение в Vault</span>
                <span className="text-xs text-[#A7F3D0]/60 block mt-0.5">
                  Шифровать учетные данные алгоритмом AES-256-GCM
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAutoSaveVault(!autoSaveVault)}
                className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer ${
                  autoSaveVault ? "bg-[#22C55E]" : "bg-zinc-700"
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full bg-white transition-transform absolute top-1 ${
                    autoSaveVault ? "right-1" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </BentoCard>

        {/* Module 3: Encrypted Vault Security (Col 6) */}
        <BentoCard
          colSpan={6}
          icon={<Lock className="w-5 h-5 text-[#4ADE80]" />}
          title="Защищенное хранилище (Encrypted Vault)"
          subtitle="Локальное AES-256-GCM шифрование ключей приложения"
        >
          <div className="space-y-4 my-1">
            <p className="text-sm text-[#A7F3D0]/80 leading-relaxed">
              Все сохраненные пароли VPS и токены подписки хранятся на вашем компьютере в зашифрованном бинарном файле `.votex_vault.bin`.
            </p>

            {/* Display Saved VPS Info from Vault */}
            {savedVaultRecord ? (
              <div className="p-3.5 rounded-xl bg-[rgba(8,20,15,0.75)] border border-[rgba(74,222,128,0.2)] space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#A7F3D0]/70 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#4ADE80]" />
                    Сохраненный хост:
                  </span>
                  <span className="font-mono font-bold text-[#ECFDF5]">
                    {savedVaultRecord.host}:{savedVaultRecord.port}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#A7F3D0]/70 flex items-center gap-2">
                    <Key className="w-4 h-4 text-[#4ADE80]" />
                    Токен доступа:
                  </span>
                  <span className="font-mono text-[#4ADE80]">
                    {savedVaultRecord.subscription_token.substring(0, 14)}...
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#A7F3D0]/50 pt-1.5 border-t border-[rgba(74,222,128,0.1)]">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#4ADE80]" />
                    Дата синхронизации:
                  </span>
                  <span className="font-mono">
                    {savedVaultRecord.updated_at.split("T")[0]}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-[rgba(8,20,15,0.5)] border border-[rgba(74,222,128,0.1)] text-sm text-[#A7F3D0]/60 text-center">
                {loadingVault ? "Чтение данных Vault..." : "В хранилище нет активных сохраненных серверов"}
              </div>
            )}

            {vaultCleared && (
              <div className="p-3 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 text-sm text-[#4ADE80] flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Зашифрованное хранилище успешно очищено</span>
              </div>
            )}

            <div className="pt-1">
              <GlassButton
                variant="danger"
                size="md"
                onClick={handleClearVault}
                icon={<Trash2 className="w-5 h-5" />}
                className="w-full whitespace-nowrap"
              >
                Очистить сохраненные учетные данные Vault
              </GlassButton>
            </div>
          </div>
        </BentoCard>

        {/* Module 4: About Votex Project & Live Release Inspector (Col 6) */}
        <BentoCard
          colSpan={6}
          icon={<Shield className="w-5 h-5 text-[#4ADE80]" />}
          title="О проекте Votex"
          subtitle="Open Source Anticensorship Engine"
        >
          <div className="space-y-4 my-1">
            <p className="text-sm text-[#A7F3D0]/80 leading-relaxed">
              Votex — полностью автономный инструмент автоматического развертывания и харднинга личных VPN-серверов с защитой от ТСПУ и DPI.
            </p>

            <div className="grid grid-cols-2 gap-2 text-sm p-3 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.14)]">
              <div>
                <span className="text-[11px] text-[#A7F3D0]/60 uppercase block">Версия приложения</span>
                <span className="text-sm font-mono font-bold text-[#ECFDF5]">v1.0.0 (Release)</span>
              </div>
              <div>
                <span className="text-[11px] text-[#A7F3D0]/60 uppercase block">Дата текущей сборки</span>
                <span className="text-xs font-mono text-[#4ADE80] block mt-0.5">
                  {formatDate(typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : undefined)}
                </span>
              </div>
            </div>

            {updateDetails && (
              <div
                className={`p-3.5 rounded-xl border text-sm flex flex-col gap-2.5 ${
                  updateDetails.hasUpdate
                    ? "bg-[#22C55E]/20 border-[#22C55E]/50 text-[#ECFDF5]"
                    : "bg-[rgba(8,20,15,0.85)] border-[rgba(74,222,128,0.3)] text-[#A7F3D0]"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {updateDetails.hasUpdate ? (
                    <Download className="w-5 h-5 text-[#4ADE80] shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-[#4ADE80] shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <span className="font-semibold block">{updateDetails.message}</span>
                    <span className="text-xs text-[#A7F3D0]/70 block mt-1">
                      Сборка на GitHub: {updateDetails.remoteDate} • У вас: {updateDetails.localDate}
                    </span>
                  </div>
                </div>

                {updateDetails.hasUpdate && updateDetails.downloadUrl && (
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={updateDetails.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#22C55E] text-[#06100C] font-semibold text-xs hover:bg-[#4ADE80] transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Скачать votex.exe
                    </a>
                    {updateDetails.releaseUrl && (
                      <a
                        href={updateDetails.releaseUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center p-2 rounded-xl bg-[rgba(15,34,26,0.8)] border border-[rgba(74,222,128,0.3)] text-[#ECFDF5] hover:border-[#4ADE80] transition-colors"
                        title="Открыть релиз на GitHub"
                      >
                        <ExternalLink className="w-4 h-4 text-[#4ADE80]" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2.5 pt-1">
              <GlassButton
                variant="secondary"
                size="md"
                onClick={handleCheckUpdate}
                loading={checkingUpdate}
                icon={<RefreshCw className={`w-5 h-5 text-[#4ADE80] ${checkingUpdate ? "animate-spin" : ""}`} />}
                className="flex-1 whitespace-nowrap"
              >
                {checkingUpdate ? "Сверка с GitHub..." : "Проверить обновления"}
              </GlassButton>

              <a
                href="https://github.com/Yabl1ch/Votex"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center p-3 rounded-xl bg-[rgba(15,34,26,0.7)] text-[#ECFDF5] border border-[rgba(74,222,128,0.22)] hover:bg-[rgba(22,49,38,0.85)] hover:border-[#4ADE80] transition-colors"
                title="Репозиторий на GitHub"
              >
                <ExternalLink className="w-5 h-5 text-[#4ADE80]" />
              </a>
            </div>
          </div>
        </BentoCard>
      </BentoGrid>
    </div>
  );
};
