import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EMBEDDING_DIM } from "@/lib/constants";
import { buildEmbedBatches } from "@/lib/ai/embed-batching";
import type { Database } from "@/lib/supabase/types";

interface EmbedResponse {
  embeddings: number[][];
  dim: number;
  count: number;
}

/** Invoke the Edge Function for one batch, surfacing a useful error. */
async function embedBatch(
  supabase: SupabaseClient<Database>,
  batch: string[],
): Promise<number[][]> {
  const { data, error } = await supabase.functions.invoke<EmbedResponse>("embed", {
    body: { texts: batch },
  });

  if (error) {
    throw new Error(
      `Edge Function 'embed' failed for ${batch.length} text(s) ` +
        `(${batch.reduce((s, t) => s + t.length, 0)} chars): ${error.message}`,
    );
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
  return data.embeddings;
}

/**
 * Embed a batch, halving and retrying if the worker runs out of compute.
 * Guarantees progress: a single text that still fails propagates the error.
 */
async function embedBatchAdaptive(
  supabase: SupabaseClient<Database>,
  batch: string[],
): Promise<number[][]> {
  try {
    return await embedBatch(supabase, batch);
  } catch (err) {
    if (batch.length === 1) throw err;
    const mid = Math.ceil(batch.length / 2);
    const left = await embedBatchAdaptive(supabase, batch.slice(0, mid));
    const right = await embedBatchAdaptive(supabase, batch.slice(mid));
    return [...left, ...right];
  }
}

/**
 * Generate normalized gte-small embeddings via the `embed` Edge Function.
 * Batches by character budget and validates the returned dimension.
 * The provided client must carry the caller's auth session (Edge Fn verifies JWT).
 */
export async function embedTexts(
  supabase: SupabaseClient<Database>,
  texts: string[],
): Promise<number[][]> {
  const all: number[][] = [];
  for (const batch of buildEmbedBatches(texts)) {
    all.push(...(await embedBatchAdaptive(supabase, batch)));
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
