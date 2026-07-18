import "server-only";
import { Document, SentenceSplitter } from "llamaindex";
import { extractPdf } from "@/lib/pdf/extract";
import {
  CHUNK_OVERLAP_TOKENS,
  CHUNK_SIZE_TOKENS,
  MAX_CHUNKS_PER_FILE,
  MAX_PDF_PAGES,
} from "@/lib/constants";

interface Chunk {
  chunkIndex: number;
  pageNumber: number;
  content: string;
  tokenCount: number;
}

export interface IngestResult {
  chunks: Chunk[];
  pageCount: number;
}

export class EmptyPdfError extends Error {
  constructor() {
    super("No extractable text found. Scanned or image-only PDFs are not supported.");
    this.name = "EmptyPdfError";
  }
}

/** Rough token estimate for metadata (≈4 chars/token). */
function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

/**
 * Extract, wrap into LlamaIndex Documents (one per page, page metadata
 * preserved), and split into sentence-aware chunks. Enforces page/chunk caps.
 * Throws EmptyPdfError when the PDF yields no usable text.
 */
export async function ingestPdf(buffer: Buffer, fileName: string): Promise<IngestResult> {
  const { pages, pageCount } = await extractPdf(buffer);

  const usablePages = pages.filter((p) => p.text.trim().length > 0).slice(0, MAX_PDF_PAGES);

  const totalText = usablePages.reduce((acc, p) => acc + p.text.trim().length, 0);
  if (usablePages.length === 0 || totalText < 20) {
    throw new EmptyPdfError();
  }

  const splitter = new SentenceSplitter({
    chunkSize: CHUNK_SIZE_TOKENS,
    chunkOverlap: CHUNK_OVERLAP_TOKENS,
  });

  const chunks: Chunk[] = [];
  let chunkIndex = 0;

  for (const page of usablePages) {
    if (chunks.length >= MAX_CHUNKS_PER_FILE) break;

    // LlamaIndex Document per page keeps page metadata attached to the source.
    const doc = new Document({
      text: page.text,
      metadata: { fileName, page: page.page },
    });

    const pieces = splitter.splitText(doc.text);
    for (const piece of pieces) {
      const content = piece.trim();
      if (content.length === 0) continue;
      if (chunks.length >= MAX_CHUNKS_PER_FILE) break;
      chunks.push({
        chunkIndex: chunkIndex++,
        pageNumber: page.page,
        content,
        tokenCount: estimateTokens(content),
      });
    }
  }

  if (chunks.length === 0) throw new EmptyPdfError();

  return { chunks, pageCount };
}
