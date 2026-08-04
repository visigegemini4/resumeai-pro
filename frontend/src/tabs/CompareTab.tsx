import { useApp, extractErrorMessage } from "../data/AppContext";
import { api } from "../data/api";
import { Card } from "../components/Card";
import { Skeleton } from "../components/Skeleton";
import { ErrorCard } from "../components/ErrorCard";
import { Button } from "../components/Button";

/**
 * 简历对比：逐段 diff + 规则标注。
 *
 * 生成时机：由 ScenarioPage 在 optimize 完成后并行触发（与 interview 同时），
 * 本组件不再自动 useEffect 触发，仅负责展示 + 失败重试。
 */
export function CompareTab() {
  const { state, dispatch } = useApp();
  const { compareResult, loading, error, optimizeResult, userInput } = state;

  const fetchCompare = async () => {
    if (!optimizeResult) return;
    dispatch({ type: "SET_LOADING", scope: "compare", loading: true });
    dispatch({ type: "SET_ERROR", error: null });
    try {
      const result = await api.compare({
        apiKey: userInput.apiKey,
        originalResume: userInput.resumeText,
        optimizedResume: optimizeResult.optimizedResume,
        jd: userInput.jdText,
      });
      dispatch({ type: "SET_COMPARE_RESULT", result });
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        error: {
          scope: "compare",
          message: extractErrorMessage(err, "生成对比明细失败，请重试"),
        },
      });
    } finally {
      dispatch({ type: "SET_LOADING", scope: "compare", loading: false });
    }
  };

  if (loading.compare) {
    return (
      <Card className="p-6">
        <div className="text-center text-sm text-ink-muted mb-4">
          AI 正在生成对比明细...
        </div>
        <Skeleton variant="compare" />
      </Card>
    );
  }

  if (error?.scope === "compare") {
    return (
      <Card className="p-6">
        <ErrorCard message={error.message} onRetry={fetchCompare} />
      </Card>
    );
  }

  if (!compareResult) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-ink-muted mb-4">
          暂无对比明细
        </p>
        <Button onClick={fetchCompare} disabled={!optimizeResult}>
          重新生成
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {compareResult.segments.map((seg, i) => (
        <Card key={i} className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-ink-muted mb-1.5">
                原始简历
              </p>
              <p className="text-sm text-ink-muted line-through decoration-red-300/60 leading-relaxed">
                {seg.original}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-mint-dark mb-1.5">
                优化版简历
              </p>
              <p className="text-sm text-ink bg-mint-light/40 px-2 py-1 rounded leading-relaxed">
                {seg.optimized}
              </p>
            </div>
          </div>
          <div className="mt-3 p-3 rounded-lg bg-mint-bg border border-mint-light">
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {seg.appliedRules.map((r, j) => (
                <span
                  key={j}
                  className="inline-block px-2 py-0.5 rounded text-xs bg-mint-light text-mint-dark"
                >
                  {r}
                </span>
              ))}
            </div>
            <p className="text-xs text-ink-muted">{seg.explanation}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
