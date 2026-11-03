import React from "react";
import { clsx } from "clsx";
import { motion, HTMLMotionProps } from "framer-motion";

export interface BentoCardProps extends Omit<HTMLMotionProps<"div">, "title"> {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
}

export const BentoCard: React.FC<BentoCardProps> = ({
  children,
  className,
  glow = false,
  title,
  subtitle,
  icon,
  badge,
  action,
  colSpan,
  ...props
}) => {
  const colSpanClass = colSpan
    ? {
        1: "lg:col-span-1",
        2: "lg:col-span-2",
        3: "lg:col-span-3",
        4: "lg:col-span-4",
        5: "lg:col-span-5",
        6: "lg:col-span-6",
        7: "lg:col-span-7",
        8: "lg:col-span-8",
        9: "lg:col-span-9",
        10: "lg:col-span-10",
        11: "lg:col-span-11",
        12: "lg:col-span-12",
      }[colSpan]
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 26,
        mass: 0.8,
      }}
      whileHover={
        glow
          ? {
              y: -2,
              transition: { duration: 0.2 },
            }
          : undefined
      }
      className={clsx(
        "relative rounded-2xl p-4 sm:p-5 md:p-6 transition-colors duration-300",
        "bg-[rgba(15,34,26,0.65)] backdrop-blur-[24px] saturate-[160%]",
        "border border-[rgba(74,222,128,0.18)]",
        "shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.12),0_16px_36px_-12px_rgba(0,0,0,0.5)]",
        glow &&
          "hover:border-[rgba(74,222,128,0.38)] hover:shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.18),0_0_24px_-4px_rgba(74,222,128,0.18)]",
        colSpanClass,
        className
      )}
      {...props}
    >
      {(title || icon || badge || action) && (
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[rgba(74,222,128,0.12)]">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && (
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-[rgba(74,222,128,0.1)] border border-[rgba(74,222,128,0.2)] text-[#4ADE80] shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h3 className="text-sm font-semibold tracking-tight text-[#ECFDF5] truncate">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-[#A7F3D0]/70 truncate">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {badge && <div>{badge}</div>}
            {action && <div>{action}</div>}
          </div>
        </div>
      )}

      {children}
    </motion.div>
  );
};
