import React from "react";
import { clsx } from "clsx";

export type BadgeStatus =
  | "online"
  | "active"
  | "protected"
  | "warning"
  | "danger"
  | "offline"
  | "neutral";

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: BadgeStatus;
  label: string;
  icon?: React.ReactNode;
  pulse?: boolean;
  size?: "sm" | "md";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status = "online",
  label,
  icon,
  pulse = true,
  size = "md",
  className,
  ...props
}) => {
  const statusStyles: Record<
    BadgeStatus,
    { badge: string; dot: string; ping: string }
  > = {
    online: {
      badge: "bg-[#22C55E]/15 text-[#4ADE80] border-[#22C55E]/30",
      dot: "bg-[#4ADE80]",
      ping: "bg-[#22C55E]",
    },
    active: {
      badge: "bg-[#22C55E]/15 text-[#4ADE80] border-[#22C55E]/30",
      dot: "bg-[#4ADE80]",
      ping: "bg-[#22C55E]",
    },
    protected: {
      badge: "bg-[#10B981]/15 text-[#34D399] border-[#10B981]/35",
      dot: "bg-[#34D399]",
      ping: "bg-[#10B981]",
    },
    warning: {
      badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      dot: "bg-amber-400",
      ping: "bg-amber-400",
    },
    danger: {
      badge: "bg-red-500/15 text-red-300 border-red-500/30",
      dot: "bg-red-400",
      ping: "bg-red-400",
    },
    offline: {
      badge: "bg-zinc-800/60 text-zinc-400 border-zinc-700/50",
      dot: "bg-zinc-500",
      ping: "bg-zinc-500",
    },
    neutral: {
      badge: "bg-[rgba(15,34,26,0.6)] text-[#A7F3D0] border-[rgba(74,222,128,0.2)]",
      dot: "bg-[#6EE7B7]",
      ping: "bg-[#4ADE80]",
    },
  };

  const current = statusStyles[status];
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full font-medium border select-none whitespace-nowrap shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.06)]",
        current.badge,
        sizeClass,
        className
      )}
      {...props}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span
            className={clsx(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              current.ping
            )}
          />
          <span
            className={clsx(
              "relative inline-flex rounded-full h-2 w-2",
              current.dot
            )}
          />
        </span>
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
    </span>
  );
};

export const GlassBadge: React.FC<StatusBadgeProps> = StatusBadge;
