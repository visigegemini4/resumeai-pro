import axios from "axios";
import type {
  AnalyzeRequest,
  CompareResult,
  InterviewResult,
  OptimizeResult,
  ParsedFile,
  ScenarioAnalysis,
  VerifyKeyResult,
} from "./types";

// baseURL：开发环境走 vite 代理（/api），生产环境用 VITE_API_URL
// CloudBase 部署时前后端同域名，baseURL 留空即可，零 CORS。
const baseURL = import.meta.env.VITE_API_URL || "";

const client = axios.create({
  baseURL,
  timeout: 90000, // 优化可能较久，统一 90s
});

/** 将 File 转为 base64 字符串（不含 data: 前缀） */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // FileReader 结果形如 "data:application/pdf;base64,XXXX"，取逗号后部分
      const commaIdx = result.indexOf(",");
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export const api = {
  /** 1. 验证 API Key */
  async verifyKey(apiKey: string): Promise<VerifyKeyResult> {
    const { data } = await client.post<VerifyKeyResult>("/api/verify-key", {
      apiKey,
    });
    return data;
  },

  /** 2. 解析上传文件（base64 JSON 上传，适配云函数环境，无需 multipart） */
  async parse(file: File): Promise<ParsedFile> {
    const base64 = await fileToBase64(file);
    const { data } = await client.post<ParsedFile>(
      "/api/parse",
      { base64, filename: file.name },
      { headers: { "Content-Type": "application/json" } }
    );
    return data;
  },

  /** 3. 情景分析 */
  async analyze(req: AnalyzeRequest): Promise<ScenarioAnalysis> {
    const { data } = await client.post<ScenarioAnalysis>("/api/analyze", req);
    return data;
  },

  /** 4. 简历优化（核心引擎） */
  async optimize(req: {
    apiKey: string;
    resume: string;
    jd: string;
    diagnosis: string;
    questions: { id: string; label: string; answer?: string }[];
  }): Promise<OptimizeResult> {
    const { data } = await client.post<OptimizeResult>("/api/optimize", req);
    return data;
  },

  /** 5. 简历对比 */
  async compare(req: {
    apiKey: string;
    originalResume: string;
    optimizedResume: string;
    jd: string;
  }): Promise<CompareResult> {
    const { data } = await client.post<CompareResult>("/api/compare", req);
    return data;
  },

  /** 6. 面试准备 */
  async interview(req: {
    apiKey: string;
    jd: string;
    optimizedResume: string;
    questions: { id: string; label: string; answer?: string }[];
  }): Promise<InterviewResult> {
    const { data } = await client.post<InterviewResult>(
      "/api/interview",
      req
    );
    return data;
  },
};
