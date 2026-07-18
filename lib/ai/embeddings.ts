import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EMBED_BATCH_MAX, EMBEDDING_DIM } from "@/lib/constants";
import type { Database } from "@/lib/supabase/types";

interface EmbedResponse {
  embeddings: number[][];
  dim: number;
  count: number;
}

/**
 * Generate normalized gte-small embeddings via the `embed` Edge Function.
 * Batches requests and validates the returned dimension matches the schema.
 * The provided client must carry the caller's auth session (Edge Fn verifies JWT).
 */
export async function embedTexts(
  supabase: SupabaseClient<Database>,
  texts: string[],
): Promise<number[][]> {
  const all: number[][] = [];

  for (let i = 0; i < texts.length; i += EMBED_BATCH_MAX) {
    const batch = texts.slice(i, i + EMBED_BATCH_MAX);
    const { data, error } = await supabase.functions.invoke<EmbedResponse>("embed", {
      body: { texts: batch },
    });

    if (error) {
      throw new Error(`Embedding request failed: ${error.message}`);
    }
    if (!data || !Array.isArray(data.embeddings) || data.embeddings.length !== batch.length) {
      throw new Error("Embedding response was malformed.");
    }
    for (const vec of data.embeddings) {
      if (!Array.isArray(vec) || vec.length !== EMBEDDING_DIM) {
        throw new Error(
          `Unexpected embedding dimension: got ${vec?.length}, expected ${EMBEDDING_DIM}.`,
        );
      }
    }
    all.push(...data.embeddings);
  }

  return all;
}

/** Generate a single embedding (e.g. for a query). */
export async function embedQuery(
  supabase: SupabaseClient<Database>,
  text: string,
): Promise<number[]> {
  const [vec] = await embedTexts(supabase, [text]);
  return vec;
}

/** pgvector wants a bracketed string literal, e.g. "[0.1,0.2,...]". */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
