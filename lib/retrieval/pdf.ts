import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { embedQuery, toVectorLiteral } from "@/lib/ai/embeddings";
import type { Database } from "@/lib/supabase/types";
import type { PdfEvidence } from "@/lib/retrieval/types";
import { MAX_PDF_MATCHES } from "@/lib/constants";

/**
 * Retrieve the most relevant PDF chunks for a question via pgvector cosine
 * similarity. The RPC is SECURITY INVOKER and filtered to auth.uid() + the
 * selected file ids, so only the caller's own chunks are ever returned.
 * Assigns stable P1..Pn citation keys in similarity order.
 */
export async function retrievePdfEvidence(
  supabase: SupabaseClient<Database>,
  question: string,
  fileIds: string[],
): Promise<PdfEvidence[]> {
  if (fileIds.length === 0) return [];

  const embedding = await embedQuery(supabase, question);

  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: toVectorLiteral(embedding),
    match_count: MAX_PDF_MATCHES,
    file_ids: fileIds,
  });

  if (error) {
    throw new Error(`PDF similarity search failed: ${error.message}`);
  }

  return (data ?? []).map((row, i) => {
    const metadata = (row.metadata ?? {}) as { fileName?: string };
    return {
      key: `P${i + 1}`,
      type: "pdf" as const,
      fileId: row.file_id,
      fileName: metadata.fileName ?? "Uploaded PDF",
      page: row.page_number,
      content: row.content,
      similarity: row.similarity,
      chunkIndex: row.chunk_index,
    };
  });
}
