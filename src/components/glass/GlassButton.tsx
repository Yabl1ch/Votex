import React from "react";
import { clsx } from "clsx";
import { Loader2 } from "lucide-react";

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  loading?: boolean;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  className,
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  disabled,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 cursor-pointer select-none whitespace-nowrap active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-5 py-2.5 text-base gap-2.5",
  }[size];

  const variantStyles = {
    primary:
      "bg-gradient-to-r from-[#22C55E] to-[#4ADE80] text-[#06100C] font-semibold shadow-[0_4px_16px_rgba(74,222,128,0.25),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:brightness-110 hover:shadow-[0_6px_20px_rgba(74,222,128,0.35)]",
    secondary:
      "bg-[rgba(15,34,26,0.7)] text-[#ECFDF5] border border-[rgba(74,222,128,0.22)] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.1)] hover:bg-[rgba(22,49,38,0.85)] hover:border-[rgba(74,222,128,0.4)]",
    danger:
      "bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 hover:border-red-500/50",
    ghost:
      "bg-transparent text-[#A7F3D0] hover:bg-[rgba(74,222,128,0.08)] hover:text-[#ECFDF5]",
  }[variant];

  return (
    <button
      className={clsx(baseStyles, sizeStyles, variantStyles, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0 text-current" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
    </button>
  );
};
