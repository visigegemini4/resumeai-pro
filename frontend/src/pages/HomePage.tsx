import { useEffect, useRef, useState } from "react";
import { useApp, extractErrorMessage } from "../data/AppContext";
import { api } from "../data/api";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Input } from "../components/Input";
import { Tag } from "../components/Tag";

const RULES_DISPLAY = [
  { no: "01", name: "关键词匹配", desc: "提取 JD 核心关键词，确保简历命中" },
  { no: "02", name: "STAR 原则重构", desc: "情境-任务-行动-结果，结构化叙述" },
  { no: "03", name: "量化数据强化", desc: "模糊描述 → 具体数据" },
  { no: "04", name: "动词升级", desc: "弱动词 → 强动词（负责→主导）" },
  { no: "05", name: "胜任力呈现", desc: "突出核心胜任力，对齐岗位要求" },
  { no: "06", name: "结构逻辑优化", desc: "优化信息呈现顺序，按匹配度排序" },
  { no: "07", name: "ATS 友好格式", desc: "兼容招聘系统解析，避免格式淘汰" },
  { no: "08", name: "表述合规优化", desc: "去除主观冗余，替换为客观成果" },
];

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.txt,.text,.md";

function UploadCard({
  title,
  icon,
  value,
  filename,
  onChange,
  onClear,
}: {
  title: string;
  icon: string;
  value: string;
  filename?: string;
  onChange: (text: string, filename?: string) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [dragging, setDragging] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [pasteHint, setPasteHint] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setParsing(true);
    setParseError(null);
    try {
      const result = await api.parse(file);
      onChange(result.text, result.filename);
    } catch (err) {
      setParseError(extractErrorMessage(err, "文件解析失败"));
    } finally {
      setParsing(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    setPasteHint(null);
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          onChange(text, filename ? filename : "粘贴文本.txt");
          setPasteHint(`已粘贴 ${text.length} 字符`);
          setTimeout(() => setPasteHint(null), 2500);
          textareaRef.current?.focus();
          return;
        }
        setPasteHint("剪贴板为空，请先复制简历内容");
      } else {
        setPasteHint("当前浏览器不支持自动粘贴，请点击下方文本框后按 Ctrl+V 粘贴");
        textareaRef.current?.focus();
      }
    } catch {
      setPasteHint("无法读取剪贴板，请点击下方文本框后按 Ctrl+V 粘贴");
      textareaRef.current?.focus();
    }
    setTimeout(() => setPasteHint(null), 4000);
  };

  const hasContent = value.trim().length > 0;

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mint-light text-base">
          {icon}
        </span>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
      </div>

      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={handlePasteFromClipboard}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-mint text-white text-xs font-medium hover:bg-mint-dark transition-colors"
        >
          <span>📋</span>
          <span>粘贴文本</span>
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-mint-light text-ink text-xs font-medium hover:border-mint hover:text-mint transition-colors"
        >
          <span>📤</span>
          <span>上传文件</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={`rounded-xl border-2 border-dashed p-3 text-center transition-colors ${
          dragging
            ? "border-mint bg-mint-light"
            : hasContent
            ? "border-mint border-solid bg-mint-light/40"
            : "border-mint-light bg-white"
        }`}
      >
        {parsing ? (
          <p className="text-sm text-mint-dark">解析中...</p>
        ) : hasContent ? (
          <div className="flex items-center justify-between gap-2">
            <div className="text-left min-w-0 flex-1">
              <p className="text-sm text-ink truncate">
                {filename || "已输入内容"}
              </p>
              <p className="text-xs text-ink-muted">{value.length} 字符</p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClear();
                setParseError(null);
                setPasteHint(null);
              }}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white border border-mint-light text-ink-muted hover:text-red-500"
              aria-label="清除"
            >
              ×
            </button>
          </div>
        ) : (
          <p className="text-xs text-ink-muted/70">
            也可拖拽文件到此处（支持 PDF / txt / md）
          </p>
        )}
      </div>

      {parseError && (
        <p className="mt-1.5 text-xs text-red-500">{parseError}</p>
      )}
      {pasteHint && (
        <p className="mt-1.5 text-xs text-mint-dark">{pasteHint}</p>
      )}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value, filename)}
        placeholder="可直接在此粘贴或手动输入简历 / JD 内容（推荐：先复制原文，再点上方「粘贴文本」按钮）"
        className="mt-2 w-full h-40 px-3 py-2 rounded-lg border border-mint-light bg-white text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-mint focus:ring-2 focus:ring-mint/20 resize-y"
      />
    </div>
  );
}

