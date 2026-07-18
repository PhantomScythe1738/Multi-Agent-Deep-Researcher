import "server-only";
import { PdfReader } from "pdfreader";

interface PdfPage {
  page: number;
  text: string;
}

export interface PdfExtractResult {
  pages: PdfPage[];
  pageCount: number;
}

interface PositionedItem {
  x: number;
  y: number;
  text: string;
}

/**
 * Extract page-aware text from a text-based PDF buffer.
 *
 * Uses `pdfreader` (pure JS, no native bindings) so it runs on the Vercel
 * Node.js runtime. Items are grouped per page and reconstructed into lines by
 * sorting on (y, x). Scanned/image-only PDFs yield little or no text and are
 * rejected upstream.
 */
export function extractPdf(buffer: Buffer): Promise<PdfExtractResult> {
  return new Promise((resolve, reject) => {
    const itemsByPage = new Map<number, PositionedItem[]>();
    let currentPage = 0;

    new PdfReader().parseBuffer(buffer, (err, item) => {
      if (err) {
        reject(new Error(typeof err === "string" ? err : String(err)));
        return;
      }
      if (!item) {
        // End of file — reconstruct text per page.
        const pages: PdfPage[] = [];
        const sortedPageNumbers = [...itemsByPage.keys()].sort((a, b) => a - b);
        for (const pageNum of sortedPageNumbers) {
          const items = itemsByPage.get(pageNum) ?? [];
          pages.push({ page: pageNum, text: reconstructText(items) });
        }
        resolve({ pages, pageCount: pages.length });
        return;
      }
      if (item.page !== undefined) {
        currentPage = item.page;
        if (!itemsByPage.has(currentPage)) itemsByPage.set(currentPage, []);
        return;
      }
      if (item.text !== undefined) {
        const bucket = itemsByPage.get(currentPage) ?? [];
        bucket.push({ x: item.x ?? 0, y: item.y ?? 0, text: item.text });
        itemsByPage.set(currentPage, bucket);
      }
    });
  });
}

/** Group items into lines by rounded y-coordinate, then join left-to-right. */
function reconstructText(items: PositionedItem[]): string {
  if (items.length === 0) return "";
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: string[] = [];
  let currentY = sorted[0].y;
  let currentLine: string[] = [];

  for (const item of sorted) {
    if (Math.abs(item.y - currentY) > 0.5) {
      lines.push(currentLine.join(" ").trim());
      currentLine = [];
      currentY = item.y;
    }
    currentLine.push(item.text);
  }
  if (currentLine.length > 0) lines.push(currentLine.join(" ").trim());

  return lines
    .join("\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
