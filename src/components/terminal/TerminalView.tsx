import React, { useEffect, useRef, useState } from "react";
import { Terminal, Copy, Check, Trash2, ArrowDown } from "lucide-react";

export interface TerminalViewProps {
  logs: string[];
  progress?: number;
  onClear?: () => void;
  title?: string;
  isStreaming?: boolean;
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  logs,
  progress = 0,
  onClear,
  title = "Терминал развертывания Votex",
  isStreaming = false,
}) => {
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    setAutoScroll(isAtBottom);
  };

  const copyToClipboard = async () => {
    if (logs.length === 0) return;
    try {
      await navigator.clipboard.writeText(logs.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const formatLogLine = (line: string, index: number) => {
    // Strip ANSI escape codes
    const cleanLine = line.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");

    // Specialized syntax highlighting for Votex steps and info
    if (cleanLine.includes("[VOTEX-STEP]")) {
      const parts = cleanLine.split("[VOTEX-STEP]");
      return (
        <div
          key={index}
          className="flex items-start gap-2 py-1 font-mono text-xs select-text bg-[#22C55E]/10 rounded-md px-1.5 -mx-1.5 border border-[#22C55E]/20"
        >
          <span className="text-[#344C3F] select-none text-[10px] w-8 shrink-0 text-right">
            {index + 1}
          </span>
          <span className="font-bold text-[#4ADE80] shrink-0">[VOTEX-STEP]</span>
          <span className="text-[#ECFDF5] font-semibold">{parts[1] || parts[0]}</span>
        </div>
      );
    }

    if (cleanLine.includes("[VOTEX-INFO]")) {
      const parts = cleanLine.split("[VOTEX-INFO]");
      return (
        <div key={index} className="flex items-start gap-2 py-0.5 font-mono text-xs select-text">
          <span className="text-[#344C3F] select-none text-[10px] w-8 shrink-0 text-right">
            {index + 1}
          </span>
          <span className="text-[#86EFAC] shrink-0 font-medium">[VOTEX-INFO]</span>
          <span className="text-[#A7F3D0]">{parts[1] || parts[0]}</span>
        </div>
      );
    }

    let colorClass = "text-[#A7F3D0]/90";
    if (
      cleanLine.includes("[OK]") ||
      cleanLine.includes("УСПЕШНО") ||
      cleanLine.includes("success") ||
      cleanLine.includes("SUCCESS")
    ) {
      colorClass = "text-[#4ADE80] font-medium";
    } else if (
      cleanLine.includes("[ERROR]") ||
      cleanLine.includes("ОШИБКА") ||
      cleanLine.includes("failed") ||
      cleanLine.includes("FAILED")
    ) {
      colorClass = "text-red-400 font-semibold";
    } else if (cleanLine.includes("[WARN]") || cleanLine.includes("ВНИМАНИЕ")) {
      colorClass = "text-amber-300";
    } else if (cleanLine.startsWith("==>") || cleanLine.match(/^\[[0-9]\/[0-9]\]/)) {
      colorClass = "text-emerald-300 font-medium";
    }

    return (
      <div key={index} className="flex items-start gap-2 py-0.5 font-mono text-xs leading-relaxed select-text">
        <span className="text-[#344C3F] select-none text-[10px] w-8 shrink-0 text-right">
          {index + 1}
        </span>
        <span className={`break-all ${colorClass}`}>{cleanLine}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full rounded-2xl bg-[rgba(6,16,12,0.92)] backdrop-blur-[24px] saturate-[160%] border border-[rgba(74,222,128,0.18)] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.08),0_16px_36px_-12px_rgba(0,0,0,0.6)] overflow-hidden">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[rgba(15,34,26,0.7)] border-b border-[rgba(74,222,128,0.14)] select-none">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-4 h-4 text-[#4ADE80]" />
          <span className="text-xs font-semibold tracking-wide text-[#ECFDF5]">{title}</span>
          {isStreaming && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#22C55E]/15 text-[#4ADE80] border border-[#22C55E]/30 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />
              SSH Live
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {logs.length > 0 && (
            <>
              <button
                type="button"
                onClick={copyToClipboard}
                title="Скопировать весь вывод"
                className="flex items-center gap-1 px-2 py-1 text-xs text-[#6EE7B7] hover:text-[#ECFDF5] hover:bg-[rgba(74,222,128,0.12)] rounded-lg transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                    <span className="text-[11px] text-[#4ADE80]">Скопировано</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Копировать</span>
                  </>
                )}
              </button>
              {onClear && (
                <button
                  type="button"
                  onClick={onClear}
                  title="Очистить терминал"
                  className="p-1.5 text-[#6EE7B7] hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {progress > 0 && (
        <div className="w-full bg-[rgba(15,34,26,0.6)] h-1.5 relative overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#22C55E] via-[#4ADE80] to-[#86EFAC] transition-all duration-300 ease-out shadow-[0_0_8px_rgba(74,222,128,0.5)]"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}

      {/* Terminal Output */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 p-3.5 overflow-y-auto font-mono text-xs text-[#ECFDF5] space-y-0.5 relative"
        style={{ minHeight: "220px" }}
      >
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 text-[#344C3F]">
            <Terminal className="w-8 h-8 mb-2 opacity-40 text-[#4ADE80]" />
            <p className="text-xs font-sans">Ожидание запуска провизионирования...</p>
            <p className="text-[11px] font-sans opacity-60">Логи потокового выполнения появятся здесь в реальном времени</p>
          </div>
        ) : (
          logs.map((line, idx) => formatLogLine(line, idx))
        )}
        <div ref={terminalEndRef} />
      </div>

      {/* Floating Auto-scroll Toggle */}
      {!autoScroll && logs.length > 0 && (
        <div className="p-2 bg-[rgba(6,16,12,0.8)] border-t border-[rgba(74,222,128,0.12)] flex justify-end">
          <button
            type="button"
            onClick={() => {
              setAutoScroll(true);
              terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-full bg-[rgba(15,34,26,0.95)] border border-[rgba(74,222,128,0.3)] text-[#4ADE80] shadow-lg cursor-pointer hover:bg-[rgba(22,49,38,0.95)]"
          >
            <ArrowDown className="w-3 h-3 animate-bounce" />
            <span>К новым логам</span>
          </button>
        </div>
      )}
    </div>
  );
};
