import axios from "axios";
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

export interface HandlerRequest {
  method: string;
  path: string;
  body: any;
  query: Record<string, string>;
}

export interface HandlerResponse {
  statusCode: number;
  body: any;
}

export interface ParseRequestBody {
  fileUrl?: string;
  filename: string;
}

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

function json(statusCode: number, body: any): HandlerResponse {
  return { statusCode, body };
}

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

async function safe(fn: () => Promise<HandlerResponse>): Promise<HandlerResponse> {
  try {
    return await fn();
  } catch (err) {
    return errorToResponse(err);
  }
}

function truncate(text: string, max = 4000): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "\n...(内容已截断)" : text;
}

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

async function parse(req: HandlerRequest): Promise<HandlerResponse> {
  return safe(async () => {
    const { fileUrl, filename } = req.body as ParseRequestBody;
    if (!fileUrl || !filename) {
      return json(400, { error: "请上传文件" });
    }
    const resp = await axios.get(fileUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
      maxContentLength: 15 * 1024 * 1024,
    });
    const buffer = Buffer.from(resp.data);
    const result = await parseFile({ buffer, originalname: filename });
    return json(200, result);
  });
}

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
    const normalize = (m: OptimizeResult["matchBefore"]) => ({
      score: Math.round(Number(m?.score) || 0),
      level: getMatchLevel(Math.round(Number(m?.score) || 0)),
      keywordHits: Array.isArray(m?.keywordHits) ? m.keywordHits : [],
    });
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

async function compare(req: HandlerRequest): Promise<HandlerResponse> {
  return safe(async () => {
    const { apiKey, originalResume, optimizedResume, jd } =
      req.body as CompareRequest;
    if (!apiKey || !originalResume || !optimizedResume) {
      return json(400, { error: "缺少必要参数" });
    }
    const prompt = buildComparePrompt(
      truncate(originalResume, 1500),
      truncate(optimizedResume, 1500),
      truncate(jd, 600)
    );
    const result = await callDeepSeekJSON(apiKey, prompt, {
      temperature: 0.2,
      maxTokens: 2000,
    });
    const safeResult = {
      segments: Array.isArray((result as any)?.segments)
        ? (result as any).segments
        : [],
    };
    return json(200, safeResult);
  });
}

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
    const rawQuestions = Array.isArray(raw?.questions) ? raw.questions : [];
    const processedQuestions = rawQuestions.map((q: any) => {
      const question = q?.question || "";
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

function health(): HandlerResponse {
  return json(200, { status: "ok", version: "5.0.0" });
}

export async function handleRequest(req: HandlerRequest): Promise<HandlerResponse> {
  const { method, path } = req;

  if (method === "GET" && path === "/api/health") {
    return health();
  }

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
