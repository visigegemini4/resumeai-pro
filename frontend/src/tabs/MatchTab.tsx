import { useApp } from "../data/AppContext";
import { Card } from "../components/Card";
import { ProgressRing } from "../components/ProgressRing";
import { Skeleton } from "../components/Skeleton";

export function MatchTab() {
  const { state } = useApp();
  const { optimizeResult, loading } = state;

  if (loading.optimize || !optimizeResult) {
    return (
      <Card className="p-6">
        <Skeleton variant="optimize-result" />
      </Card>
    );
  }

  const { matchBefore, matchAfter } = optimizeResult;
  const improvement = matchAfter.score - matchBefore.score;
  const beforeHits = matchBefore.keywordHits;
  const afterHits = matchAfter.keywordHits;
  // 合并前后命中情况：按索引对齐（后端保证两数组关键词一一对应）
  const beforeCount = beforeHits.filter((k) => k.hit).length;
  const afterCount = afterHits.filter((k) => k.hit).length;

  return (
    <div className="space-y-6">
      {/* 优化前后匹配度对比 */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-ink mb-5 text-center">
          优化前后匹配度对比
        </h3>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
          <ProgressRing score={matchBefore} label="优化前" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl text-mint">→</span>
            <span className="text-2xl font-bold text-mint">
              ↑ {improvement} 分
            </span>
            <span className="text-xs text-ink-muted">提升幅度</span>
          </div>
          <ProgressRing score={matchAfter} label="优化后" />
        </div>
      </Card>

      {/* JD 核心关键词命中情况（优化前 vs 优化后合并一张表） */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-ink">
            JD 核心关键词命中情况
          </h3>
          <span className="text-xs text-ink-muted">
            优化前 {beforeCount}/15 → 优化后 {afterCount}/15
          </span>
        </div>
        <div className="overflow-hidden rounded-lg border border-mint-light/60">
          {/* 表头 */}
          <div className="grid grid-cols-12 bg-mint-light/40 text-xs font-medium text-ink-muted">
            <div className="col-span-6 px-3 py-2">关键词</div>
            <div className="col-span-3 px-3 py-2 text-center">优化前</div>
            <div className="col-span-3 px-3 py-2 text-center">优化后</div>
          </div>
          {/* 表体 */}
          {afterHits.map((after, i) => {
            const before = beforeHits[i];
            const newlyHit = !before?.hit && after.hit; // 本次新命中的关键词
            return (
              <div
                key={i}
                className={`grid grid-cols-12 text-sm border-t border-mint-light/40 ${
                  newlyHit ? "bg-mint-light/30" : ""
                }`}
              >
                <div className="col-span-6 px-3 py-2 text-ink flex items-center gap-1.5">
                  {newlyHit && (
                    <span className="text-[10px] px-1 py-0.5 rounded bg-mint text-white">
                      新
                    </span>
                  )}
                  {after.keyword}
                </div>
                <div className="col-span-3 px-3 py-2 text-center">
                  <span className={before?.hit ? "text-mint" : "text-red-400"}>
                    {before?.hit ? "✓" : "✗"}
                  </span>
                </div>
                <div className="col-span-3 px-3 py-2 text-center">
                  <span className={after.hit ? "text-mint" : "text-red-400"}>
                    {after.hit ? "✓" : "✗"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 原始简历问题总结 + 核心优化方向 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-red-500 mb-3">
            原始简历问题总结
          </h3>
          <ol className="space-y-2">
            {optimizeResult.problemSummary.map((p, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm text-ink leading-relaxed"
              >
                <span className="text-red-400 shrink-0">{i + 1}.</span>
                <span>{p}</span>
              </li>
            ))}
          </ol>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-mint-dark mb-3">
            核心优化方向
          </h3>
          <ol className="space-y-2">
            {optimizeResult.optimizationDirections.map((d, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm text-ink leading-relaxed"
              >
                <span className="text-mint shrink-0">{i + 1}.</span>
                <span>{d}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
