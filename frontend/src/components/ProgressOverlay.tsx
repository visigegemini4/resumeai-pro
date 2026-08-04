import { useApp } from "../data/AppContext";
import type { PipelineProgressItem } from "../data/types";

/**
 * 优化流水线进度遮罩。
 * 在 ScenarioPage 点击「开始优化简历」后展示，覆盖全屏，3 步全部完成（无论成功/失败）后由父组件卸载。
 */
export function ProgressOverlay() {
  const { state } = useApp();
  const { pipelineProgress } = state;

  if (!pipelineProgress) return null;

  // 完成数 / 总数
  const completed = pipelineProgress.filter(
    (p) => p.status === "success" || p.status === "failed"
  ).length;
  const total = pipelineProgress.length;
  const percent = Math.round((completed / total) * 100);

  // 是否全部结束
  const allDone = completed === total;
  // 是否有失败
  const hasFailed = pipelineProgress.some((p) => p.status === "failed");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl p-6 sm:p-8">
        {/* 标题 */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-mint-light/60 mb-3">
            {allDone ? (
              hasFailed ? (
                <span className="text-2xl">⚠️</span>
              ) : (
                <span className="text-2xl">✓</span>
              )
            ) : (
              <span className="inline-block w-6 h-6 border-2 border-mint border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          <h3 className="text-base font-semibold text-ink">
            {allDone
              ? hasFailed
                ? "优化完成（部分失败）"
                : "优化完成"
              : "AI 正在优化简历..."}
          </h3>
          <p className="mt-1 text-xs text-ink-muted">
            {allDone
              ? "即将进入结果页"
              : `已完成 ${completed} / ${total} 项，请稍候`}
          </p>
        </div>

        {/* 进度条 */}
        <div className="mb-5">
          <div className="h-2 w-full rounded-full bg-mint-light/40 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ease-out ${
                hasFailed && allDone
                  ? "bg-amber-400"
                  : "bg-mint"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mt-1.5 text-right text-xs text-ink-muted">
            {percent}%
          </div>
        </div>

        {/* 步骤列表 */}
        <ul className="space-y-3">
          {pipelineProgress.map((item) => (
            <StepRow key={item.step} item={item} />
          ))}
        </ul>
      </div>
    </div>
  );
}

/** 单个步骤行 */
function StepRow({ item }: { item: PipelineProgressItem }) {
  const { status, label, error } = item;

  return (
    <li className="flex items-center gap-3">
      {/* 状态图标 */}
      <span className="shrink-0 w-6 h-6 flex items-center justify-center">
        {status === "pending" && (
          <span className="inline-block w-3 h-3 rounded-full border-2 border-mint-light bg-white" />
        )}
        {status === "running" && (
          <span className="inline-block w-4 h-4 border-2 border-mint border-t-transparent rounded-full animate-spin" />
        )}
        {status === "success" && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-mint text-white text-xs">
            ✓
          </span>
        )}
        {status === "failed" && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-400 text-white text-xs">
            ✗
          </span>
        )}
      </span>

      {/* 步骤名 */}
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm font-medium ${
            status === "pending"
              ? "text-ink-muted"
              : status === "failed"
              ? "text-red-500"
              : "text-ink"
          }`}
        >
          {label}
        </span>
        {status === "failed" && error && (
          <p className="mt-0.5 text-xs text-red-400 truncate">{error}</p>
        )}
        {status === "running" && (
          <p className="mt-0.5 text-xs text-ink-muted">处理中...</p>
        )}
      </div>
    </li>
  );
}
