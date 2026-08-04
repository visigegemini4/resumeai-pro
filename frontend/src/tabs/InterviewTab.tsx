import {
  useApp,
  extractErrorMessage,
  getQuestionsForRequest,
} from "../data/AppContext";
import { api } from "../data/api";
import { Card } from "../components/Card";
import { Skeleton } from "../components/Skeleton";
import { ErrorCard } from "../components/ErrorCard";
import { CopyButton } from "../components/CopyButton";
import { Button } from "../components/Button";
import type { InterviewResult } from "../data/types";

/**
 * 面试准备：展示完整实际回答（非要点）。
 *
 * 生成时机：由 ScenarioPage 在 optimize 完成后并行触发（与 compare 同时），
 * 本组件不再自动 useEffect 触发，仅负责展示 + 失败重试。
 */
function buildCopyText(result: InterviewResult): string {
  return result.questions
    .map((q, i) => {
      const followUps = q.followUps.join(" ");
      return `Q${i + 1}: ${q.question}\n实际回答：${q.answer}\n可能追问：${followUps}`;
    })
    .join("\n\n");
}

export function InterviewTab() {
  const { state, dispatch } = useApp();
  const { interviewResult, loading, error, optimizeResult, scenario, userInput } =
    state;

  const fetchInterview = async () => {
    if (!optimizeResult) return;
    dispatch({ type: "SET_LOADING", scope: "interview", loading: true });
    dispatch({ type: "SET_ERROR", error: null });
    try {
      const result = await api.interview({
        apiKey: userInput.apiKey,
        jd: userInput.jdText,
        optimizedResume: optimizeResult.optimizedResume,
        questions: getQuestionsForRequest(scenario),
      });
      dispatch({ type: "SET_INTERVIEW_RESULT", result });
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        error: {
          scope: "interview",
          message: extractErrorMessage(err, "生成面试准备文档失败，请重试"),
        },
      });
    } finally {
      dispatch({ type: "SET_LOADING", scope: "interview", loading: false });
    }
  };

  if (loading.interview) {
    return (
      <Card className="p-6">
        <div className="text-center text-sm text-ink-muted mb-4">
          AI 正在生成面试准备文档...
        </div>
        <Skeleton variant="interview" />
      </Card>
    );
  }

  if (error?.scope === "interview") {
    return (
      <Card className="p-6">
        <ErrorCard message={error.message} onRetry={fetchInterview} />
      </Card>
    );
  }

  if (!interviewResult) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-ink-muted mb-4">
          暂无面试准备文档
        </p>
        <Button onClick={fetchInterview} disabled={!optimizeResult}>
          重新生成
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {interviewResult.questions.map((q, i) => (
        <Card key={i} className="p-5">
          <h4 className="text-sm font-semibold text-mint-dark mb-2">
            Q{i + 1}: {q.question}
          </h4>
          <div className="mb-3">
            <p className="text-xs font-medium text-ink-muted mb-1">
              实际回答
            </p>
            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
              {q.answer}
            </p>
          </div>
          {q.followUps.length > 0 && (
            <div>
              <p className="text-xs font-medium text-ink-muted mb-1">
                可能追问
              </p>
              <ul className="space-y-0.5">
                {q.followUps.map((f, j) => (
                  <li key={j} className="text-xs text-ink-muted">
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      ))}

      <div className="flex justify-center">
        <CopyButton content={buildCopyText(interviewResult)} />
      </div>
    </div>
  );
}
