import React from "react";
import { clsx } from "clsx";

interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const GlassInput: React.FC<GlassInputProps> = ({
  label,
  error,
  icon,
  className,
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-[#A7F3D0] flex items-center justify-between"
        >
          <span>{label}</span>
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-[#6EE7B7] shrink-0">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={clsx(
            "w-full rounded-xl px-3.5 py-2.5 text-sm transition-all duration-200 outline-none",
            "bg-[rgba(8,20,15,0.75)] border text-[#ECFDF5] placeholder-[#344C3F]",
            "shadow-[inset_0_1px_1px_rgba(0,0,0,0.4)]",
            icon ? "pl-10" : "pl-3.5",
            error
              ? "border-red-500/50 focus:border-red-400 focus:ring-1 focus:ring-red-400/30"
              : "border-[rgba(74,222,128,0.22)] focus:border-[#4ADE80] focus:ring-2 focus:ring-[rgba(74,222,128,0.25)]",
            className
          )}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-red-400 mt-0.5">{error}</span>}
    </div>
  );
};
