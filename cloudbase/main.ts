import { handleRequest, type HandlerRequest } from "../backend/src/router.js";

/**
 * 腾讯云开发 CloudBase 云函数入口。
 *
 * 部署方式：由 esbuild 将本文件及其依赖（backend/src/*）打包为单文件
 * dist/index.js（CommonJS），上传至 CloudBase 云函数，handler 设为 `index.main`。
 *
 * HTTP 触发格式：CloudBase「云函数 HTTP 访问服务」将 /api/* 路由转发到本函数，
 * event 符合 SCF API Gateway HTTP 触发器规范（httpMethod / path / body /
 * queryStringParameters / isBase64Encoded）。
 *
 * 与 Express 适配器（backend/src/server.ts）共享 router.ts 的 handleRequest，
 * 业务逻辑完全一致。
 */

interface CloudBaseHttpEvent {
  httpMethod?: string;
  path?: string;
  queryStringParameters?: Record<string, string>;
  headers?: Record<string, string>;
  body?: string;
  isBase64Encoded?: boolean;
}

interface CloudBaseResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export async function main(event: CloudBaseHttpEvent): Promise<CloudBaseResponse> {
  // 规范化 path：取 /api/ 起始的片段（CloudBase 可能传入完整 URL 路径）
  const rawPath = event.path || "";
  const apiIdx = rawPath.indexOf("/api/");
  const path = apiIdx >= 0 ? rawPath.slice(apiIdx) : rawPath;

  // 解析请求体（base64 上传的文件已在 body.base64 中，此处只解析外层 JSON）
  let body: any = {};
  if (event.body) {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf-8")
      : event.body;
    try {
      body = JSON.parse(raw);
    } catch {
      body = {};
    }
  }

  const handlerReq: HandlerRequest = {
    method: (event.httpMethod || "POST").toUpperCase(),
    path,
    body,
    query: event.queryStringParameters || {},
  };

  const resp = await handleRequest(handlerReq);

  return {
    statusCode: resp.statusCode,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(resp.body),
  };
}
