import React from "react";
import { clsx } from "clsx";
import { Shield, Radio, Layers, Flame, Lock } from "lucide-react";

export interface ProtocolLatencyItem {
  key: string;
  name: string;
  port: number;
  proto: "TCP" | "UDP";
  latency_ms: number;
  tag: string;
  icon: React.ReactNode;
}

export interface LatencyBarProps {
  protocols?: ProtocolLatencyItem[];
  className?: string;
  maxLatency?: number;
}

export const defaultProtocols: ProtocolLatencyItem[] = [
  {
    key: "hysteria2",
    name: "Hysteria 2 (QUIC)",
    port: 2083,
    proto: "UDP",
    latency_ms: 28,
    tag: "Минимальный пинг для игр",
    icon: <Flame className="w-3.5 h-3.5 text-[#4ADE80]" />,
  },
  {
    key: "vision",
    name: "VLESS Reality Vision",
    port: 20443,
    proto: "TCP",
    latency_ms: 34,
    tag: "Флагман против ТСПУ",
    icon: <Shield className="w-3.5 h-3.5 text-[#22C55E]" />,
  },
  {
    key: "shadowsocks",
    name: "Shadowsocks-2022",
    port: 2088,
    proto: "TCP",
    latency_ms: 36,
    tag: "Надежный резерв",
    icon: <Lock className="w-3.5 h-3.5 text-[#86EFAC]" />,
  },
  {
    key: "grpc",
    name: "gRPC Multi-Stream",
    port: 8443,
    proto: "TCP",
    latency_ms: 38,
    tag: "Мультиплексирование",
    icon: <Layers className="w-3.5 h-3.5 text-[#6EE7B7]" />,
  },
  {
    key: "xhttp",
    name: "SplitHTTP (xhttp)",
    port: 2053,
    proto: "TCP",
    latency_ms: 52,
    tag: "Обход жестких белых списков",
    icon: <Radio className="w-3.5 h-3.5 text-[#A7F3D0]" />,
  },
];

export const LatencyBar: React.FC<LatencyBarProps> = ({
  protocols = defaultProtocols,
  className,
  maxLatency = 80,
}) => {
  return (
    <div className={clsx("flex flex-col gap-3 w-full", className)}>
      {protocols.map((p) => {
        const pct = Math.min(100, Math.max(15, (p.latency_ms / maxLatency) * 100));
        const isFastest = p.latency_ms <= 30;

        return (
          <div
            key={p.key}
            className="p-3 rounded-xl bg-[rgba(8,20,15,0.7)] border border-[rgba(74,222,128,0.14)] hover:border-[rgba(74,222,128,0.3)] transition-colors duration-200"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-[rgba(74,222,128,0.1)]">
                  {p.icon}
                </div>
                <span className="text-xs font-semibold text-[#ECFDF5]">{p.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(15,34,26,0.8)] border border-[rgba(74,222,128,0.2)] text-[#A7F3D0] font-mono">
                  {p.port} {p.proto}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#A7F3D0]/70 hidden sm:inline-block">
                  {p.tag}
                </span>
                <span
                  className={clsx(
                    "text-xs font-bold font-mono px-2 py-0.5 rounded-md",
                    isFastest
                      ? "bg-[#22C55E]/20 text-[#4ADE80] border border-[#22C55E]/30"
                      : "bg-[rgba(15,34,26,0.6)] text-[#A7F3D0]"
                  )}
                >
                  {p.latency_ms} мс
                </span>
              </div>
            </div>

            {/* Horizontal Latency Bar Track */}
            <div className="w-full bg-[rgba(15,34,26,0.8)] h-2 rounded-full overflow-hidden p-0.5 border border-[rgba(74,222,128,0.1)]">
              <div
                className={clsx(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  isFastest
                    ? "bg-gradient-to-r from-[#22C55E] to-[#4ADE80] shadow-[0_0_8px_rgba(74,222,128,0.6)]"
                    : p.latency_ms < 45
                    ? "bg-gradient-to-r from-[#10B981] to-[#34D399]"
                    : "bg-gradient-to-r from-[#059669] to-[#10B981]"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
