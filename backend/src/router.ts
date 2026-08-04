import { callDeepSeekJSON, verifyDeepSeekKey } from "./deepseek.js";
import { parseFile } from "./parser.js";
import {
  buildAnalyzePrompt,
  buildComparePrompt,
  buildInterviewPrompt,
  buildOptimizePrompt,
} from "./prompts.js";
import {
  getMatchLevel,
  type AnalyzeRequest,
  type CompareRequest,
  type InterviewRequest,
  type InterviewResult,
  type OptimizeRequest,
  type OptimizeResult,
  type ScenarioAnalysis,
  type StructuredResume,
  type VerifyKeyRequest,
} from "./types.js";

/**
 * 路由共享层 —— Express（本地开发）与云函数（生产部署）共用同一套业务逻辑。
 *
 * 设计要点：
 * - 入参 HandlerRequest 是「已解析」的标准化请求（method/path/body/query），
 *   由各宿主适配器（Express / 云函数）负责从原始请求中提取。
 * - 出参 HandlerResponse 是「未序列化」的标准化响应，由宿主适配器负责序列化。
 *   body 既可以是对象（JSON）也可是字符串（纯文本）。
 * - 所有路由错误在此统一捕获并映射为 HTTP 状态码 + 面向用户的中文提示，
 *   错误信息绝不含 apiKey（与 deepseek.ts 的安全约束一致）。
 */

export interface HandlerRequest {
  method: string;
  path: string; // 形如 "/api/verify-key"
  body: any; // 已 JSON.parse 的请求体；GET 请求为 {}
  query: Record<string, string>;
}

export interface HandlerResponse {
  statusCode: number;
  body: any;
}

/** 解析接口的请求体：前端以 base64 JSON 上传，避免 multipart/form-data */
export interface ParseRequestBody {
  base64: string; // 文件二进制内容的 base64 编码
  filename: string; // 原始文件名（用于推断扩展名）
}

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

/** 构造 JSON 响应 */
function json(statusCode: number, body: any): HandlerResponse {
  return { statusCode, body };
}

/**
 * 将任意错误映射为标准化响应。
 * 区分 DeepSeek 错误码，错误信息不含 apiKey。
 */
export function errorToResponse(err: any): HandlerResponse {
  const status = err?.response?.status;
  if (status === 401) {
    return json(401, { error: "API Key 无效，请检查后重新输入" });
  }
  if (status === 402) {
    return json(402, { error: "API Key 余额不足，请充值后使用" });
  }
  if (err?.code === "ECONNABORTED" || err?.code === "ETIMEDOUT") {
    return json(504, { error: "请求超时，请重试" });
  }
  if (err?.code === "ENOTFOUND" || err?.code === "ECONNREFUSED") {
    return json(502, { error: "网络连接失败，请检查网络后重试" });
  }
  return json(500, { error: err?.message || "服务器错误，请重试" });
}

/** 包裹业务逻辑，统一错误处理 */
async function safe(fn: () => Promise<HandlerResponse>): Promise<HandlerResponse> {
  try {
    return await fn();
  } catch (err) {
    return errorToResponse(err);
  }
}

/**
 * 截断过长文本，避免 prompt 超长导致 DeepSeek 处理超时（网关 504）。
 * 简历/JD 超过阈值时截断并标注，保留前半部分核心内容。
 */
function truncate(text: string, max = 4000): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "\n...(内容已截断)" : text;
}

/** 1. 验证 API Key 有效性 */
async function verifyKey(req: HandlerRequest): Promise<HandlerResponse> {
  return safe(async () => {
    const { apiKey } = req.body as VerifyKeyRequest;
    if (!apiKey || !apiKey.startsWith("sk-")) {
      return json(200, { valid: false, error: "请输入有效的 DeepSeek API Key" });
    }
    const result = await verifyDeepSeekKey(apiKey);
    return json(200, result);
  });
}

/** 2. 解析上传文件为纯文本（base64 JSON 上传） */
async function parse(req: HandlerRequest): Promise<HandlerResponse> {
  return safe(async () => {
    const { base64, filename } = req.body as ParseRequestBody;
    if (!base64 || !filename) {
      return json(400, { error: "请上传文件" });
    }
    const buffer = Buffer.from(base64, "base64");
    const result = await parseFile({ buffer, originalname: filename });
    return json(200, result);
  });
}

