import type { DynamicQuestion } from "./types.js";

/** 8 项核心优化规则（逐字对齐 PRD 第 4 章） */
export const RULES = [
  "RULE 01 关键词匹配：提取 JD 核心关键词，确保简历命中",
  "RULE 02 STAR 原则重构：情境-任务-行动-结果，结构化叙述经历",
  "RULE 03 量化数据强化：模糊描述 → 具体数据",
  "RULE 04 动词升级：弱动词 → 强动词（如\"负责\"→\"主导\"）",
  "RULE 05 胜任力呈现：突出核心胜任力，对齐岗位要求",
  "RULE 06 结构逻辑优化：优化信息呈现顺序，按匹配度排序",
  "RULE 07 ATS 友好格式：兼容招聘系统解析，避免格式淘汰",
  "RULE 08 表述合规优化：去除主观冗余信息，替换为客观成果",
];

const RULES_BLOCK = RULES.map((r, i) => `${i + 1}. ${r}`).join("\n");

/**
 * 情景分析 Prompt（/api/analyze）- 精简版
 */
export function buildAnalyzePrompt(resume: string, jd: string): string {
  return `你是资深简历顾问。对比简历与JD，完成两项任务：

1. 缺口诊断（150-250字）：从差异化竞争力、求职动机、量化成果三个维度分析
2. 动态问题生成：基于信息缺口生成3个问题（label固定：换工作原因/核心优势/关键成就细节，placeholder针对本次JD）

输入：
简历：${resume}
JD：${jd}

严格输出 JSON：
{
  "diagnosis": "诊断文本",
  "questions": [
    {"id":"q1","label":"换工作原因","placeholder":"引导文案"},
    {"id":"q2","label":"核心优势","placeholder":"引导文案"},
    {"id":"q3","label":"关键成就细节","placeholder":"引导文案"}
  ]
}`;
}

/** 8 项核心规则（精简版，供 AI 快速参考） */
const RULES_COMPACT = `R01 关键词匹配：融入JD核心关键词
R02 STAR重构：情境-任务-行动-结果
R03 量化强化：模糊→具体数据
R04 动词升级：弱动词→强动词
R05 胜任力呈现：对齐岗位要求
R06 结构优化：按匹配度排序
R07 ATS友好：纯文本兼容格式
R08 表述合规：客观成果替代主观`;

/**
 * 简历优化 Prompt（/api/optimize）
 * 精简版：减少 AI 推理量，避免超时。
 * 单次调用产出 5 项：matchBefore + matchAfter + optimizedResume + problemSummary + optimizationDirections
 */
export function buildOptimizePrompt(
  resume: string,
  jd: string,
  diagnosis: string,
  questions: DynamicQuestion[]
): string {
  const q1 = questions.find((q) => q.id === "q1")?.answer || "未填写";
  const q2 = questions.find((q) => q.id === "q2")?.answer || "未填写";
  const q3 = questions.find((q) => q.id === "q3")?.answer || "未填写";

  return `你是 ATS 穿透简历优化专家。基于以下 8 项规则重写简历并评估匹配度：
${RULES_COMPACT}

【输入】
原始简历：
${resume}

JD：
${jd}

诊断：${diagnosis}
用户补充：换工作原因：${q1} | 核心优势：${q2} | 关键成就：${q3}

【任务】
1. 从 JD 提取 15 个核心关键词，检查原始简历和优化简历的命中情况
2. 按 8 项规则重写简历，关键词融入、STAR结构、量化数据、强动词、胜任力对齐、匹配度排序
3. 提取结构化数据（basic/education/experience/projects/skills）
4. 列出 3-5 个问题和 3-5 个优化方向

【输出】严格 JSON：
{
  "matchBefore": { "score": 45, "keywordHits": [{"keyword":"k1","hit":true}] },
  "matchAfter": { "score": 87, "keywordHits": [{"keyword":"k1","hit":true}] },
  "optimizedResume": "优化版简历纯文本全文",
  "structuredResume": {
    "basic": {"name":"","phone":"","email":"","location":""},
    "objective": "",
    "education": [{"period":"","school":"","major":"","degree":""}],
    "experience": [{"period":"","company":"","role":"","highlights":[""]}],
    "projects": [{"period":"","name":"","role":"","highlights":[""]}],
    "skills": [""]
  },
  "problemSummary": ["1.","2.","3."],
  "optimizationDirections": ["1.","2.","3."]
}
注意：matchBefore/after 的 keywordHits 必须各 15 条且关键词一一对应。optimizedResume 为完整简历文本。`;
}

/**
 * 简历对比 Prompt（/api/compare）
 * 逐段对齐 + appliedRules(RULE 01-08) + explanation
 * 为避免超时，限制最多 6 段，只聚焦关键修改。
 */
export function buildComparePrompt(
  originalResume: string,
  optimizedResume: string,
  jd: string
): string {
  return `你是一位简历优化专家。请对比原始简历与优化版简历的关键修改。

【任务】
1. 提取最重要的修改（最多 6 段，聚焦关键变化）
2. 每段标注应用的优化规则（引用 RULE 01-08）和修改理由

【可引用的优化规则】
${RULES_BLOCK}

【输入】
原始简历：
${originalResume}

优化版简历：
${optimizedResume}

JD（用于判断规则对齐）：
${jd}

【输出格式】严格输出 JSON，不要输出任何额外文本，segments 最多 6 条：
{
  "segments": [
    {
      "original": "原始段落内容",
      "optimized": "优化段落内容",
      "appliedRules": ["RULE 01 关键词匹配", "RULE 03 量化数据强化"],
      "explanation": "补充了交易链路、GMV 关键词，并将转化率量化为 3.2%→5.8%"
    }
  ]
}`;
}

/**
 * 面试准备 Prompt（/api/interview）
 * 精简版：生成 5-8 题，每题含完整回答（150-300字 STAR结构）
 */
export function buildInterviewPrompt(
  jd: string,
  optimizedResume: string,
  questions: DynamicQuestion[]
): string {
  const scenarioText = questions
    .map((q) => `- ${q.label}：${q.answer || "未填写"}`)
    .join("\n");

  return `你是资深面试官。基于 JD、优化版简历和用户信息，生成面试准备文档。

【任务】
1. 从 JD 提取核心能力要求
2. 生成 5-8 道高频面试题（覆盖技术/项目/团队/业务/动机）
3. 每题写完整回答：第一人称，150-300字，STAR结构，引用简历量化数据，自信专业
4. 每题配 2-3 个追问

【输入】
JD：${jd}
简历：${optimizedResume}
用户信息：${scenarioText}

【输出】严格 JSON：
{
  "questions": [
    {
      "question": "面试题",
      "answer": "完整回答（150-300字）",
      "followUps": ["追问1", "追问2"]
    }
  ]
}`;
}
