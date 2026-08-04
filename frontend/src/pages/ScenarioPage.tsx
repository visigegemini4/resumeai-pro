import { useState } from "react";
import {
  useApp,
  extractErrorMessage,
  getQuestionsForRequest,
} from "../data/AppContext";
import { api } from "../data/api";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Skeleton } from "../components/Skeleton";
import { ProgressOverlay } from "../components/ProgressOverlay";

/**
 * 将诊断文本拆成要点列表。
 * 优先按换行拆；无换行则按中文句号/分号拆；过滤过短碎片。
 */
function splitDiagnosisToPoints(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  // 优先按换行拆
  let parts = trimmed.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  // 若换行拆完只有一段，则按句号/分号拆
  if (parts.length <= 1) {
    parts = trimmed
      .split(/[。；;]/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 4); // 过滤过短碎片
  }
  // 去除可能的前置序号（如 "1." "2、" "一、"）
  return parts.map((p) => p.replace(/^[\d一二三四五六七八九十]+[.、)]\s*/, "").trim()).filter(Boolean);
}

export function ScenarioPage() {
  const { state, dispatch } = useApp();
  const { scenario, loading, error, userInput, pipelineProgress } = state;
  const [confirmReanalyze, setConfirmReanalyze] = useState(false);
  const [touched, setTouched] = useState(false);

  const analyzeLoading = loading.analyze;
  // 流水线进行中：pipelineProgress 不为 null 表示正在执行优化流水线
  const pipelineRunning = pipelineProgress !== null;

  const answers = scenario?.questions || [];
  const allFilled = answers.length === 3 && answers.every((q) => (q.answer || "").trim().length > 0);

  const handleReanalyze = async () => {
    setConfirmReanalyze(false);
    dispatch({ type: "SET_LOADING", scope: "analyze", loading: true });
    dispatch({ type: "SET_ERROR", error: null });
    try {
      const newScenario = await api.analyze({
        apiKey: userInput.apiKey,
        resume: userInput.resumeText,
        jd: userInput.jdText,
      });
      dispatch({ type: "SET_SCENARIO", scenario: newScenario });
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        error: {
          scope: "analyze",
          message: extractErrorMessage(err, "分析失败，请重试"),
        },
      });
    } finally {
      dispatch({ type: "SET_LOADING", scope: "analyze", loading: false });
    }
  };

  /**
   * 优化流水线：串行执行 optimize → compare → interview
   * 每步通过 PIPELINE_UPDATE 更新进度，全部完成（无论成功/失败）后自动跳转到结果页。
   * 某步失败：标记 failed，跳过继续后续步骤；最终在对应 Tab 显示「重新生成」按钮。
   */
  const handleOptimize = async () => {
    if (!scenario) return;
    setTouched(true);
    if (!allFilled) return;

    // 初始化流水线进度（3 步全 pending），展示进度遮罩
    dispatch({ type: "PIPELINE_START" });
    dispatch({ type: "SET_ERROR", error: null });
    // 清空旧结果（重新优化场景）
    dispatch({ type: "SET_OPTIMIZE_RESULT", result: null as any });
    dispatch({ type: "SET_COMPARE_RESULT", result: null as any });
    dispatch({ type: "SET_INTERVIEW_RESULT", result: null as any });

    // ===== 步骤 1：简历优化 =====
    dispatch({ type: "PIPELINE_UPDATE", step: "optimize", status: "running" });
    let optimizedResume = "";
    try {
      const result = await api.optimize({
        apiKey: userInput.apiKey,
        resume: userInput.resumeText,
        jd: userInput.jdText,
        diagnosis: scenario.diagnosis,
        questions: getQuestionsForRequest(scenario),
      });
      dispatch({ type: "SET_OPTIMIZE_RESULT", result });
      optimizedResume = result.optimizedResume;
      dispatch({ type: "PIPELINE_UPDATE", step: "optimize", status: "success" });
    } catch (err) {
      const msg = extractErrorMessage(err, "优化失败");
      dispatch({
        type: "SET_ERROR",
        error: { scope: "optimize", message: msg },
      });
      dispatch({
        type: "PIPELINE_UPDATE",
        step: "optimize",
        status: "failed",
        error: msg,
      });
      // optimize 失败无法继续后续步骤（依赖 optimizedResume），直接结束
      dispatch({ type: "PIPELINE_UPDATE", step: "compare", status: "failed", error: "依赖优化结果，已跳过" });
      dispatch({ type: "PIPELINE_UPDATE", step: "interview", status: "failed", error: "依赖优化结果，已跳过" });
      // 短暂展示失败状态后跳转结果页（让用户看到错误）
      await sleep(1200);
      dispatch({ type: "SET_STEP", step: "result" });
      dispatch({ type: "PIPELINE_CLEAR" });
      return;
    }

    // ===== 步骤 2：简历对比 =====
    dispatch({ type: "PIPELINE_UPDATE", step: "compare", status: "running" });
    try {
      const result = await api.compare({
        apiKey: userInput.apiKey,
        originalResume: userInput.resumeText,
        optimizedResume,
        jd: userInput.jdText,
      });
      dispatch({ type: "SET_COMPARE_RESULT", result });
      dispatch({ type: "PIPELINE_UPDATE", step: "compare", status: "success" });
    } catch (err) {
      const msg = extractErrorMessage(err, "生成对比明细失败");
      dispatch({
        type: "SET_ERROR",
        error: { scope: "compare", message: msg },
      });
      dispatch({
        type: "PIPELINE_UPDATE",
        step: "compare",
        status: "failed",
        error: msg,
      });
      // compare 失败不阻塞 interview
    }

    // ===== 步骤 3：面试准备 =====
    dispatch({ type: "PIPELINE_UPDATE", step: "interview", status: "running" });
    try {
      const result = await api.interview({
        apiKey: userInput.apiKey,
        jd: userInput.jdText,
        optimizedResume,
        questions: getQuestionsForRequest(scenario),
      });
      dispatch({ type: "SET_INTERVIEW_RESULT", result });
      dispatch({ type: "PIPELINE_UPDATE", step: "interview", status: "success" });
    } catch (err) {
      const msg = extractErrorMessage(err, "生成面试准备文档失败");
      dispatch({
        type: "SET_ERROR",
        error: { scope: "interview", message: msg },
      });
      dispatch({
        type: "PIPELINE_UPDATE",
        step: "interview",
        status: "failed",
        error: msg,
      });
    }

    // ===== 全部完成，跳转结果页 =====
    await sleep(800);
    dispatch({ type: "SET_STEP", step: "result" });
    dispatch({ type: "PIPELINE_CLEAR" });
  };

  /** 工具：延时 */
  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 重新分析确认弹窗
  if (confirmReanalyze) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="p-6 text-center">
          <p className="text-base text-ink mb-4">
            重新分析将清空当前结果和已填写内容，确定继续？
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="secondary" onClick={() => setConfirmReanalyze(false)}>
              取消
            </Button>
            <Button onClick={handleReanalyze}>确定重新分析</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-ink">情景信息收集</h2>
        <p className="mt-1 text-sm text-ink-muted">
          补充信息以获得更精准的优化结果
        </p>
      </div>

      {/* AI 分析结果卡片 */}
      <Card className="p-5 bg-mint-light/40">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">💡</span>
          <span className="text-sm font-medium text-mint-dark">
            AI 分析结果
          </span>
        </div>
        {analyzeLoading ? (
          <Skeleton variant="analyze" />
        ) : scenario ? (
          (() => {
            const points = splitDiagnosisToPoints(scenario.diagnosis);
            return points.length > 0 ? (
              <ul className="space-y-2.5">
                {points.map((p, i) => (
                  <li
                    key={i}
                    className="flex gap-2.5 text-base text-mint-dark leading-relaxed"
                  >
                    <span className="shrink-0 mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-mint" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            ) : (
              // 容错：拆分后无内容，回退到纯文本展示
              <p className="text-base text-mint-dark leading-relaxed whitespace-pre-wrap">
                {scenario.diagnosis}
              </p>
            );
          })()
        ) : (
          <p className="text-sm text-ink-muted">
            {error?.scope === "analyze" ? error.message : "暂无分析结果"}
          </p>
        )}
      </Card>

      {/* 3 个必填信息收集字段 */}
      {analyzeLoading ? (
        <Card className="p-5">
          <Skeleton variant="generic" />
        </Card>
      ) : scenario ? (
        <Card className="p-5 space-y-5">
          {scenario.questions.map((q) => {
            const empty = !(q.answer || "").trim();
            const showError = touched && empty;
            return (
              <div key={q.id}>
                <label className="block mb-1.5 text-sm font-medium text-ink">
                  {q.label}
                  <span className="text-red-500 ml-1">必填</span>
                </label>
                <textarea
                  value={q.answer || ""}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_ANSWER",
                      id: q.id,
                      answer: e.target.value,
                    })
                  }
                  placeholder={q.placeholder}
                  className={`w-full h-24 px-3 py-2 rounded-lg border bg-white text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none focus:ring-2 focus:ring-mint/20 resize-y ${
                    showError
                      ? "border-red-400 focus:border-red-400"
                      : "border-mint-light focus:border-mint"
                  }`}
                />
                {showError && (
                  <p className="mt-1 text-xs text-red-500">请填写此项</p>
                )}
              </div>
            );
          })}
        </Card>
      ) : null}

      {/* 底部操作按钮 */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button
          variant="secondary"
          onClick={() => setConfirmReanalyze(true)}
          disabled={analyzeLoading || pipelineRunning}
        >
          重新分析
        </Button>
        <Button
          loading={pipelineRunning}
          disabled={analyzeLoading || !scenario || pipelineRunning}
          onClick={handleOptimize}
          className="px-10"
        >
          {pipelineRunning
            ? "AI 正在基于 8 项核心规则优化简历..."
            : "开始优化简历"}
        </Button>
      </div>

      {error?.scope === "optimize" && !pipelineRunning && (
        <p className="text-center text-sm text-red-500">{error.message}</p>
      )}

      {/* 优化流水线进度遮罩 */}
      {pipelineRunning && <ProgressOverlay />}
    </div>
  );
}
