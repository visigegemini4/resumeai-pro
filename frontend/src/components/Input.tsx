import { useState, type InputHTMLAttributes, type ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  hint?: ReactNode; // 输入框下方提示（如状态标签）
  suffix?: ReactNode; // 输入框右侧附加（如眼睛图标）
}

/** 文本输入框，支持 password 明密文切换 */
export function Input({
  label,
  required,
  hint,
  suffix,
  type = "text",
  className = "",
  ...rest
}: InputProps) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (visible ? "text" : "password") : type;

  return (
    <div className="w-full">
      {label && (
        <label className="block mb-1.5 text-sm font-medium text-ink">
          {label}
          {required && <span className="text-red-500 ml-1">必填</span>}
        </label>
      )}
      <div className="relative">
        <input
          type={inputType}
          className={`w-full px-4 py-2.5 rounded-lg border border-mint-light bg-white text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-mint focus:ring-2 focus:ring-mint/20 transition-all ${
            suffix ? "pr-12" : ""
          } ${className}`}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-mint transition-colors"
            tabIndex={-1}
            aria-label={visible ? "隐藏" : "显示"}
          >
            {visible ? "🙈" : "👁"}
          </button>
        )}
        {suffix && !isPassword && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {suffix}
          </div>
        )}
      </div>
      {hint && <div className="mt-1.5 text-sm">{hint}</div>}
    </div>
  );
}
