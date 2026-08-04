import { useState } from "react";
import { useApp } from "../data/AppContext";
import { MatchTab } from "../tabs/MatchTab";
import { CompareTab } from "../tabs/CompareTab";
import { ResumeTab } from "../tabs/ResumeTab";
import { InterviewTab } from "../tabs/InterviewTab";

type TabKey = "match" | "compare" | "resume" | "interview";

const TABS: { key: TabKey; label: string }[] = [
  { key: "match", label: "岗位匹配" },
  { key: "compare", label: "简历对比" },
  { key: "resume", label: "简历中心" },
  { key: "interview", label: "面试准备" },
];

export function ResultPage() {
  const { state } = useApp();
  const [active, setActive] = useState<TabKey>("match");
  const { optimizeResult, loading } = state;

  return (
    <div className="space-y-5">
      {/* 标题 + 状态徽章 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-ink">优化结果</h2>
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            loading.optimize
              ? "bg-mint-light text-mint-dark"
              : "bg-mint text-white"
          }`}
        >
          {loading.optimize ? (
            <>
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              AI 正在优化...
            </>
          ) : (
            <>✓ 优化完成</>
          )}
        </span>
      </div>

      {/* Tab 导航 */}
      <div className="flex gap-1 border-b border-mint-light overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              active === t.key
                ? "border-mint text-mint-dark"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      <div className="fade-in" key={active}>
        {active === "match" && <MatchTab />}
        {active === "compare" && <CompareTab />}
        {active === "resume" && <ResumeTab />}
        {active === "interview" && <InterviewTab />}
      </div>

      {/* 兜底：optimizeResult 缺失 */}
      {!optimizeResult && !loading.optimize && active !== "compare" && active !== "interview" && (
        <p className="text-center text-sm text-ink-muted py-8">
          暂无优化结果，请返回上一步重新优化
        </p>
      )}
    </div>
  );
}
