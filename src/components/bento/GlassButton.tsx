import React from "react";
import { clsx } from "clsx";
import { motion, HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";

export interface GlassButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean;
  disabled?: boolean;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  className,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  loading = false,
  disabled = false,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-xl select-none whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none transition-all duration-200";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-5 py-2.5 text-base gap-2.5",
  }[size];

  const variantStyles = {
    primary:
      "bg-gradient-to-r from-[#22C55E] to-[#4ADE80] text-[#06100C] font-semibold shadow-[0_4px_16px_rgba(74,222,128,0.25),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:brightness-110 hover:shadow-[0_6px_20px_rgba(74,222,128,0.35)]",
    secondary:
      "bg-[rgba(15,34,26,0.7)] text-[#ECFDF5] border border-[rgba(74,222,128,0.22)] shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.1)] hover:bg-[rgba(22,49,38,0.85)] hover:border-[rgba(74,222,128,0.4)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.3)]",
    outline:
      "bg-transparent text-[#4ADE80] border border-[rgba(74,222,128,0.35)] hover:bg-[rgba(74,222,128,0.12)] hover:border-[#4ADE80]",
    danger:
      "bg-red-500/20 text-red-200 border border-red-500/35 hover:bg-red-500/30 hover:border-red-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]",
    ghost:
      "bg-transparent text-[#A7F3D0] hover:bg-[rgba(74,222,128,0.1)] hover:text-[#ECFDF5]",
  }[variant];

  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={clsx(baseStyles, sizeStyles, variantStyles, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0 text-current" />
      ) : (
        icon && iconPosition === "left" && <span className="shrink-0">{icon}</span>
      )}
      <span className="whitespace-nowrap truncate">{children}</span>
      {!loading && icon && iconPosition === "right" && (
        <span className="shrink-0">{icon}</span>
      )}
    </motion.button>
  );
};
