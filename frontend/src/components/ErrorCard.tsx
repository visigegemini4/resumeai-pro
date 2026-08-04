import { Button } from "./Button";

interface ErrorCardProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

/** 错误状态卡片：红色图标 + 原因 + 重试按钮 */
export function ErrorCard({ message, onRetry, className = "" }: ErrorCardProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 p-8 text-center ${className}`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-2xl">
        ⚠️
      </div>
      <p className="text-sm text-red-500 max-w-md">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="mt-1">
          重试
        </Button>
      )}
    </div>
  );
}