/** 3. 情景分析：缺口诊断 + 3 动态问题 */
async function analyze(req: HandlerRequest): Promise<HandlerResponse> {
  return safe(async () => {
    const { apiKey, resume, jd } = req.body as AnalyzeRequest;
    if (!apiKey || !resume || !jd) {
      return json(400, { error: "缺少必要参数" });
    }
    const prompt = buildAnalyzePrompt(
      truncate(resume, 2000),
      truncate(jd, 1000)
    );
    const result = await callDeepSeekJSON<ScenarioAnalysis>(apiKey, prompt, {
      temperature: 0.4,
      maxTokens: 1500,
    });
    // 容错：确保 3 个问题 id 固定
    const fixedQuestions = ["q1", "q2", "q3"];
    if (!Array.isArray(result.questions) || result.questions.length < 3) {
      result.questions = fixedQuestions.map((id, i) => ({
        id,
        label: ["换工作原因", "核心优势", "关键成就细节"][i],
        placeholder: "请补充相关信息...",
      }));
    } else {
      result.questions = result.questions.slice(0, 3).map((q, i) => ({
        ...q,
        id: fixedQuestions[i],
        label: ["换工作原因", "核心优势", "关键成就细节"][i],
      }));
    }
    return json(200, result);
  });
}

/** 4. 简历优化：单次产出 6 项（核心引擎） */
async function optimize(req: HandlerRequest): Promise<HandlerResponse> {
  return safe(async () => {
    const { apiKey, resume, jd, diagnosis, questions } =
      req.body as OptimizeRequest;
    if (!apiKey || !resume || !jd) {
      return json(400, { error: "缺少必要参数" });
    }
    const prompt = buildOptimizePrompt(
      truncate(resume, 3000),
      truncate(jd, 1500),
      truncate(diagnosis || "", 500),
      questions || []
    );
    const raw = await callDeepSeekJSON<OptimizeResult>(apiKey, prompt, {
      temperature: 0.3,
      maxTokens: 4000,
    });
    // 后端补全 level（避免 AI 算错），并规范化 score
    const normalize = (m: OptimizeResult["matchBefore"]) => ({
      score: Math.round(Number(m?.score) || 0),
      level: getMatchLevel(Math.round(Number(m?.score) || 0)),
      keywordHits: Array.isArray(m?.keywordHits) ? m.keywordHits : [],
    });
    // structuredResume 容错：AI 偶发漏字段时回退到最小空结构
    const fallbackStructured: StructuredResume = {
      basic: { name: "" },
      education: [],
      experience: [],
    };
    const structured = raw.structuredResume
      ? {
          basic: raw.structuredResume.basic || fallbackStructured.basic,
          objective: raw.structuredResume.objective,
          education: Array.isArray(raw.structuredResume.education)
            ? raw.structuredResume.education
            : [],
          experience: Array.isArray(raw.structuredResume.experience)
            ? raw.structuredResume.experience
            : [],
          projects: Array.isArray(raw.structuredResume.projects)
            ? raw.structuredResume.projects
            : undefined,
          skills: Array.isArray(raw.structuredResume.skills)
            ? raw.structuredResume.skills
            : undefined,
        }
      : fallbackStructured;
    const result: OptimizeResult = {
      matchBefore: normalize(raw.matchBefore),
      matchAfter: normalize(raw.matchAfter),
      optimizedResume: raw.optimizedResume || "",
      structuredResume: structured,
      problemSummary: Array.isArray(raw.problemSummary) ? raw.problemSummary : [],
      optimizationDirections: Array.isArray(raw.optimizationDirections)
        ? raw.optimizationDirections
        : [],
    };
    return json(200, result);
  });
}

/** 5. 简历对比：逐段 diff + 规则标注 */
async function compare(req: HandlerRequest): Promise<HandlerResponse> {
  return safe(async () => {
    const { apiKey, originalResume, optimizedResume, jd } =
      req.body as CompareRequest;
    if (!apiKey || !originalResume || !optimizedResume) {
      return json(400, { error: "缺少必要参数" });
    }
    // 截断 + 简化 prompt + 限制 maxTokens，避免 DeepSeek 处理超时导致网关 504
    const prompt = buildComparePrompt(
      truncate(originalResume, 1500),
      truncate(optimizedResume, 1500),
      truncate(jd, 600)
    );
    const result = await callDeepSeekJSON(apiKey, prompt, {
      temperature: 0.2,
      maxTokens: 2000,
    });
    // 容错：确保 segments 数组结构正确
    const safeResult = {
      segments: Array.isArray((result as any)?.segments)
        ? (result as any).segments
        : [],
    };
    return json(200, safeResult);
  });
}

