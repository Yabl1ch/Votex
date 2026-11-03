import React from "react";
import { clsx } from "clsx";

export interface BentoGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | 4 | 6 | 12;
}

export const BentoGrid: React.FC<BentoGridProps> = ({
  children,
  className,
  cols = 12,
  ...props
}) => {
  const colStyles = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    6: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
    12: "grid-cols-1 lg:grid-cols-12",
  }[cols];

  return (
    <div
      className={clsx(
        "grid p-4 sm:p-5 md:p-6 gap-4 sm:gap-4 md:gap-5 w-full max-w-7xl mx-auto",
        colStyles,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
