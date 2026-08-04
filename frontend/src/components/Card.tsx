import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

/** 白底 + 1px 浅边框 + 轻阴影 + 8-12px 圆角 */
export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-white border border-mint-light rounded-xl shadow-sm ${
        className
      }`}
    >
      {children}
    </div>
  );
}
