import { useState } from "react";
import { copyToClipboard } from "../utils/clipboard";
import { Button } from "./Button";

interface CopyButtonProps {
  content: string;
  className?: string;
}

/** 一键复制按钮：成功后「已复制 ✓」2 秒回滚，失败提示手动复制 */
export function CopyButton({ content, className = "" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(content);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      alert("复制失败，请手动选中文本复制");
    }
  };

  return (
    <Button
      variant={copied ? "primary" : "secondary"}
      onClick={handleCopy}
      className={className}
    >
      {copied ? "已复制 ✓" : "一键复制"}
    </Button>
  );
}
