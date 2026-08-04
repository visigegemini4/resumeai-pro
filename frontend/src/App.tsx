import { useApp } from "./data/AppContext";
import { HomePage } from "./pages/HomePage";
import { ScenarioPage } from "./pages/ScenarioPage";
import { ResultPage } from "./pages/ResultPage";

const STEPS: { key: "home" | "scenario" | "result"; label: string }[] = [
  { key: "home", label: "上传" },
  { key: "scenario", label: "情景" },
  { key: "result", label: "结果" },
];

function Stepper({ current }: { current: "home" | "scenario" | "result" }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-2 text-sm">
      {STEPS.map((s, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                active
                  ? "bg-mint text-white"
                  : done
                  ? "bg-mint-light text-mint-dark"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {done ? "✓" : i + 1}
            </div>
            <span
              className={
                active ? "text-mint-dark font-medium" : "text-ink-muted"
              }
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="text-gray-300 mx-1">—</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const { state } = useApp();

  return (
    <div className="min-h-full flex flex-col">
      {/* 顶部品牌信息 + 流程指示器 */}
      <header className="sticky top-0 z-10 bg-mint-bg/80 backdrop-blur border-b border-mint-light">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint text-white font-bold">
              R
            </div>
            <div>
              <h1 className="text-base font-semibold text-ink leading-tight">
                ResumeAI Pro 5.0
              </h1>
              <p className="text-xs text-ink-muted leading-tight">
                智能简历优化 · 面试准备 · 穿透 ATS
              </p>
            </div>
          </div>
          <Stepper current={state.step} />
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {state.step === "home" && <HomePage />}
        {state.step === "scenario" && <ScenarioPage />}
        {state.step === "result" && <ResultPage />}
      </main>

      <footer className="border-t border-mint-light py-4 text-center text-xs text-ink-muted">
        ResumeAI Pro 5.0 · 由您的 DeepSeek API Key 驱动 · Key 仅用于本次会话
      </footer>
    </div>
  );
}
