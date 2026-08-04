import axios from "axios";

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";

/** DeepSeek 调用配置 */
export interface DeepSeekOptions {
  temperature?: number;
  jsonMode?: boolean; // 启用 response_format json_object
  maxTokens?: number;
}

/**
 * 转发 DeepSeek 请求。
 *
 * 安全约束（PRD 6.1 + 技术文档 2.1/10.4）：
 * - apiKey 仅作本次请求参数使用，调用结束即被 GC
 * - 严禁 console.log(apiKey) 或任何记录 Key 的行为
 * - 不缓存、不持久化、不写日志
 *
 * 错误透传：保留 axios error 的 response.status 供上层映射。
 */
export async function callDeepSeek(
  apiKey: string,
  prompt: string,
  options: DeepSeekOptions = {}
): Promise<string> {
  const {
    temperature = 0.3,
    jsonMode = false,
    maxTokens,
  } = options;

  // ⚠️ 禁止在此函数内记录 apiKey 到任何日志/缓存/文件
  const response = await axios.post(
    DEEPSEEK_URL,
    {
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    },
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 90000,
    }
  );
  return response.data.choices[0].message.content as string;
}

/**
 * 调用 DeepSeek 并解析为 JSON，带容错重试 1 次。
 * 失败时抛出 Error，由上层错误中间件捕获。
 */
export async function callDeepSeekJSON<T>(
  apiKey: string,
  prompt: string,
  options: DeepSeekOptions = {}
): Promise<T> {
  const raw = await callDeepSeek(apiKey, prompt, {
    ...options,
    jsonMode: true,
  });

  try {
    return JSON.parse(raw) as T;
  } catch {
    // 第一次解析失败，重试 1 次（AI 偶发在 JSON 前后输出多余文本）
    const retryRaw = await callDeepSeek(apiKey, prompt, {
      ...options,
      jsonMode: true,
    });
    try {
      return JSON.parse(retryRaw) as T;
    } catch {
      throw new Error("AI 输出格式异常，请重试");
    }
  }
}

/**
 * 验证 API Key 有效性：发送一条最简对话消息。
 * 返回 { valid, error }，error 为面向用户的中文提示。
 */
export async function verifyDeepSeekKey(
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    await callDeepSeek(apiKey, "hi", { maxTokens: 1, temperature: 0 });
    return { valid: true };
  } catch (err: any) {
    const status = err.response?.status;
    if (status === 401) {
      return { valid: false, error: "API Key 无效，请检查后重新输入" };
    }
    if (status === 402) {
      return { valid: false, error: "API Key 余额不足，请充值后使用" };
    }
    if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
      return { valid: false, error: "请求超时，请检查网络后重试" };
    }
    if (err.code === "ENOTFOUND" || err.code === "ECONNREFUSED") {
      return { valid: false, error: "网络连接失败，请检查网络后重试" };
    }
    return {
      valid: false,
      error: "DeepSeek API 暂时不可用，请稍后重试",
    };
  }
}
