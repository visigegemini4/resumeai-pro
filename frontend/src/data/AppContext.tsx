import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
} from "react";
import type {
  AppState,
  CompareResult,
  ConnectionStatus,
  InterviewResult,
  OptimizeResult,
  PipelineProgress,
  PipelineStep,
  QuestionAnswer,
  ScenarioAnalysis,
  Step,
} from "./types";

// ===== 流水线步骤初始定义（label 固定） =====
const PIPELINE_STEPS: { step: PipelineStep; label: string }[] = [
  { step: "optimize", label: "简历优化" },
  { step: "compare", label: "简历对比" },
  { step: "interview", label: "面试准备" },
];

function createInitialPipeline(): PipelineProgress {
  return PIPELINE_STEPS.map((s) => ({
    step: s.step,
    label: s.label,
    status: "pending" as const,
  }));
}

// ===== 初始状态 =====
// 安全约束（PRD 6.1）：apiKey 仅存于此内存 state，不写 localStorage/Cookie
const initialState: AppState = {
  step: "home",
  userInput: {
    apiKey: "",
    connectionStatus: "idle",
    resumeText: "",
    jdText: "",
  },
  scenario: null,
  optimizeResult: null,
  compareResult: null,
  interviewResult: null,
  loading: { analyze: false, optimize: false, compare: false, interview: false },
  error: null,
  pipelineProgress: null,
};

// ===== Action 类型 =====
type Action =
  | { type: "SET_API_KEY"; apiKey: string }
  | {
      type: "SET_CONNECTION";
      status: ConnectionStatus;
      error?: string;
    }
  | { type: "SET_RESUME"; text: string; filename?: string }
  | { type: "SET_JD"; text: string; filename?: string }
  | { type: "SET_SCENARIO"; scenario: ScenarioAnalysis }
  | { type: "SET_ANSWER"; id: string; answer: string }
  | { type: "SET_OPTIMIZE_RESULT"; result: OptimizeResult }
  | { type: "SET_COMPARE_RESULT"; result: CompareResult }
  | { type: "SET_INTERVIEW_RESULT"; result: InterviewResult }
  | { type: "SET_STEP"; step: Step }
  | {
      type: "SET_LOADING";
      scope: "analyze" | "optimize" | "compare" | "interview";
      loading: boolean;
    }
  | {
      type: "SET_ERROR";
      error: { scope: "analyze" | "optimize" | "compare" | "interview" | "key"; message: string } | null;
    }
  | { type: "RESET_ANALYZE" } // 重新分析：清空 scenario，回到情景收集前
  | { type: "RESET_ALL" }
  // 流水线进度控制
  | { type: "PIPELINE_START" } // 初始化流水线（3 步全 pending）
  | {
      type: "PIPELINE_UPDATE";
      step: PipelineStep;
      status: "running" | "success" | "failed";
      error?: string;
    }
  | { type: "PIPELINE_CLEAR" }; // 流水线结束，清空进度

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_API_KEY":
      return {
        ...state,
        userInput: { ...state.userInput, apiKey: action.apiKey },
      };
    case "SET_CONNECTION":
      return {
        ...state,
        userInput: {
          ...state.userInput,
          connectionStatus: action.status,
          connectionError: action.error,
        },
      };
    case "SET_RESUME":
      return {
        ...state,
        userInput: {
          ...state.userInput,
          resumeText: action.text,
          resumeFilename: action.filename,
        },
      };
    case "SET_JD":
      return {
        ...state,
        userInput: {
          ...state.userInput,
          jdText: action.text,
          jdFilename: action.filename,
        },
      };
    case "SET_SCENARIO":
      return { ...state, scenario: action.scenario };
    case "SET_ANSWER":
      return {
        ...state,
        scenario: state.scenario
          ? {
              ...state.scenario,
              questions: state.scenario.questions.map((q) =>
                q.id === action.id ? { ...q, answer: action.answer } : q
              ),
            }
          : state.scenario,
      };
    case "SET_OPTIMIZE_RESULT":
      return { ...state, optimizeResult: action.result };
    case "SET_COMPARE_RESULT":
      return { ...state, compareResult: action.result };
    case "SET_INTERVIEW_RESULT":
      return { ...state, interviewResult: action.result };
    case "SET_STEP":
      return { ...state, step: action.step };
    case "SET_LOADING":
      return {
        ...state,
        loading: { ...state.loading, [action.scope]: action.loading },
      };
    case "SET_ERROR":
      return { ...state, error: action.error };
    case "RESET_ANALYZE":
      // 重新分析：清空情景与优化结果，回到情景分析前
      return {
        ...state,
        scenario: null,
        optimizeResult: null,
        compareResult: null,
        interviewResult: null,
        error: null,
      };
    case "RESET_ALL":
      return { ...initialState };
    case "PIPELINE_START":
      return { ...state, pipelineProgress: createInitialPipeline() };
    case "PIPELINE_UPDATE":
      return {
        ...state,
        pipelineProgress: state.pipelineProgress
          ? state.pipelineProgress.map((item) =>
              item.step === action.step
                ? {
                    ...item,
                    status: action.status,
                    error: action.error,
                  }
                : item
            )
          : state.pipelineProgress,
      };
    case "PIPELINE_CLEAR":
      return { ...state, pipelineProgress: null };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used within AppProvider");
  }
  return ctx;
}

/** 从 axios 错误中提取面向用户的消息 */
export function extractErrorMessage(err: unknown, fallback: string): string {
  const anyErr = err as any;
  return (
    anyErr?.response?.data?.error ||
    anyErr?.message ||
    fallback
  );
}

/** 获取优化请求用的 questions 数组（带 answer） */
export function getQuestionsForRequest(
  scenario: ScenarioAnalysis | null
): QuestionAnswer[] {
  if (!scenario) return [];
  return scenario.questions.map((q) => ({
    id: q.id,
    label: q.label,
    answer: q.answer || "",
  }));
}
