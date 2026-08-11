import express from "express";
import cors from "cors";

import { handleRequest, type HandlerRequest } from "./router.js";

/**
 * 本地开发用的 Express 适配器。
 *
 * 生产环境部署在腾讯云开发 CloudBase 云函数（见 cloudbase/main.ts），
 * 不使用本文件。两者共享同一套业务逻辑（router.ts 的 handleRequest）。
 *
 * 文件上传已统一为 base64 JSON（前端 api.ts），故移除 multer 依赖，
 * Express 与云函数走完全相同的代码路径。
 */
const app = express();

// CORS：本地开发时前端 (:5173) 经 vite 代理访问后端 (:3000)，本质同源；
// 这里仍回显 Origin 以便直连调试。生产环境前后端同域名，无需 CORS。
app.use(
  cors({
    origin: true,
    credentials: false,
    maxAge: 86400,
  })
);

app.use(express.json({ limit: "10mb" }));

// 统一委派给共享路由层
app.all("/api/*", async (req, res) => {
  const start = Date.now();
  console.log(`→ ${req.method} ${req.path}`);
  const handlerReq: HandlerRequest = {
    method: req.method,
    path: req.path,
    body: req.body ?? {},
    query: req.query as Record<string, string>,
  };
  const resp = await handleRequest(handlerReq);
  const ms = Date.now() - start;
  console.log(`← ${req.method} ${req.path} ${resp.statusCode} (${ms}ms)`);
  res.status(resp.statusCode).json(resp.body);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ResumeAI Pro backend (dev) running on port ${PORT}`);
});
