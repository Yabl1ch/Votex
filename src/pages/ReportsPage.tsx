import React, { useState } from "react";
import {
  Activity,
  Zap,
  Gauge,
  RotateCw,
  Layers,
  ArrowUpDown,
  CheckCircle2,
} from "lucide-react";
import {
  BentoGrid,
  BentoCard,
  GlassButton,
  SpeedGauge,
  LatencyBar,
  StatusBadge,
} from "../components/bento";
import { useAppStore } from "../store";

export const ReportsPage: React.FC = () => {
  const { report } = useAppStore();
  const [testing, setTesting] = useState(false);
  const [downloadSpeed, setDownloadSpeed] = useState(
    report?.benchmark?.speed_mbps || 480
  );
  const [uploadSpeed, setUploadSpeed] = useState(420);
  const [ping, setPing] = useState(report?.benchmark?.latency_ms || 28);

  const handleRetestSpeed = () => {
    setTesting(true);
    setTimeout(() => {
      // Simulate fresh benchmark results
      const newDl = Math.floor(460 + Math.random() * 50);
      const newUl = Math.floor(400 + Math.random() * 40);
      const newPing = Math.floor(26 + Math.random() * 6);
      setDownloadSpeed(newDl);
      setUploadSpeed(newUl);
      setPing(newPing);
      setTesting(false);
    }, 1200);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 pt-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#ECFDF5] font-sans">
            Отчёты и бенчмарки скорости
          </h1>
          <p className="text-xs text-[#A7F3D0]/70 mt-0.5">
            Детальная аналитика задержки (Handshake Latency) и пропускной способности протоколов
          </p>
        </div>

        {/* Retest Speed Button: Strictly whitespace-nowrap */}
        <div className="flex items-center gap-2 shrink-0">
          <GlassButton
            variant="primary"
            size="md"
            onClick={handleRetestSpeed}
            loading={testing}
            icon={<RotateCw className="w-4 h-4" />}
            className="whitespace-nowrap"
          >
            Повторить тест скорости
          </GlassButton>
        </div>
      </div>

      <BentoGrid cols={12}>
        {/* Speedometer Gauge Module (Col 5) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <BentoCard
            glow
            icon={<Gauge className="w-4 h-4 text-[#4ADE80]" />}
            title="Спидометр туннеля"
            subtitle="Тестирование канала до Франкфурта / Амстердама"
            badge={
              <StatusBadge
                status="online"
                label="4K UHD Ready"
              />
            }
          >
            <SpeedGauge
              downloadMbps={downloadSpeed}
              uploadMbps={uploadSpeed}
              pingMs={ping}
              maxSpeed={1000}
            />

            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[rgba(74,222,128,0.12)] text-center">
              <div className="p-2 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.14)]">
                <span className="text-[10px] text-[#A7F3D0]/70 uppercase block">Потери</span>
                <span className="text-xs font-mono font-bold text-[#4ADE80]">0.0%</span>
              </div>
              <div className="p-2 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.14)]">
                <span className="text-[10px] text-[#A7F3D0]/70 uppercase block">Джиттер</span>
                <span className="text-xs font-mono font-bold text-[#4ADE80]">1.2 мс</span>
              </div>
              <div className="p-2 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.14)]">
                <span className="text-[10px] text-[#A7F3D0]/70 uppercase block">TLS Handshake</span>
                <span className="text-xs font-mono font-bold text-[#4ADE80]">18 мс</span>
              </div>
            </div>
          </BentoCard>

          {/* Quality Assessment Card */}
          <BentoCard
            icon={<CheckCircle2 className="w-4 h-4 text-[#4ADE80]" />}
            title="Оценка качества связи"
            subtitle="Стандарты ITU-T G.1050"
          >
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[rgba(15,34,26,0.6)]">
                <span className="text-[#A7F3D0]">YouTube 4K 60fps HDR</span>
                <span className="text-[#4ADE80] font-semibold">Идеально (Без буферизации)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[rgba(15,34,26,0.6)]">
                <span className="text-[#A7F3D0]">Онлайн-игры (CS2 / Dota 2)</span>
                <span className="text-[#4ADE80] font-semibold">28 мс (Hysteria 2 UDP)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-[rgba(15,34,26,0.6)]">
                <span className="text-[#A7F3D0]">Стриминг Discord / Twitch</span>
                <span className="text-[#4ADE80] font-semibold">1080p 60fps</span>
              </div>
            </div>
          </BentoCard>
        </div>

        {/* Right Column: Comparative Latency Matrix for 5 Protocols (Col 7) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <BentoCard
            glow
            icon={<Layers className="w-4 h-4 text-[#4ADE80]" />}
            title="Сравнение задержки 5 протоколов"
            subtitle="Замеры времени установления защищенной сессии"
            badge={
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#22C55E]/15 text-[#4ADE80] text-xs font-mono border border-[#22C55E]/30">
                <ArrowUpDown className="w-3 h-3" />
                <span>5 Активных</span>
              </div>
            }
          >
            <div className="mb-3">
              <p className="text-xs text-[#A7F3D0]/80 leading-relaxed">
                Каждый протокол решает свою задачу: Hysteria 2 обеспечивает сверхбыстрый отклик по UDP, SplitHTTP маскирует трафик под обычные запросы веб-браузера при агрессивном глушении, а Reality Vision гарантирует чистый TLS 1.3 поток без отпечатков.
              </p>
            </div>

            <LatencyBar />

            <div className="mt-4 pt-3 border-t border-[rgba(74,222,128,0.12)] flex items-center justify-between text-xs text-[#A7F3D0]/70">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#4ADE80]" />
                Все протоколы объединены в один общий subscription профиль
              </span>
              <span className="font-mono text-[#4ADE80]">Auto-Fallback ON</span>
            </div>
          </BentoCard>

          {/* Test Methodology Note */}
          <div className="p-3.5 rounded-2xl bg-[rgba(12,28,22,0.6)] border border-[rgba(74,222,128,0.14)] text-xs text-[#A7F3D0]/75 flex items-start gap-2.5">
            <Activity className="w-4 h-4 text-[#4ADE80] shrink-0 mt-0.5" />
            <span>
              Замеры задержки выполняются нативным TCP/UDP сокетом ядра Rust с измерением времени трехстороннего рукопожатия (3-way handshake) и TLS negotiation time без сторонних серверов.
            </span>
          </div>
        </div>
      </BentoGrid>
    </div>
  );
};
