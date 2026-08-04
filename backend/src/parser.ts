import pdfParse from "pdf-parse";

const TEXT_EXTS = ["txt", "text", "md"];

export interface ParsedFile {
  text: string;
  filename: string;
  chars: number;
}

/**
 * 解析上传文件为纯文本。
 *
 * 云函数环境约束：tesseract.js 体积过大且依赖 native bindings，无法在
 * 腾讯云开发 CloudBase 云函数中运行，因此移除图片 OCR 能力。
 *
 * - PDF → pdf-parse（扫描版会失败，提示走文本输入）
 * - 图片 → 直接提示「请上传 PDF 或手动输入」（不再 OCR）
 * - txt/md → 直接 UTF-8 读取
 *
 * @param file.buffer   文件二进制内容
 * @param file.originalname 原始文件名（用于推断扩展名）
 */
export async function parseFile(file: {
  buffer: Buffer;
  originalname: string;
}): Promise<ParsedFile> {
  const ext = file.originalname.split(".").pop()?.toLowerCase() || "";

  let text: string;

  if (ext === "pdf") {
    try {
      const data = await pdfParse(file.buffer);
      text = data.text;
      if (!text || text.trim().length === 0) {
        throw new Error("文件可能为扫描版，请尝试上传 txt/md 文本格式或手动输入内容");
      }
    } catch (e: any) {
      // pdf-parse 对扫描版 PDF 会抛错或返回空文本
      if (e instanceof Error && e.message.includes("扫描版")) {
        throw e;
      }
      throw new Error("文件可能为扫描版，请尝试上传 txt/md 文本格式或手动输入内容");
    }
  } else if (TEXT_EXTS.includes(ext)) {
    text = file.buffer.toString("utf-8");
  } else {
    throw new Error("不支持的文件格式，请上传 PDF / txt / md 文件，或直接手动输入内容");
  }

  return {
    text,
    filename: file.originalname,
    chars: text.length,
  };
}