/** 6. 面试准备：完整实际回答 + 追问 */
async function interview(req: HandlerRequest): Promise<HandlerResponse> {
  return safe(async () => {
    const { apiKey, jd, optimizedResume, questions: scenarioQuestions } =
      req.body as InterviewRequest;
    if (!apiKey || !jd || !optimizedResume) {
      return json(400, { error: "缺少必要参数" });
    }
    const prompt = buildInterviewPrompt(
      truncate(jd, 1200),
      truncate(optimizedResume, 2500),
      scenarioQuestions || []
    );
    const raw = await callDeepSeekJSON<any>(apiKey, prompt, {
      temperature: 0.3,
      maxTokens: 3000,
    });
    // 容错：AI 可能返回 answerPoints（要点数组）而非 answer（完整回答）
    // 也可能 answer 为空字符串。需要健壮地提取/兜底生成回答。
    const rawQuestions = Array.isArray(raw?.questions) ? raw.questions : [];
    const processedQuestions = rawQuestions.map((q: any) => {
      const question = q?.question || "";
      // 依次尝试：answer → answerPoints(数组join) → answerPoints(字符串) → 空
      let answer = "";
      if (q?.answer && typeof q.answer === "string" && q.answer.trim()) {
        answer = q.answer.trim();
      } else if (q?.answerPoints) {
        answer = Array.isArray(q.answerPoints)
          ? q.answerPoints.filter(Boolean).join("\n")
          : String(q.answerPoints);
      }
      return {
        question,
        answer,
        followUps: Array.isArray(q?.followUps) ? q.followUps : [],
      };
    });

    // 二次兜底：如果有问题的 answer 为空，用简化 prompt 再调 AI 生成回答
    const emptyIdx = processedQuestions
      .map((q: { answer: string }, i: number) => (!q.answer ? i : -1))
      .filter((i: number) => i >= 0);

    if (emptyIdx.length > 0) {
      const questionsNeedingAnswers = emptyIdx.map(
        (i: number) => processedQuestions[i].question
      );
      const fallbackPrompt = `你是一位资深面试官。请为以下面试问题生成完整的求职者回答。
要求：以第一人称撰写，150-300字，STAR结构（情境→任务→行动→结果），语气自信专业。
基于以下简历内容回答：
${truncate(optimizedResume, 3000)}
JD关键要求：${truncate(jd, 800)}

面试问题：
${questionsNeedingAnswers.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")}

严格输出 JSON：
{
  "answers": ["回答1", "回答2", ...]
}`;
      try {
        const fallbackResult = await callDeepSeekJSON<any>(
          apiKey,
          fallbackPrompt,
          { temperature: 0.3 }
        );
        const fallbackAnswers = Array.isArray(fallbackResult?.answers)
          ? fallbackResult.answers
          : [];
        emptyIdx.forEach((idx: number, i: number) => {
          if (fallbackAnswers[i] && typeof fallbackAnswers[i] === "string") {
            processedQuestions[idx].answer = fallbackAnswers[i].trim();
          }
        });
      } catch {
        // 兜底也失败，用问题本身生成简短回答
        emptyIdx.forEach((idx: number) => {
          if (!processedQuestions[idx].answer) {
            processedQuestions[idx].answer =
              "根据我的经历和岗位要求，我相信自己在这个方面具备相关的经验和能力。" +
              "我在过往工作中积累了扎实的专业基础，并通过实际项目不断磨练了相关技能。" +
              "如果有机会加入，我期待能将这些经验和能力贡献到团队中。";
          }
        });
      }
    }

    const result: InterviewResult = { questions: processedQuestions };
    return json(200, result);
  });
}

/** 健康检查 */
function health(): HandlerResponse {
  return json(200, { status: "ok", version: "5.0.0" });
}

/**
 * 统一路由分发。Express 与云函数适配器均调用此函数。
 *
 * @returns 标准化响应；未匹配路由返回 404
 */
export async function handleRequest(req: HandlerRequest): Promise<HandlerResponse> {
  const { method, path } = req;

  // 健康检查
  if (method === "GET" && path === "/api/health") {
    return health();
  }

  // POST 路由表
  if (method === "POST") {
    switch (path) {
      case "/api/verify-key":
        return verifyKey(req);
      case "/api/parse":
        return parse(req);
      case "/api/analyze":
        return analyze(req);
      case "/api/optimize":
        return optimize(req);
      case "/api/compare":
        return compare(req);
      case "/api/interview":
        return interview(req);
    }
  }

  return json(404, { error: "Not found" });
}

export { JSON_HEADERS };
