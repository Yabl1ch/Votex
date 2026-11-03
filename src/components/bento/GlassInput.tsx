import React, { useState } from "react";
import { clsx } from "clsx";
import { Eye, EyeOff } from "lucide-react";

export interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
  isPassword?: boolean;
}

export const GlassInput: React.FC<GlassInputProps> = ({
  label,
  error,
  helperText,
  icon,
  suffixIcon,
  isPassword = false,
  className,
  type = "text",
  id,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-[#A7F3D0] flex items-center justify-between"
        >
          <span>{label}</span>
          {helperText && <span className="text-xs text-[#A7F3D0]/60 font-normal">{helperText}</span>}
        </label>
      )}

      <div className="relative flex items-center w-full">
        {icon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-[#6EE7B7] shrink-0 [&>svg]:w-5 [&>svg]:h-5">
            {icon}
          </div>
        )}

        <input
          id={inputId}
          type={inputType}
          className={clsx(
            "w-full h-11 sm:h-12 rounded-xl px-4 py-2.5 text-sm sm:text-base transition-all duration-200 outline-none",
            "bg-[rgba(8,20,15,0.75)] border text-[#ECFDF5] placeholder-[#344C3F]",
            "shadow-[inset_0_1px_1px_rgba(0,0,0,0.4)]",
            icon ? "pl-11" : "pl-4",
            isPassword || suffixIcon ? "pr-11" : "pr-4",
            error
              ? "border-red-500/50 focus:border-red-400 focus:ring-1 focus:ring-red-400/30"
              : "border-[rgba(74,222,128,0.22)] focus:border-[#4ADE80] focus:ring-2 focus:ring-[rgba(74,222,128,0.25)]",
            className
          )}
          {...props}
        />

        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 p-1 text-[#6EE7B7] hover:text-[#ECFDF5] transition-colors cursor-pointer"
            tabIndex={-1}
            title={showPassword ? "Скрыть пароль" : "Показать пароль"}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        ) : (
          suffixIcon && (
            <div className="absolute right-3.5 flex items-center text-[#6EE7B7] [&>svg]:w-5 [&>svg]:h-5">
              {suffixIcon}
            </div>
          )
        )}
      </div>

      {error && <span className="text-xs text-red-400 mt-0.5">{error}</span>}
    </div>
  );
};