function ApiKeySection() {
  const { state, dispatch } = useApp();
  const { apiKey, connectionStatus, connectionError } = state.userInput;
  const verifying = connectionStatus === "verifying";
  const lastVerifiedKeyRef = useRef<string>("");

  const handleVerify = async (keyToVerify?: string) => {
    const key = (keyToVerify ?? apiKey).trim();
    if (!key) return;
    dispatch({ type: "SET_CONNECTION", status: "verifying" });
    try {
      const result = await api.verifyKey(key);
      dispatch({
        type: "SET_CONNECTION",
        status: result.valid ? "connected" : "failed",
        error: result.error,
      });
      if (result.valid) lastVerifiedKeyRef.current = key;
    } catch (err) {
      dispatch({
        type: "SET_CONNECTION",
        status: "failed",
        error: extractErrorMessage(err, "验证失败，请重试"),
      });
    }
  };

  useEffect(() => {
    const trimmed = apiKey.trim();
    if (
      trimmed.length >= 10 &&
      trimmed.startsWith("sk-") &&
      trimmed !== lastVerifiedKeyRef.current &&
      connectionStatus !== "verifying"
    ) {
      const timer = setTimeout(() => {
        handleVerify(trimmed);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [apiKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const statusHint = () => {
    if (verifying)
      return <Tag color="gray">正在验证 API Key...</Tag>;
    if (connectionStatus === "connected")
      return <Tag color="green">已连接</Tag>;
    if (connectionStatus === "failed" && connectionError)
      return <Tag color="red">连接失败 · {connectionError}</Tag>;
    return null;
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mint text-white text-sm">
          🔑
        </span>
        <h2 className="text-base font-semibold text-ink">
          DeepSeek API Key 配置
        </h2>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            type="password"
            placeholder="请输入您的 DeepSeek API Key（sk- 开头）"
            value={apiKey}
            onChange={(e) =>
              dispatch({ type: "SET_API_KEY", apiKey: e.target.value })
            }
            hint={statusHint()}
          />
        </div>
        <Button
          variant="secondary"
          loading={verifying}
          onClick={() => handleVerify()}
          disabled={!apiKey.trim()}
          className="sm:self-start mt-0.5"
        >
          验证连接
        </Button>
      </div>

      <p className="mt-2 text-xs text-ink-muted">
        您的 API Key 仅用于本次会话的模型调用，不会存储在服务器上（不写
        localStorage / Cookie，刷新页面后需重新输入）。
      </p>
    </Card>
  );
}

export function HomePage() {
  const { state, dispatch } = useApp();
  const { userInput, loading } = state;
  const connected = userInput.connectionStatus === "connected";
  const ready =
    connected &&
    userInput.resumeText.trim().length > 0 &&
    userInput.jdText.trim().length > 0;

  const analyzeRef = useRef<HTMLDivElement>(null);
  const [highlightKey, setHighlightKey] = useState(false);

  const ensureConnected = async (): Promise<boolean> => {
    if (connected) return true;
    if (!userInput.apiKey.trim()) {
      setHighlightKey(true);
      setTimeout(() => setHighlightKey(false), 1500);
      return false;
    }
    dispatch({ type: "SET_CONNECTION", status: "verifying" });
    try {
      const result = await api.verifyKey(userInput.apiKey.trim());
      dispatch({
        type: "SET_CONNECTION",
        status: result.valid ? "connected" : "failed",
        error: result.error,
      });
      return result.valid;
    } catch (err) {
      dispatch({
        type: "SET_CONNECTION",
        status: "failed",
        error: extractErrorMessage(err, "验证失败，请重试"),
      });
      return false;
    }
  };

  const handleAnalyze = async () => {
    if (!userInput.resumeText.trim() || !userInput.jdText.trim()) return;
    const ok = await ensureConnected();
    if (!ok) return;
    dispatch({ type: "SET_LOADING", scope: "analyze", loading: true });
    dispatch({ type: "SET_ERROR", error: null });
    try {
      const scenario = await api.analyze({
        apiKey: userInput.apiKey,
        resume: userInput.resumeText,
        jd: userInput.jdText,
      });
      dispatch({ type: "SET_SCENARIO", scenario });
      dispatch({ type: "SET_STEP", step: "scenario" });
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        error: {
          scope: "analyze",
          message: extractErrorMessage(err, "分析失败，请重试"),
        },
      });
    } finally {
      dispatch({ type: "SET_LOADING", scope: "analyze", loading: false });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-ink">
          上传简历与岗位要求，开启智能优化
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          输入 API Key → 上传简历 + JD → AI 分析信息缺口 → 8 规则优化 → 4 项产物交付
        </p>
      </div>

      <div className={highlightKey ? "ring-2 ring-red-400 rounded-xl" : ""}>
        <ApiKeySection />
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <UploadCard
            title="个人简历"
            icon="📄"
            value={userInput.resumeText}
            filename={userInput.resumeFilename}
            onChange={(text, filename) =>
              dispatch({ type: "SET_RESUME", text, filename })
            }
            onClear={() =>
              dispatch({ type: "SET_RESUME", text: "", filename: undefined })
            }
          />
          <UploadCard
            title="岗位要求 (JD)"
            icon="🎯"
            value={userInput.jdText}
            filename={userInput.jdFilename}
            onChange={(text, filename) =>
              dispatch({ type: "SET_JD", text, filename })
            }
            onClear={() =>
              dispatch({ type: "SET_JD", text: "", filename: undefined })
            }
          />
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-base font-semibold text-ink mb-3">
          8 项核心优化规则
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {RULES_DISPLAY.map((r) => (
            <div
              key={r.no}
              className="p-3 rounded-lg bg-mint-bg border border-mint-light"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs font-bold text-mint">
                  RULE {r.no}
                </span>
              </div>
              <p className="text-sm font-medium text-ink">{r.name}</p>
              <p className="text-xs text-ink-muted mt-0.5">{r.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      <div ref={analyzeRef} className="flex flex-col items-center gap-3">
        <Button
          loading={loading.analyze}
          disabled={!ready && !loading.analyze}
          onClick={handleAnalyze}
          className="px-10"
        >
          {loading.analyze
            ? "AI 正在分析简历与岗位的匹配缺口..."
            : "分析情景信息"}
        </Button>
        {state.error?.scope === "analyze" && (
          <p className="text-sm text-red-500">{state.error.message}</p>
        )}
        {!ready && !loading.analyze && (
          <p className="text-xs text-ink-muted">
            请先验证 API Key 并完成简历与 JD 的输入
          </p>
        )}
      </div>
    </div>
  );
}
