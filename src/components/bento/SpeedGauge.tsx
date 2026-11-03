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

  // Circular gauge geometry
  // Half-circle arc from -180 deg to 0 deg
  const radius = 64;
  const strokeWidth = 9;
  const circumference = Math.PI * radius; // Half circumference
  const strokeDashoffset = circumference - (downloadPct / 100) * circumference;

  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-between p-4 sm:p-5 rounded-2xl bg-[rgba(12,28,22,0.7)] border border-[rgba(74,222,128,0.18)] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.08)]",
        className
      )}
    >
      <div className="flex items-center justify-between w-full mb-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#4ADE80]" />
          <span className="text-xs font-semibold text-[#ECFDF5]">{title}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#4ADE80] font-mono">
          <Activity className="w-3 h-3" />
          <span>{pingMs} мс</span>
        </div>
      </div>

      {/* Speedometer Radial Arc */}
      <div className="relative flex flex-col items-center justify-center my-2">
        <svg
          className="w-44 h-24 overflow-visible"
          viewBox="0 0 160 90"
        >
          <defs>
            <linearGradient id="votexGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22C55E" />
              <stop offset="50%" stopColor="#4ADE80" />
              <stop offset="100%" stopColor="#86EFAC" />
            </linearGradient>
            <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#4ADE80" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Background track arc */}
          <path
            d="M 16 80 A 64 64 0 0 1 144 80"
            fill="none"
            stroke="rgba(74, 222, 128, 0.12)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Active progress arc */}
          <path
            d="M 16 80 A 64 64 0 0 1 144 80"
            fill="none"
            stroke="url(#votexGaugeGradient)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter="url(#gaugeGlow)"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Centered Speed Indicator */}
        <div className="absolute bottom-1 flex flex-col items-center justify-center text-center">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#ECFDF5] font-mono drop-shadow-[0_2px_8px_rgba(74,222,128,0.3)]">
            {downloadMbps}
          </span>
          <span className="text-[10px] uppercase font-semibold text-[#6EE7B7] tracking-wider -mt-0.5">
            Мбит/с
          </span>
        </div>
      </div>

      {/* Down / Up Dual Counters */}
      <div className="grid grid-cols-2 gap-3 w-full mt-2 pt-3 border-t border-[rgba(74,222,128,0.12)]">
        <div className="flex items-center gap-2 p-2 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.14)]">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#22C55E]/15 text-[#4ADE80]">
            <ArrowDown className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-[#A7F3D0]/70 uppercase block font-medium">Download</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-[#ECFDF5] truncate block">
              {downloadMbps} <span className="text-[10px] font-normal text-[#6EE7B7]">Мбит/с</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.14)]">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#4ADE80]/15 text-[#86EFAC]">
            <ArrowUp className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-[#A7F3D0]/70 uppercase block font-medium">Upload</span>
            <span className="text-xs sm:text-sm font-bold font-mono text-[#ECFDF5] truncate block">
              {uploadMbps} <span className="text-[10px] font-normal text-[#86EFAC]">Мбит/с</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
