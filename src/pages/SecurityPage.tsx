import React, { useState } from "react";
import {
  ShieldCheck,
  Flame,
  Lock,
  Unlock,
  RotateCcw,
  Power,
  Server,
  AlertTriangle,
  Check,
  CheckCircle2,
  Search,
  X,
  ShieldAlert,
} from "lucide-react";
import { BentoGrid, BentoCard, GlassButton, StatusBadge } from "../components/bento";
import { useAppStore } from "../store";

export const SecurityPage: React.FC = () => {
  const {
    bannedIPs,
    unbanIP,
    firewallPorts,
    restartServiceAction,
    rebootServerAction,
  } = useAppStore();

  const [restartingService, setRestartingService] = useState<string | null>(null);
  const [serviceFeedback, setServiceFeedback] = useState<string | null>(null);
  const [showRebootModal, setShowRebootModal] = useState<boolean>(false);
  const [ipFilter, setIpFilter] = useState<string>("");

  const handleRestartService = async (name: string) => {
    setRestartingService(name);
    setServiceFeedback(null);
    try {
      const msg = await restartServiceAction(name);
      setServiceFeedback(msg);
      setTimeout(() => setServiceFeedback(null), 3500);
    } catch (err) {
      console.warn("Failed to restart service:", err);
    } finally {
      setRestartingService(null);
    }
  };

  const handleConfirmReboot = async () => {
    setShowRebootModal(false);
    setRestartingService("VPS Reboot");
    setServiceFeedback(null);
    try {
      const msg = await rebootServerAction();
      setServiceFeedback(msg);
      setTimeout(() => setServiceFeedback(null), 4000);
    } catch (err) {
      console.warn("Failed to reboot server:", err);
    } finally {
      setRestartingService(null);
    }
  };

  const filteredBannedIPs = bannedIPs.filter(
    (b) =>
      b.ip.includes(ipFilter.trim()) ||
      (b.country && b.country.toLowerCase().includes(ipFilter.trim().toLowerCase())) ||
      b.reason.toLowerCase().includes(ipFilter.trim().toLowerCase())
  );

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Page Header */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-5 md:px-6 pt-4 pb-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#ECFDF5] font-sans">
          Безопасность и управление сервером
        </h1>
        <p className="text-sm text-[#A7F3D0]/70 mt-1">
          Антибот защита Fail2ban, межсетевой экран UFW, матрица портов и статус харднинга ядра Linux
        </p>
      </div>

      <BentoGrid cols={12}>
        {/* Module 1: Fail2ban Shield Status (Col 5) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <BentoCard
            glow
            icon={<ShieldCheck className="w-4 h-4 text-[#4ADE80]" />}
            title="Защита от перебора Fail2ban"
            subtitle="Мониторинг SSH и неавторизованных запросов"
            badge={
              <StatusBadge
                status="protected"
                label="Активен (Jail ON)"
              />
            }
          >
            <div className="space-y-3 my-2">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[rgba(8,20,15,0.75)] border border-[rgba(74,222,128,0.18)]">
                <div>
                  <span className="text-[10px] text-[#A7F3D0]/60 uppercase block font-medium">
                    Отражено атак за 24 часа
                  </span>
                  <span className="text-2xl font-bold font-mono text-[#4ADE80] block mt-0.5">
                    18 попыток входа
                  </span>
                </div>
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#22C55E]/15 text-[#4ADE80]">
                  <Flame className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-[rgba(15,34,26,0.6)]">
                  <span className="text-[#A7F3D0]">Лимит попыток (maxretry):</span>
                  <span className="font-mono text-[#ECFDF5]">4 попытки</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[rgba(15,34,26,0.6)]">
                  <span className="text-[#A7F3D0]">Длительность бана (bantime):</span>
                  <span className="font-mono text-[#ECFDF5]">86400 сек (24ч)</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[rgba(15,34,26,0.6)]">
                  <span className="text-[#A7F3D0]">Окно наблюдения (findtime):</span>
                  <span className="font-mono text-[#ECFDF5]">600 сек (10м)</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[rgba(15,34,26,0.6)]">
                  <span className="text-[#A7F3D0]">Защищаемый порт:</span>
                  <span className="font-mono text-[#4ADE80]">22 / TCP (sshd)</span>
                </div>
              </div>
            </div>
          </BentoCard>

          {/* Linux Kernel Hardening Parameters Card */}
          <BentoCard
            icon={<Lock className="w-4 h-4 text-[#4ADE80]" />}
            title="Параметры безопасности ядра"
            subtitle="/etc/sysctl.d/99-votex.conf"
          >
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[rgba(15,34,26,0.6)]">
                <span className="text-[#A7F3D0]">TCP BBR Алгоритм</span>
                <span className="text-[#4ADE80] font-mono font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Включен
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[rgba(15,34,26,0.6)]">
                <span className="text-[#A7F3D0]">SYN Flood Cookies (syncookies)</span>
                <span className="text-[#4ADE80] font-mono font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Активны
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[rgba(15,34,26,0.6)]">
                <span className="text-[#A7F3D0]">Защита от спуфинга (rp_filter)</span>
                <span className="text-[#4ADE80] font-mono font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Строгая (1)
                </span>
              </div>
            </div>
          </BentoCard>

          {/* Service Controls Card */}
          <BentoCard
            icon={<Server className="w-4 h-4 text-[#4ADE80]" />}
            title="Управление службами сервера"
            subtitle="Мягкий перезапуск и диагностика демонов"
          >
            {serviceFeedback && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 text-xs text-[#4ADE80] mb-3">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{serviceFeedback}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => handleRestartService("Xray-core")}
                loading={restartingService === "Xray-core"}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                className="whitespace-nowrap"
              >
                Xray-core
              </GlassButton>

              <GlassButton
                variant="secondary"
                size="sm"
                onClick={() => handleRestartService("Hysteria 2")}
                loading={restartingService === "Hysteria 2"}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                className="whitespace-nowrap"
              >
                Hysteria 2
              </GlassButton>

              <GlassButton
                variant="danger"
                size="sm"
                onClick={() => setShowRebootModal(true)}
                loading={restartingService === "VPS Reboot"}
                icon={<Power className="w-3.5 h-3.5" />}
                className="whitespace-nowrap"
              >
                Reboot VPS
              </GlassButton>
            </div>
          </BentoCard>
        </div>

        {/* Right Column: Banned IPs & UFW Firewall Matrix (Col 7) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* UFW Firewall Matrix */}
          <BentoCard
            glow
            icon={<ShieldCheck className="w-4 h-4 text-[#4ADE80]" />}
            title="Межсетевой экран UFW (Firewall Matrix)"
            subtitle="Политика: Запрещено все (DENY), кроме авторизованных портов"
            badge={
              <StatusBadge
                status="online"
                label="UFW Active"
              />
            }
          >
            <div className="space-y-2 my-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {firewallPorts.map((fp) => (
                  <div
                    key={`${fp.port}-${fp.proto}`}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.14)]"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-[#ECFDF5]">
                          {fp.port} / {fp.proto.toUpperCase()}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#22C55E]/15 text-[#4ADE80] font-mono">
                          {fp.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#A7F3D0]/70 block mt-0.5 truncate">
                        {fp.service}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2.5 rounded-xl bg-[rgba(15,34,26,0.6)] border border-[rgba(74,222,128,0.12)] text-xs text-[#A7F3D0]/70 flex items-center justify-between mt-2">
                <span>Остальные входящие порты:</span>
                <span className="font-mono text-red-400 font-semibold">DEFAULT DROP / DENY (Stealth)</span>
              </div>
            </div>
          </BentoCard>

          {/* Banned IPs Table */}
          <BentoCard
            icon={<AlertTriangle className="w-4 h-4 text-[#4ADE80]" />}
            title="Заблокированные атакующие IP (Fail2ban Jail)"
            subtitle="Хосты, превысившие лимит попыток подбора SSH паролей"
            badge={
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-red-500/15 text-red-300 border border-red-500/30">
                {bannedIPs.length} в бане
              </span>
            }
          >
            {/* Filter Search */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#A7F3D0]/60 pointer-events-none" />
              <input
                type="text"
                placeholder="Фильтр по IP или стране..."
                value={ipFilter}
                onChange={(e) => setIpFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.18)] text-xs text-[#ECFDF5] placeholder-[#A7F3D0]/40 focus:outline-none focus:border-[#4ADE80]"
              />
            </div>

            {filteredBannedIPs.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#A7F3D0]/60">
                Заблокированных IP-адресов не найдено.
              </div>
            ) : (
              <div className="space-y-2 my-1 max-h-64 overflow-y-auto">
                {filteredBannedIPs.map((banned) => (
                  <div
                    key={banned.ip}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.14)] hover:border-[rgba(74,222,128,0.25)] transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#ECFDF5]">
                          {banned.ip}
                        </span>
                        {banned.country && (
                          <span className="text-[10px] px-1.5 rounded bg-[rgba(15,34,26,0.8)] text-[#A7F3D0] border border-[rgba(74,222,128,0.18)]">
                            {banned.country}
                          </span>
                        )}
                        <span className="text-[10px] text-[#A7F3D0]/60 font-mono">
                          {banned.timestamp}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#A7F3D0]/70 block truncate">
                        {banned.reason}
                      </span>
                    </div>

                    <GlassButton
                      size="sm"
                      variant="ghost"
                      onClick={() => unbanIP(banned.ip)}
                      icon={<Unlock className="w-3.5 h-3.5 text-[#4ADE80]" />}
                      className="shrink-0 whitespace-nowrap"
                    >
                      Разблокировать
                    </GlassButton>
                  </div>
                ))}
              </div>
            )}
          </BentoCard>
        </div>
      </BentoGrid>

      {/* Reboot Server Confirmation Modal */}
      {showRebootModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md p-6 rounded-3xl bg-[rgba(15,34,26,0.95)] border border-[rgba(74,222,128,0.35)] shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
            <button
              type="button"
              onClick={() => setShowRebootModal(false)}
              className="absolute top-4 right-4 p-1 rounded-xl text-[#A7F3D0]/60 hover:text-[#ECFDF5] hover:bg-[rgba(74,222,128,0.1)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#ECFDF5]">
                  Подтверждение перезагрузки VPS
                </h3>
                <span className="text-xs text-[#A7F3D0]/70">
                  Временный сброс VPN-соединений
                </span>
              </div>
            </div>

            <p className="text-xs text-[#A7F3D0]/85 leading-relaxed mb-6">
              Внимание: Перезагрузка сервера временно прервет все активные VPN-туннели на 30–60 секунд, пока операционная система и сервисы Xray и Hysteria 2 не запустятся повторно. Вы уверены, что хотите продолжить?
            </p>

            <div className="flex items-center justify-end gap-3">
              <GlassButton
                variant="secondary"
                size="md"
                onClick={() => setShowRebootModal(false)}
                className="whitespace-nowrap"
              >
                Отмена
              </GlassButton>

              <GlassButton
                variant="danger"
                size="md"
                onClick={handleConfirmReboot}
                icon={<Power className="w-4 h-4" />}
                className="whitespace-nowrap"
              >
                Подтвердить перезагрузку
              </GlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
