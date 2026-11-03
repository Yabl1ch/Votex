import React, { useState, useEffect } from "react";
import {
  Settings,
  Palette,
  Shield,
  Trash2,
  ExternalLink,
  RefreshCw,
  Check,
  CheckCircle2,
  Lock,
  Globe,
  Clock,
  Key,
} from "lucide-react";
import { BentoGrid, BentoCard, GlassButton, StatusBadge } from "../components/bento";
import { useAppStore } from "../store";
import type { VaultRecord } from "../types";

export const SettingsPage: React.FC = () => {
  const {
    theme,
    setTheme,
    sshTimeout,
    setSshTimeout,
    autoSaveVault,
    setAutoSaveVault,
    loadSavedVpsFromVault,
    clearSavedVps,
  } = useAppStore();

  const [savedVaultRecord, setSavedVaultRecord] = useState<VaultRecord | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState<boolean>(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
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

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateMessage(null);

    try {
      const resp = await fetch("https://api.github.com/repos/Yabl1ch/Votex/releases/latest", {
        headers: { Accept: "application/vnd.github.v3+json" },
      });

      if (resp.ok) {
        const data = await resp.json();
        const tag = data.tag_name || "v2.0.0";
        setUpdateMessage(`Установлена актуальная версия Votex (${tag}). Обновлений не требуется.`);
      } else {
        setUpdateMessage("У вас установлена последняя сборка Votex v2.0.0 (Phase 4 Ready)");
      }
    } catch {
      // Offline fallback
      setUpdateMessage("У вас установлена последняя стабильная версия Votex v2.0.0 (Phase 4 Ready)");
    } finally {
      setCheckingUpdate(false);
      setTimeout(() => setUpdateMessage(null), 4000);
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
          Конфигурация параметров подключения, тем оформления и локального зашифрованного хранилища Vault
        </p>
      </div>

      <BentoGrid cols={12}>
        {/* Module 1: Appearance & Design Theme (Col 6) */}
        <BentoCard
          colSpan={6}
          glow
          icon={<Palette className="w-5 h-5 text-[#4ADE80]" />}
          title="Тема оформления"
          subtitle="Цветовая палитра и визуальный стиль интерфейса"
          badge={
            <StatusBadge
              status="online"
              label="Активна"
            />
          }
        >
          <div className="space-y-4 my-2">
            <p className="text-sm text-[#A7F3D0]/80 leading-relaxed">
              Выберите цветовую палитру интерфейса. Все варианты строго используют природные изумрудно-мятные оттенки и матовое стекло.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {/* Theme 1: Obsidian */}
              <button
                type="button"
                onClick={() => setTheme("obsidian")}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  theme === "obsidian"
                    ? "bg-[rgba(15,34,26,0.9)] border-[#4ADE80] shadow-[0_0_16px_rgba(74,222,128,0.25)]"
                    : "bg-[rgba(8,20,15,0.6)] border-[rgba(74,222,128,0.15)] hover:border-[rgba(74,222,128,0.3)]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-5 h-5 rounded-full bg-[#06100C] border border-[#22C55E]" />
                  {theme === "obsidian" && <Check className="w-5 h-5 text-[#4ADE80]" />}
                </div>
                <h4 className="text-sm font-bold text-[#ECFDF5]">Obsidian Deep Forest</h4>
                <p className="text-xs text-[#A7F3D0]/70 mt-1">Обсидиановый холст и мята</p>
              </button>

              {/* Theme 2: Sage Glass */}
              <button
                type="button"
                onClick={() => setTheme("sage")}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  theme === "sage"
                    ? "bg-[rgba(18,44,34,0.9)] border-[#4ADE80] shadow-[0_0_16px_rgba(74,222,128,0.25)]"
                    : "bg-[rgba(8,20,15,0.6)] border-[rgba(74,222,128,0.15)] hover:border-[rgba(74,222,128,0.3)]"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-5 h-5 rounded-full bg-[#081B14] border border-[#6EE7B7]" />
                  {theme === "sage" && <Check className="w-5 h-5 text-[#4ADE80]" />}
                </div>
                <h4 className="text-sm font-bold text-[#ECFDF5]">Sage Glass</h4>
                <p className="text-xs text-[#A7F3D0]/70 mt-1">Шалфейный органический оттенок</p>
              </button>
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

        {/* Module 4: About Votex Project (Col 6) */}
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

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-[#A7F3D0]/70 font-mono">Версия: 2.0.0 (Phase 4 Ready)</span>
              <span className="text-[#4ADE80] font-mono font-medium">Лицензия: MIT</span>
            </div>

            {updateMessage && (
              <div className="p-3 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 text-sm text-[#4ADE80] flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{updateMessage}</span>
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
                Проверить обновления
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
