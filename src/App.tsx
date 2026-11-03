import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "./components/navigation/Sidebar";
import {
  DashboardPage,
  ProvisioningPage,
  ReportsPage,
  SubscriptionPage,
  SecurityPage,
  SettingsPage,
} from "./pages";
import { useAppStore } from "./store";
import { Activity, Shield, Wifi, WifiOff } from "lucide-react";

export const App: React.FC = () => {
  const {
    activeTab,
    theme,
    isConnected,
    latency,
    appendLog,
    setProgress,
  } = useAppStore();

  // Set theme attribute on root element
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Setup Tauri Event Listener for "ssh-log"
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen<string>("ssh-log", (event) => {
          appendLog(event.payload);

          // Update progress dynamically based on stream milestones
          const payload = event.payload;
          if (payload.includes("[1/7]") || payload.includes("Pre-flight")) setProgress(15);
          else if (payload.includes("[2/7]") || payload.includes("Харднинг")) setProgress(30);
          else if (payload.includes("[3/7]") || payload.includes("Xray-core")) setProgress(50);
          else if (payload.includes("[4/7]") || payload.includes("Конфигурация")) setProgress(70);
          else if (payload.includes("[5/7]") || payload.includes("Бенчмарк")) setProgress(85);
          else if (payload.includes("[6/7]") || payload.includes("Подписка")) setProgress(95);
          else if (
            payload.includes("VOTEX_JSON_REPORT_START") ||
            payload.includes("УСПЕШНО") ||
            payload.includes("SUCCESS")
          ) {
            setProgress(100);
          }
        });
      } catch (err) {
        // Pure web browser preview mode fallback
        console.info("Tauri event listener inactive (web preview):", err);
      }
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [appendLog, setProgress]);

  // Page title mapping
  const pageTitles: Record<string, string> = {
    dashboard: "Главная панель",
    provisioning: "Мастер установки",
    reports: "Отчёты и скорость",
    subscription: "Подписка и маршрутизация",
    security: "Безопасность и UFW",
    settings: "Настройки",
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden votex-canvas-grid text-[#ECFDF5] select-none">
      {/* Organic Glass Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Floating App Header */}
        <header className="flex items-center justify-between px-6 py-3.5 bg-[rgba(15,34,26,0.6)] backdrop-blur-[24px] border-b border-[rgba(74,222,128,0.15)] shrink-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#4ADE80] shadow-[0_0_8px_#4ADE80]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#A7F3D0]">
              {pageTitles[activeTab] || "Votex"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {latency !== null && isConnected && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.18)] text-xs font-mono text-[#A7F3D0]">
                <Activity className="w-3.5 h-3.5 text-[#4ADE80]" />
                <span>{latency} мс</span>
              </div>
            )}

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[rgba(8,20,15,0.75)] border border-[rgba(74,222,128,0.18)] text-xs font-medium">
              {isConnected ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-[#4ADE80]" />
                  <span className="text-[#ECFDF5]">Защищенный туннель активен</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-[#A7F3D0]/70">Ожидание подключения</span>
                </>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/25 text-[11px] text-[#4ADE80] font-mono">
              <Shield className="w-3 h-3" />
              <span>organic-glass-bento</span>
            </div>
          </div>
        </header>

        {/* Dynamic Scrollable Viewport with Framer Motion AnimatePresence */}
        <main className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-5 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{
                duration: 0.22,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="h-full"
            >
              {activeTab === "dashboard" && <DashboardPage />}
              {activeTab === "provisioning" && <ProvisioningPage />}
              {activeTab === "reports" && <ReportsPage />}
              {activeTab === "subscription" && <SubscriptionPage />}
              {activeTab === "security" && <SecurityPage />}
              {activeTab === "settings" && <SettingsPage />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default App;
