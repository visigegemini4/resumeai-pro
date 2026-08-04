interface TagProps {
  children: React.ReactNode;
  color?: "green" | "yellow" | "red" | "gray";
  className?: string;
}

/** 颜色标签：绿/黄/红/灰 */
export function Tag({ children, color = "gray", className = "" }: TagProps) {
  const colors = {
    green: "bg-mint-light text-mint-dark",
    yellow: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-500",
    gray: "bg-gray-100 text-gray-500",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]} ${className}`}
    >
      {children}
    </span>
  );
}
