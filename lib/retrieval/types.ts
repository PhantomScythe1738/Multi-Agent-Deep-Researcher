/** Normalized evidence shared across retrieval, analysis, and reporting. */

export interface WebSource {
  key: string; // stable citation id, e.g. "W1"
  type: "web";
  title: string;
  url: string;
  excerpt: string;
  score: number | null;
  publishedDate: string | null;
}

export interface PdfEvidence {
  key: string; // stable citation id, e.g. "P1"
  type: "pdf";
  fileId: string;
  fileName: string;
  page: number | null;
  content: string;
  similarity: number;
  chunkIndex: number;
}

export type Evidence = WebSource | PdfEvidence;
