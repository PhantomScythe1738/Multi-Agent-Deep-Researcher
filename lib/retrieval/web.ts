import { tavily } from "@tavily/core";
import { canonicalizeUrl } from "@/lib/retrieval/url";
import type { WebSource } from "@/lib/retrieval/types";
import { MAX_RESULTS_PER_QUERY, MAX_WEB_QUERIES, TAVILY_TIMEOUT_MS } from "@/lib/constants";

const MAX_EXCERPT_CHARS = 600;
const MAX_QUERY_CHARS = 400;

export interface RawWebResult {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
  publishedDate?: string | null;
}

/** Injectable search client so the graph can be tested without live Tavily. */
export interface WebSearchClient {
  search(query: string, signal?: AbortSignal): Promise<RawWebResult[]>;
}

/**
 * Normalize + de-duplicate raw web results into stable, cited WebSources.
 * Pure and deterministic: drops empties, canonicalizes URLs, keeps the first
 * occurrence of each canonical URL, then assigns W1..Wn in order.
 */
export function normalizeWebResults(raw: RawWebResult[]): WebSource[] {
  const seen = new Set<string>();
  const out: WebSource[] = [];

  for (const r of raw) {
    const url = (r.url ?? "").trim();
    const title = (r.title ?? "").trim();
    const content = (r.content ?? "").trim();
    if (!url || (!title && !content)) continue;

    const canonical = canonicalizeUrl(url);
    if (seen.has(canonical)) continue;
    seen.add(canonical);

    out.push({
      key: "", // assigned below
      type: "web",
      title: title || url,
      url,
      excerpt: content.slice(0, MAX_EXCERPT_CHARS),
      score: typeof r.score === "number" ? r.score : null,
      publishedDate: r.publishedDate ?? null,
    });
  }

  return out.map((s, i) => ({ ...s, key: `W${i + 1}` }));
}

async function searchOnce(
  client: WebSearchClient,
  query: string,
  signal: AbortSignal,
): Promise<RawWebResult[]> {
  const trimmed = query.trim().slice(0, MAX_QUERY_CHARS);
  if (!trimmed) return [];
  try {
    return await client.search(trimmed, signal);
  } catch (err) {
    // Retry once for transient/transport errors only. Do not retry aborts.
    if (signal.aborted) return [];
    const message = err instanceof Error ? err.message.toLowerCase() : "";
    const retryable =
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("econn") ||
      message.includes("503") ||
      message.includes("502");
    if (!retryable) return [];
    try {
      return await client.search(trimmed, signal);
    } catch {
      return [];
    }
  }
}

/**
 * Run up to MAX_WEB_QUERIES bounded Tavily searches concurrently and return
 * normalized, de-duplicated, cited sources. Degrades gracefully: a failed
 * query contributes no results rather than failing the whole retrieval.
 */
export async function searchWeb(
  client: WebSearchClient,
  queries: string[],
  parentSignal?: AbortSignal,
): Promise<WebSource[]> {
  const bounded = queries
    .map((q) => q.trim())
    .filter(Boolean)
    .slice(0, MAX_WEB_QUERIES);
  if (bounded.length === 0) return [];

  const results = await Promise.allSettled(
    bounded.map((q) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TAVILY_TIMEOUT_MS);
      const onParentAbort = () => controller.abort();
      parentSignal?.addEventListener("abort", onParentAbort, { once: true });
      return searchOnce(client, q, controller.signal).finally(() => {
        clearTimeout(timer);
        parentSignal?.removeEventListener("abort", onParentAbort);
      });
    }),
  );

  const raw: RawWebResult[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") raw.push(...r.value);
  }
  return normalizeWebResults(raw);
}

/** Tavily-backed WebSearchClient (basic search, bounded results). */
export function createTavilyClient(apiKey: string): WebSearchClient {
  const client = tavily({ apiKey });
  return {
    async search(query: string) {
      const res = await client.search(query, {
        searchDepth: "basic",
        maxResults: MAX_RESULTS_PER_QUERY,
      });
      return (res.results ?? []).map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
        publishedDate: (r as { publishedDate?: string | null }).publishedDate ?? null,
      }));
    },
  };
}
