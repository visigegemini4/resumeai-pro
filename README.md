# ResumeAI Pro 5.0

基于 DeepSeek AI 的智能简历优化系统，提供简历分析、岗位匹配、对比优化、面试准备一站式服务。

## ✨ 核心功能

- **AI 情景分析**：对比简历与 JD，从差异化竞争力、求职动机、量化成果三维度诊断缺口
- **岗位匹配**：提取 JD 15 个核心关键词，展示优化前后命中对比
- **简历优化**：基于 8 项核心规则（ATS 穿透、STAR 重构、量化强化等）全文重写
- **简历对比**：逐段 diff 对比，标注应用的优化规则和修改理由
- **简历中心**：标准简历格式卡片化呈现，支持一键复制
- **面试准备**：生成高频面试题 + 完整 STAR 结构回答 + 追问方向
- **流水线进度**：优化过程全屏进度展示，串行执行避免超时

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript 5 + Tailwind CSS 4 + Vite 6 |
| 后端 | Node.js 20 + Express 4 + TypeScript |
| AI | DeepSeek API |
| 部署 | 腾讯云开发 CloudBase（前端静态托管 + 后端云函数） |

## 📦 项目结构

```
.
├── frontend/          # 前端 React 应用
│   ├── src/
│   │   ├── components/   # 通用组件（Button、Card、ProgressOverlay 等）
│   │   ├── data/         # 状态管理（AppContext）+ API 封装 + 类型定义
│   │   ├── pages/        # 页面（Home、Scenario、Result）
│   │   ├── tabs/         # 结果页 Tab（Match、Compare、Resume、Interview）
│   │   └── utils/        # 工具函数
│   └── vite.config.ts
├── backend/           # 后端 Express 服务
│   └── src/
│       ├── deepseek.ts   # DeepSeek API 封装
│       ├── parser.ts     # 文件解析（PDF/TXT/MD）
│       ├── prompts.ts    # AI Prompt 工程
│       ├── router.ts     # 路由与业务逻辑
│       └── server.ts     # Express 服务器
├── cloudbase/         # 腾讯云开发云函数
│   ├── main.ts          # 云函数入口
│   └── build.mjs        # 打包脚本
└── cloudbaserc.json   # CloudBase 部署配置
```

## 🚀 本地开发

### 环境要求

- Node.js 20+
- npm 或 pnpm
- DeepSeek API Key（[获取地址](https://platform.deepseek.com/)）

### 启动步骤

1. **安装依赖**

```bash
# 根目录安装共享依赖
npm install

# 前端
cd frontend && npm install

# 后端
cd ../backend && npm install
```

2. **启动后端**（端口 3000）

```bash
cd backend
npm run dev
```

3. **启动前端**（端口 5173）

```bash
cd frontend
npm run dev
```

4. 访问 `http://localhost:5173`，在首页输入 DeepSeek API Key 即可使用

### 环境变量

参考各目录下的 `.env.example`：

- `backend/.env.example`：`PORT`、`CORS_ORIGIN`
- `frontend/.env.example`：`VITE_API_URL`（生产环境后端地址）

## 📖 8 项核心优化规则

| 规则 | 说明 |
|------|------|
| RULE 01 | 关键词匹配：提取 JD 核心关键词，确保简历命中 |
| RULE 02 | STAR 原则重构：情境-任务-行动-结果，结构化叙述经历 |
| RULE 03 | 量化数据强化：模糊描述 → 具体数据 |
| RULE 04 | 动词升级：弱动词 → 强动词（如"负责"→"主导"） |
| RULE 05 | 胜任力呈现：突出核心胜任力，对齐岗位要求 |
| RULE 06 | 结构逻辑优化：优化信息呈现顺序，按匹配度排序 |
| RULE 07 | ATS 友好格式：兼容招聘系统解析，避免格式淘汰 |
| RULE 08 | 表述合规优化：去除主观冗余信息，替换为客观成果 |

## 🔒 安全说明

- API Key 仅存在于前端内存 state，不写 localStorage/Cookie
- API Key 通过请求参数传递给后端，调用结束即 GC，绝不持久化
- 后端日志严禁记录 API Key
- 部署配置中 envId 使用占位符，需手动替换

## 📄 License

[MIT](./LICENSE)
