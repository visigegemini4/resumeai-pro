// pdf-parse 无官方类型声明，此处补充最小声明
declare module "pdf-parse" {
  interface PdfData {
    text: string;
    numpages?: number;
    info?: Record<string, unknown>;
  }
  function pdfParse(buffer: Buffer): Promise<PdfData>;
  export default pdfParse;
}
