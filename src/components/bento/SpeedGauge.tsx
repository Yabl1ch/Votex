import React from "react";
import { ArrowDown, ArrowUp, Zap, Activity } from "lucide-react";
import { clsx } from "clsx";

export interface SpeedGaugeProps {
  downloadMbps: number;
  uploadMbps: number;
  maxSpeed?: number;
  pingMs?: number;
  title?: string;
  className?: string;
}

export const SpeedGauge: React.FC<SpeedGaugeProps> = ({
  downloadMbps,
  uploadMbps,
  maxSpeed = 1000,
  pingMs = 28,
  title = "Пропускная способность туннеля",
  className,
}) => {
  // Normalize percentage for arc gauge (0 to 100)
  const downloadPct = Math.min(100, Math.max(0, (downloadMbps / maxSpeed) * 100));
  const uploadPct = Math.min(100, Math.max(0, (uploadMbps / maxSpeed) * 100));

  // Circular gauge geometry: Half-circle arc
  const radius = 68;
  const strokeWidth = 10;
  const circumference = Math.PI * radius; // Half circumference
  const downloadDashoffset = circumference - (downloadPct / 100) * circumference;
  const uploadDashoffset = circumference - (uploadPct / 100) * circumference;

  return (
    <div
      className={clsx(
        "flex flex-col justify-between p-5 sm:p-6 rounded-2xl bg-[rgba(12,28,22,0.7)] border border-[rgba(74,222,128,0.18)] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.08)]",
        className
      )}
    >
      {/* Gauge Top Bar */}
      <div className="flex items-center justify-between w-full mb-4 pb-3 border-b border-[rgba(74,222,128,0.12)]">
        <div className="flex items-center gap-2.5">
          <Zap className="w-5 h-5 text-[#4ADE80]" />
          <span className="text-sm sm:text-base font-semibold text-[#ECFDF5]">{title}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs sm:text-sm bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#4ADE80] font-mono">
          <Activity className="w-4 h-4" />
          <span>Пинг: {pingMs} мс</span>
        </div>
      </div>

      {/* Dual Radial Gauges: Download & Upload side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-2 w-full">
        {/* Gauge 1: Download */}
        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-[rgba(8,20,15,0.6)] border border-[rgba(74,222,128,0.12)] relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#22C55E]/20 text-[#4ADE80]">
              <ArrowDown className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#A7F3D0]">
              Входящая скорость (Download)
            </span>
          </div>

          <div className="relative flex flex-col items-center justify-center">
            <svg className="w-56 h-30 overflow-visible" viewBox="0 0 170 95">
              <defs>
                <linearGradient id="votexDownloadGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22C55E" />
                  <stop offset="50%" stopColor="#4ADE80" />
                  <stop offset="100%" stopColor="#86EFAC" />
                </linearGradient>
                <filter id="downloadGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#4ADE80" floodOpacity="0.45" />
                </filter>
              </defs>

              {/* Background track */}
              <path
                d="M 17 85 A 68 68 0 0 1 153 85"
                fill="none"
                stroke="rgba(74, 222, 128, 0.14)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />

              {/* Active progress */}
              <path
                d="M 17 85 A 68 68 0 0 1 153 85"
                fill="none"
                stroke="url(#votexDownloadGradient)"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={downloadDashoffset}
                strokeLinecap="round"
                filter="url(#downloadGlow)"
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Centered Numbers */}
            <div className="absolute bottom-1 flex flex-col items-center justify-center text-center">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#ECFDF5] font-mono drop-shadow-[0_2px_10px_rgba(74,222,128,0.35)]">
                {downloadMbps}
              </span>
              <span className="text-xs uppercase font-semibold text-[#4ADE80] tracking-wider -mt-0.5">
                Мбит/с
              </span>
            </div>
          </div>

          <span className="text-xs text-[#A7F3D0]/60 mt-2 font-mono">
            Шкала канала: 0–{maxSpeed} Мбит/с
          </span>
        </div>

        {/* Gauge 2: Upload */}
        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-[rgba(8,20,15,0.6)] border border-[rgba(74,222,128,0.12)] relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#4ADE80]/20 text-[#86EFAC]">
              <ArrowUp className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#A7F3D0]">
              Исходящая скорость (Upload)
            </span>
          </div>

          <div className="relative flex flex-col items-center justify-center">
            <svg className="w-56 h-30 overflow-visible" viewBox="0 0 170 95">
              <defs>
                <linearGradient id="votexUploadGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="50%" stopColor="#34D399" />
                  <stop offset="100%" stopColor="#A7F3D0" />
                </linearGradient>
                <filter id="uploadGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#34D399" floodOpacity="0.45" />
                </filter>
              </defs>

              {/* Background track */}
              <path
                d="M 17 85 A 68 68 0 0 1 153 85"
                fill="none"
                stroke="rgba(74, 222, 128, 0.14)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />

              {/* Active progress */}
              <path
                d="M 17 85 A 68 68 0 0 1 153 85"
                fill="none"
                stroke="url(#votexUploadGradient)"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={uploadDashoffset}
                strokeLinecap="round"
                filter="url(#uploadGlow)"
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Centered Numbers */}
            <div className="absolute bottom-1 flex flex-col items-center justify-center text-center">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#ECFDF5] font-mono drop-shadow-[0_2px_10px_rgba(52,211,153,0.35)]">
                {uploadMbps}
              </span>
              <span className="text-xs uppercase font-semibold text-[#86EFAC] tracking-wider -mt-0.5">
                Мбит/с
              </span>
            </div>
          </div>

          <span className="text-xs text-[#A7F3D0]/60 mt-2 font-mono">
            Шкала канала: 0–{maxSpeed} Мбит/с
          </span>
        </div>
      </div>

      {/* Down / Up Quick Badges & Extra Network Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full mt-3 pt-4 border-t border-[rgba(74,222,128,0.12)]">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.14)]">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#22C55E]/15 text-[#4ADE80] shrink-0">
            <ArrowDown className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-[#A7F3D0]/70 uppercase block font-medium">Download</span>
            <span className="text-sm sm:text-base font-bold font-mono text-[#ECFDF5] truncate block">
              {downloadMbps} <span className="text-xs font-normal text-[#6EE7B7]">Мбит/с</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.14)]">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#4ADE80]/15 text-[#86EFAC] shrink-0">
            <ArrowUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-[#A7F3D0]/70 uppercase block font-medium">Upload</span>
            <span className="text-sm sm:text-base font-bold font-mono text-[#ECFDF5] truncate block">
              {uploadMbps} <span className="text-xs font-normal text-[#86EFAC]">Мбит/с</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.14)]">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#22C55E]/15 text-[#4ADE80] shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-[#A7F3D0]/70 uppercase block font-medium">Потери пакетов</span>
            <span className="text-sm sm:text-base font-bold font-mono text-[#4ADE80] truncate block">
              0.0% <span className="text-xs font-normal text-[#6EE7B7]">(Lossless)</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.14)]">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#4ADE80]/15 text-[#86EFAC] shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-xs text-[#A7F3D0]/70 uppercase block font-medium">Джиттер канала</span>
            <span className="text-sm sm:text-base font-bold font-mono text-[#4ADE80] truncate block">
              1.2 мс <span className="text-xs font-normal text-[#86EFAC]">(Стабильно)</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
