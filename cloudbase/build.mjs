import { build } from "esbuild";
import { writeFileSync, mkdirSync } from "node:fs";

/**
 * 云函数构建脚本：
 * 1. 用 esbuild 将 main.ts 及其全部依赖（含 backend/src/*、axios、pdf-parse）
 *    打包为单文件 CommonJS dist/index.js —— 完全自包含，云端无需安装依赖。
 * 2. 产出 dist/package.json，声明入口 index.js，供 CloudBase 识别为 Node 函数。
 *
 * 验证记录：pdf-parse inline 打包后，真实 PDF 解析行为与非打包版完全一致
 * （已用真实 PDF 通过云函数 main() 端到端验证）。
 */
mkdirSync("dist", { recursive: true });

await build({
  entryPoints: ["main.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node18",
  outfile: "dist/index.js",
  sourcemap: true,
  // pdf-parse 的 pdfjs-dist 体积较大但可正确打包；inline 后云端无需 node_modules。
  // 如遇冷启动过慢，可改用 --external:pdf-parse 并在云端安装依赖。
  logLevel: "info",
});

writeFileSync(
  "dist/package.json",
  JSON.stringify(
    {
      name: "resumeai-api",
      version: "5.0.0",
      main: "index.js",
      private: true,
    },
    null,
    2
  ) + "\n"
);

console.log("✓ dist/index.js + dist/package.json built (self-contained)");
