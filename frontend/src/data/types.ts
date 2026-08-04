// 前端全局类型定义（对齐技术文档 5.1，与后端 types.ts 镜像）

/** API Key 连接状态 */
export type ConnectionStatus = "idle" | "verifying" | "connected" | "failed";

/** 流程步骤 */
export type Step = "home" | "scenario" | "result";

/** 优化流水线步骤标识 */
export type PipelineStep =
  | "optimize" // 简历优化（产出 match + structuredResume）
  | "compare" // 简历对比
  | "interview"; // 面试准备

/** 单个流水线步骤的状态 */
export type PipelineStepStatus = "pending" | "running" | "success" | "failed";

/** 流水线步骤进度项 */
export interface PipelineProgressItem {
  step: PipelineStep;
  label: string; // 展示名称（如"简历优化"）
  status: PipelineStepStatus;
  error?: string; // 失败时的错误信息
}

/** 流水线整体进度 */
export type PipelineProgress = PipelineProgressItem[] | null;

/** 用户输入 */
export interface UserInput {
  apiKey: string; // 仅内存，不持久化
  connectionStatus: ConnectionStatus;
  connectionError?: string;
  resumeText: string; // 解析后的简历文本（可编辑）
  resumeFilename?: string;
  jdText: string; // 解析后的 JD 文本（可编辑）
  jdFilename?: string;
}

/** AI 情景分析结果 */
export interface ScenarioAnalysis {
  diagnosis: string;
  questions: DynamicQuestion[];
}

export interface DynamicQuestion {
  id: string;
  label: string;
  placeholder: string;
  answer?: string;
}

/** 优化结果（/api/optimize 返回） */
export interface OptimizeResult {
  matchBefore: MatchScore;
  matchAfter: MatchScore;
  optimizedResume: string; // 纯文本简历（供对比/面试/复制）
  structuredResume: StructuredResume; // 结构化简历（供简历中心卡片化呈现）
  problemSummary: string[];
  optimizationDirections: string[];
}

/**
 * 结构化简历（标准简历格式）。
 * 前端按板块卡片化排版，呈现真实简历版式。
 */
export interface StructuredResume {
  basic: ResumeBasic;
  objective?: string;
  education: ResumeEducationItem[];
  experience: ResumeExperienceItem[];
  projects?: ResumeProjectItem[];
  skills?: string[];
}

export interface ResumeBasic {
  name: string;
  phone?: string;
  email?: string;
  location?: string;
}

export interface ResumeEducationItem {
  period: string;
  school: string;
  major: string;
  degree?: string;
}

export interface ResumeExperienceItem {
  period: string;
  company: string;
  role: string;
  highlights: string[];
}

export interface ResumeProjectItem {
  period: string;
  name: string;
  role?: string;
  highlights: string[];
}

export interface MatchScore {
  score: number;
  keywordHits: KeywordHit[];
  level: "high" | "medium" | "low";
}

export interface KeywordHit {
  keyword: string;
  hit: boolean;
}

/** 简历对比（/api/compare 返回） */
export interface CompareResult {
  segments: CompareSegment[];
}

export interface CompareSegment {
  original: string;
  optimized: string;
  appliedRules: string[];
  explanation: string;
}

/** 面试准备（/api/interview 返回） */
export interface InterviewResult {
  questions: InterviewQuestion[];
}

export interface InterviewQuestion {
  question: string;
  answer: string; // 完整实际回答（STAR 成段叙述）
  followUps: string[];
}

/** 全局状态 */
export interface AppState {
  step: Step;
  userInput: UserInput;
  scenario: ScenarioAnalysis | null;
  optimizeResult: OptimizeResult | null;
  compareResult: CompareResult | null;
  interviewResult: InterviewResult | null;
  loading: LoadingState;
  error: ErrorState | null;
  pipelineProgress: PipelineProgress; // 优化流水线进度（null 表示不在流水线中）
}

export interface LoadingState {
  analyze: boolean;
  optimize: boolean;
  compare: boolean;
  interview: boolean;
}

export interface ErrorState {
  scope: "analyze" | "optimize" | "compare" | "interview" | "key";
  message: string;
}

/** 解析文件接口返回 */
export interface ParsedFile {
  text: string;
  filename: string;
  chars: number;
}

/** 验证 Key 接口返回 */
export interface VerifyKeyResult {
  valid: boolean;
  error?: string;
}

// ===== 请求体类型 =====

export interface AnalyzeRequest {
  apiKey: string;
  resume: string;
  jd: string;
}

/** 请求中携带的问题（仅需 id/label/answer，无需 placeholder） */
export interface QuestionAnswer {
  id: string;
  label: string;
  answer?: string;
}
