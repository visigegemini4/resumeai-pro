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
import { uploadFileAndGetUrl } from "./cloudbase-client";

const baseURL = import.meta.env.VITE_API_URL || "";

const client = axios.create({
  baseURL,
  timeout: 120000, // 与 Vite proxy timeout 一致，避免短于代理超时
});

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 去掉 data:application/pdf;base64, 前缀
      const commaIdx = result.indexOf(",");
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(reader.error || new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}

export const api = {
  async verifyKey(apiKey: string): Promise<VerifyKeyResult> {
    const { data } = await client.post<VerifyKeyResult>("/api/verify-key", {
      apiKey,
    });
    return data;
  },

  async parse(file: File): Promise<ParsedFile> {
    if (file.size > MAX_FILE_SIZE) {
      const mb = (file.size / 1024 / 1024).toFixed(2);
      throw new Error(`文件过大（${mb}MB），请上传不超过 10MB 的文件`);
    }

    // 环境判定：仅在 CloudBase 静态托管域名下使用云存储上传；
    // 其它环境（本地 dev、预览沙箱、自定义域名但 SDK 不可达）直接走 base64，
    // 避免 CloudBase SDK 发起匿名鉴权请求被沙箱/防火墙拦截导致控制台 net::ERR_FAILED。
    const host = (typeof window !== "undefined" && window.location?.hostname) || "";
    const isCloudBaseHosted =
      host.endsWith(".tcloudbaseapp.com") ||
      host.includes("cloudbase") ||
      host.includes("tcb");

    if (isCloudBaseHosted) {
      try {
        const { fileUrl } = await uploadFileAndGetUrl(file);
        const { data } = await client.post<ParsedFile>("/api/parse", {
          fileUrl,
          filename: file.name,
        });
        return data;
      } catch (_uploadErr) {
        // 云端上传虽失败但仍可降级 base64（例如大文件、网络抖动）
      }
    }

    // 降级 / 默认：转 base64 直接传内容
    const content = await fileToBase64(file);
    const { data } = await client.post<ParsedFile>("/api/parse", {
      content,
      filename: file.name,
    });
    return data;
  },

  async analyze(req: AnalyzeRequest): Promise<ScenarioAnalysis> {
    const { data } = await client.post<ScenarioAnalysis>("/api/analyze", req);
    return data;
  },

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

  async compare(req: {
    apiKey: string;
    originalResume: string;
    optimizedResume: string;
    jd: string;
  }): Promise<CompareResult> {
    const { data } = await client.post<CompareResult>("/api/compare", req);
    return data;
  },

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
