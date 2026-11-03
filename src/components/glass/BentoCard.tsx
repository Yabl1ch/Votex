import React from "react";
import { clsx } from "clsx";

interface BentoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export const BentoCard: React.FC<BentoCardProps> = ({
  children,
  className,
  glow = false,
  ...props
}) => {
  return (
    <div
      className={clsx(
        "relative rounded-2xl p-5 md:p-6 transition-all duration-300 ease-out",
        "bg-[rgba(15,34,26,0.65)] backdrop-blur-[24px] saturate-[160%]",
        "border border-[rgba(74,222,128,0.18)]",
        "shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.12),0_16px_36px_-12px_rgba(0,0,0,0.5)]",
        glow && "hover:border-[rgba(74,222,128,0.38)] hover:shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.18),0_0_24px_-4px_rgba(74,222,128,0.18)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
