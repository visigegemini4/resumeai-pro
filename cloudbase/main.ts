import { handleRequest, type HandlerRequest } from "../backend/src/router.js";

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
  const rawPath = event.path || "";
  let path = rawPath;
  const apiIdx = rawPath.indexOf("/api/");
  if (apiIdx >= 0) {
    path = rawPath.slice(apiIdx);
  } else if (!path.startsWith("/api")) {
    path = "/api" + (path.startsWith("/") ? path : "/" + path);
  }
  const qIdx = path.indexOf("?");
  if (qIdx >= 0) path = path.slice(0, qIdx);

  console.log("[main] rawPath:", rawPath, "| normalizedPath:", path, "| method:", event.httpMethod);

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

  if (handlerReq.method === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: "",
    };
  }

  const resp = await handleRequest(handlerReq);

  return {
    statusCode: resp.statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(),
    },
    body: JSON.stringify(resp.body),
  };
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}
