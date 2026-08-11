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
  timeout: 90000,
});

const MAX_FILE_SIZE = 10 * 1024 * 1024;

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

    const { fileUrl } = await uploadFileAndGetUrl(file);

    const { data } = await client.post<ParsedFile>("/api/parse", {
      fileUrl,
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
