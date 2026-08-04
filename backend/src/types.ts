// 后端共享类型定义（与前端 data/types.ts 镜像，作为接口契约）

/** AI 情景分析结果（/api/analyze 返回） */
export interface ScenarioAnalysis {
  diagnosis: string; // 缺口诊断文本（三维度）
  questions: DynamicQuestion[]; // 3 个动态生成的问题
}

export interface DynamicQuestion {
  id: string;
  label: string; // 「换工作原因」「核心优势」「关键成就细节」
  placeholder: string; // 动态引导文案
  answer?: string; // 用户填写内容（optimize 请求时携带）
}

/** 优化结果（/api/optimize 返回） */
export interface OptimizeResult {
  matchBefore: MatchScore; // 优化前匹配度
  matchAfter: MatchScore; // 优化后匹配度
  optimizedResume: string; // 优化版简历全文（纯文本，供对比/面试/复制使用）
  structuredResume: StructuredResume; // 优化版简历结构化数据（供简历中心卡片化呈现）
  problemSummary: string[]; // 原始简历问题（编号列表）
  optimizationDirections: string[]; // 核心优化方向（编号列表）
}

/**
 * 结构化简历（标准简历格式）。
 * AI 输出该结构，前端按板块卡片化排版，呈现真实简历版式。
 * optimizedResume 仍保留纯文本版本，用于对比接口输入和一键复制。
 */
export interface StructuredResume {
  basic: ResumeBasic;
  objective?: string; // 求职意向
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
  period: string; // 如 "2018.09-2022.06"
  school: string;
  major: string;
  degree?: string; // 如 "本科"
}

export interface ResumeExperienceItem {
  period: string; // 如 "2022.07-至今"
  company: string;
  role: string;
  highlights: string[]; // STAR 结构要点（含量化数据）
}

export interface ResumeProjectItem {
  period: string;
  name: string;
  role?: string;
  highlights: string[];
}

export interface MatchScore {
  score: number; // 0-100
  keywordHits: KeywordHit[]; // 关键词命中明细（固定 15 条）
  level: "high" | "medium" | "low"; // ≥80 / 50-79 / <50
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
  original: string; // 原始段落（删除线标注）
  optimized: string; // 优化段落（绿色高亮）
  appliedRules: string[]; // 应用的规则名（RULE 01-08）
  explanation: string; // 修改理由
}

/** 面试准备（/api/interview 返回） */
export interface InterviewResult {
  questions: InterviewQuestion[];
}

export interface InterviewQuestion {
  question: string; // 面试问题
  answer: string; // 完整实际回答（STAR 成段叙述，可直接念读）
  followUps: string[]; // 2-3 个追问方向
}

// ===== 请求体类型 =====

export interface VerifyKeyRequest {
  apiKey: string;
}

export interface AnalyzeRequest {
  apiKey: string;
  resume: string;
  jd: string;
}

export interface OptimizeRequest {
  apiKey: string;
  resume: string;
  jd: string;
  diagnosis: string;
  questions: DynamicQuestion[];
}

export interface CompareRequest {
  apiKey: string;
  originalResume: string;
  optimizedResume: string;
  jd: string;
}

export interface InterviewRequest {
  apiKey: string;
  jd: string;
  optimizedResume: string;
  questions: DynamicQuestion[];
}

/** 匹配度等级判定（与前端 utils/matchLevel.ts 一致） */
export function getMatchLevel(score: number): "high" | "medium" | "low" {
  if (score >= 80) return "high"; // 绿色「匹配度较高」
  if (score >= 50) return "medium"; // 黄色「匹配度中等」
  return "low"; // 红色「匹配度较低」
}
