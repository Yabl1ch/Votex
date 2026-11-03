import React from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Terminal,
  Activity,
  Globe,
  Settings,
  Shield,
  Lock,
  Wifi,
} from "lucide-react";
import { clsx } from "clsx";
import { useAppStore } from "../../store";
import type { TabId } from "../../types";

export interface NavItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

export const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Главная",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    id: "provisioning",
    label: "Мастер установки",
    icon: <Terminal className="w-5 h-5" />,
  },
  {
    id: "reports",
    label: "Отчёты и скорость",
    icon: <Activity className="w-5 h-5" />,
  },
  {
    id: "subscription",
    label: "Подписка и маршруты",
    icon: <Globe className="w-5 h-5" />,
  },
  {
    id: "settings",
    label: "Настройки",
    icon: <Settings className="w-5 h-5" />,
  },
];

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, isConnected, latency, vpsConfig, report } = useAppStore();

  const currentHost = (vpsConfig.host || report?.server_ip || "").trim();

  return (
    <aside className="w-68 h-full flex flex-col justify-between p-4 sm:p-5 bg-[rgba(15,34,26,0.7)] backdrop-blur-[24px] saturate-[160%] border-r border-[rgba(74,222,128,0.18)] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.12),0_16px_36px_-12px_rgba(0,0,0,0.5)] select-none shrink-0 z-30">
      {/* Brand Header */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-[#22C55E]/20 to-[#4ADE80]/30 border border-[#4ADE80]/35 shadow-[0_0_16px_rgba(74,222,128,0.25)] shrink-0">
            <Shield className="w-6 h-6 text-[#4ADE80]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-[#ECFDF5] font-sans">
                VOTEX
              </span>
              <span className="text-xs uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-[#22C55E]/15 text-[#4ADE80] border border-[#22C55E]/30">
                v2.0
              </span>
            </div>
            <p className="text-xs text-[#A7F3D0]/70 truncate leading-none mt-1">
              Bento VPN Orchestrator
            </p>
          </div>
        </div>

        {/* Navigation Items with Sliding Active Indicator */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={clsx(
                  "relative flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer outline-none group",
                  isActive
                    ? "text-[#ECFDF5] font-semibold"
                    : "text-[#A7F3D0]/75 hover:text-[#ECFDF5] hover:bg-[rgba(74,222,128,0.06)]"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-[rgba(34,197,94,0.22)] to-[rgba(74,222,128,0.14)] border border-[rgba(74,222,128,0.35)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),0_4px_16px_rgba(74,222,128,0.15)] -z-10"
                    transition={{
                      type: "spring",
                      stiffness: 350,
                      damping: 30,
                    }}
                  />
                )}

                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={clsx(
                      "shrink-0 transition-colors duration-200",
                      isActive
                        ? "text-[#4ADE80]"
                        : "text-[#6EE7B7] group-hover:text-[#4ADE80]"
                    )}
                  >
                    {item.icon}
                  </div>
                  <span className="truncate whitespace-nowrap">{item.label}</span>
                </div>

                {item.badge && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-[#22C55E]/15 text-[#4ADE80] border border-[#22C55E]/30 font-mono">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info & Connection Pill */}
      <div className="space-y-3 pt-4 border-t border-[rgba(74,222,128,0.12)]">
        {/* Live Server Status Pill */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[rgba(8,20,15,0.75)] border border-[rgba(74,222,128,0.18)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span
                className={clsx(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  isConnected ? "bg-[#22C55E]" : "bg-red-400"
                )}
              />
              <span
                className={clsx(
                  "relative inline-flex rounded-full h-2.5 w-2.5",
                  isConnected ? "bg-[#4ADE80]" : "bg-red-400"
                )}
              />
            </span>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-[#ECFDF5] block truncate leading-tight">
                {isConnected ? "Сервер на связи" : "Нет соединения"}
              </span>
              <span className="text-[11px] text-[#A7F3D0]/60 font-mono block truncate">
                {currentHost ? currentHost : "Требуется VPS"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[rgba(15,34,26,0.6)] border border-[rgba(74,222,128,0.2)]">
            <Wifi className={`w-3.5 h-3.5 ${isConnected ? "text-[#4ADE80]" : "text-zinc-500"}`} />
            <span className={isConnected ? "text-[#4ADE80]" : "text-zinc-400"}>
              {isConnected && latency !== null ? `${latency} мс` : "0 мс"}
            </span>
          </div>
        </div>

        {/* Encrypted Vault Badge */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-[#6EE7B7]/70 py-1">
          <Lock className="w-3.5 h-3.5 text-[#4ADE80]" />
          <span>Local Vault Encrypted</span>
        </div>
      </div>
    </aside>
  );
};
