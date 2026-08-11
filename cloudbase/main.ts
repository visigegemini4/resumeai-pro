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
  // 规范化 path：确保以 /api/ 开头
  // CloudBase HTTP 访问服务可能去掉 /api 前缀，只传入 /verify-key
  const rawPath = event.path || "";
  let path = rawPath;
  // 如果已经包含 /api/，取从 /api/ 开始的部分
  const apiIdx = rawPath.indexOf("/api/");
  if (apiIdx >= 0) {
    path = rawPath.slice(apiIdx);
  } else if (!path.startsWith("/api/")) {
    // CloudBase 去掉了 /api 前缀，补回来
    path = path.startsWith("/") ? "/api" + path : "/api/" + path;
  }

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
