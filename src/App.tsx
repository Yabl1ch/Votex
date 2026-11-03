import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "./components/navigation/Sidebar";
import {
  DashboardPage,
  ProvisioningPage,
  ReportsPage,
  SubscriptionPage,
  SettingsPage,
} from "./pages";
import { useAppStore } from "./store";
import { Activity, Wifi, WifiOff } from "lucide-react";

export const App: React.FC = () => {
  const {
    activeTab,
    theme,
    uiScale,
    isConnected,
    latency,
    appendLog,
    setProgress,
    loadSavedVpsFromVault,
  } = useAppStore();

  // Apply UI scale to body and root container
  useEffect(() => {
    const ratio = (uiScale / 100).toString();
    if (document.body) {
      (document.body.style as any).zoom = ratio;
    }
  }, [uiScale]);

  // Set theme attribute on root element
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Load saved VPS from Vault on application mount
  useEffect(() => {
    loadSavedVpsFromVault();
  }, [loadSavedVpsFromVault]);

  // Setup Tauri Event Listener for "ssh-log"
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen<string>("ssh-log", (event) => {
          appendLog(event.payload);

          // Update progress dynamically based on real stream milestones
          const payload = event.payload;
          if (payload.includes("[1/7]") || payload.includes("Шаг 1") || payload.includes("Pre-flight")) {
            setProgress(15);
          } else if (payload.includes("[2/7]") || payload.includes("Шаг 2") || payload.includes("зависимостей")) {
            setProgress(30);
          } else if (payload.includes("[3/7]") || payload.includes("Шаг 3") || payload.includes("харднинга") || payload.includes("Fail2ban")) {
            setProgress(50);
          } else if (payload.includes("[4/7]") || payload.includes("Шаг 4") || payload.includes("Xray-core")) {
            setProgress(70);
          } else if (payload.includes("[5/7]") || payload.includes("Шаг 5") || payload.includes("Генерация")) {
            setProgress(85);
          } else if (payload.includes("[6/7]") || payload.includes("Шаг 6") || payload.includes("бенчмарка")) {
            setProgress(95);
          } else if (
            payload.includes("VOTEX_JSON_REPORT_START") ||
            payload.includes("УСПЕШНО") ||
            payload.includes("SUCCESS") ||
            payload.includes("[7/7]")
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

  // Page title mapping (5 active user tabs)
  const pageTitles: Record<string, string> = {
    dashboard: "Главная",
    provisioning: "Мастер установки",
    reports: "Отчёты и скорость",
    subscription: "Подписка и маршруты",
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
            <div className="w-2.5 h-2.5 rounded-full bg-[#4ADE80] shadow-[0_0_8px_#4ADE80]" />
            <span className="text-sm font-semibold uppercase tracking-wider text-[#A7F3D0]">
              {pageTitles[activeTab] || "Votex"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.18)] text-xs sm:text-sm font-mono text-[#A7F3D0]">
              <Activity className={`w-4 h-4 ${isConnected ? "text-[#4ADE80]" : "text-zinc-500"}`} />
              <span>{isConnected && latency !== null ? `${latency} мс` : "0 мс"}</span>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[rgba(8,20,15,0.75)] border border-[rgba(74,222,128,0.18)] text-xs sm:text-sm font-medium">
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-[#4ADE80]" />
                  <span className="text-[#ECFDF5]">Защищенный туннель активен</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-zinc-400" />
                  <span className="text-[#A7F3D0]/60">Туннель не настроен</span>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Scrollable Viewport with Framer Motion AnimatePresence */}
        <main className="flex-1 overflow-y-auto min-h-0">
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
              {activeTab === "settings" && <SettingsPage />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default App;
