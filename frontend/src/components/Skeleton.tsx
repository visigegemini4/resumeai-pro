interface SkeletonProps {
  variant?:
    | "analyze"
    | "optimize-result"
    | "compare"
    | "resume"
    | "interview"
    | "generic";
  className?: string;
}

/** 占位块：统一左→右扫光动画 */
function Block({ className = "" }: { className?: string }) {
  return (
    <div
      className={`skeleton-shimmer rounded-lg ${className}`}
    />
  );
}

/** 统一骨架屏，按 variant 渲染对应结构 */
export function Skeleton({ variant = "generic", className = "" }: SkeletonProps) {
  if (variant === "analyze") {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center gap-2">
          <Block className="h-5 w-5 rounded-full" />
          <Block className="h-4 w-24" />
        </div>
        <Block className="h-3 w-full" />
        <Block className="h-3 w-11/12" />
        <Block className="h-3 w-4/5" />
      </div>
    );
  }

  if (variant === "optimize-result") {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* 双圆环占位 */}
        <div className="flex items-center justify-center gap-8">
          <Block className="h-28 w-28 rounded-full" />
          <Block className="h-8 w-16" />
          <Block className="h-28 w-28 rounded-full" />
        </div>
        {/* 关键词行占位 */}
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Block key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "compare") {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Block className="h-3 w-full" />
            <Block className="h-3 w-11/12" />
            <Block className="h-3 w-4/5" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "resume") {
    return (
      <div className={`space-y-5 ${className}`}>
        <Block className="h-8 w-48 mx-auto" />
        <Block className="h-4 w-32 mx-auto" />
        <div className="space-y-2">
          <Block className="h-3 w-full" />
          <Block className="h-3 w-11/12" />
          <Block className="h-3 w-3/4" />
        </div>
        <div className="space-y-2">
          <Block className="h-3 w-full" />
          <Block className="h-3 w-5/6" />
        </div>
      </div>
    );
  }

  if (variant === "interview") {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 p-4 border border-mint-light rounded-xl">
            <Block className="h-4 w-3/4" />
            <Block className="h-3 w-full" />
            <Block className="h-3 w-5/6" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <Block className="h-4 w-full" />
      <Block className="h-4 w-11/12" />
      <Block className="h-4 w-4/5" />
    </div>
  );
}
