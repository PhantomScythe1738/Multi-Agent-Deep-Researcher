import { EMBED_BATCH_MAX, EMBED_BATCH_MAX_CHARS } from "@/lib/constants";

/**
 * Group texts into request batches bounded by BOTH count and total characters.
 *
 * The character budget is the important one: the gte-small Edge Function is
 * CPU-bound, and real document chunks (~1-2k chars) exhaust the worker's
 * compute budget long before a count limit is reached. Measured on Supabase:
 * ~5.6k chars/request succeeds, ~7.9k fails with WORKER_RESOURCE_LIMIT (546).
 *
 * Pure and deterministic (kept out of the server-only module so it is testable).
 * A single oversized text still gets its own batch rather than being dropped.
 */
export function buildEmbedBatches(
  texts: string[],
  maxCount: number = EMBED_BATCH_MAX,
  maxChars: number = EMBED_BATCH_MAX_CHARS,
): string[][] {
  const batches: string[][] = [];
  let current: string[] = [];
  let chars = 0;

  for (const text of texts) {
    const len = text.length;
    const wouldExceed =
      current.length >= maxCount || (current.length > 0 && chars + len > maxChars);
    if (wouldExceed) {
      batches.push(current);
      current = [];
      chars = 0;
    }
    current.push(text);
    chars += len;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}
