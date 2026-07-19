/** Centralized limits and tunables. Documented safe bounds for free-tier use. */

// --- PDF upload / ingestion ---
export const MAX_PDFS = 2;
export const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB
export const PDF_MIME_TYPE = "application/pdf";
/** Processed pages are capped so ingestion stays within request limits. */
export const MAX_PDF_PAGES = 30;
/** Total chunks stored per file is capped to bound embedding work. */
export const MAX_CHUNKS_PER_FILE = 80;
/** ~400 tokens keeps chunks under gte-small's bounded input context (512). */
export const CHUNK_SIZE_TOKENS = 400;
export const CHUNK_OVERLAP_TOKENS = 50;

// --- Embeddings (Supabase gte-small) ---
export const EMBEDDING_DIM = 384;
/**
 * Max texts per embedding Edge Function request.
 *
 * The real constraint is CPU, not count — see EMBED_BATCH_MAX_CHARS. Measured
 * against Supabase's gte-small worker: ~5.6k chars/request succeeds while
 * ~7.9k fails with WORKER_RESOURCE_LIMIT (HTTP 546).
 */
export const EMBED_BATCH_MAX = 4;
/** Character budget per embedding request, with margin under the observed limit. */
export const EMBED_BATCH_MAX_CHARS = 4500;

// --- Web retrieval (Tavily) ---
export const MAX_WEB_QUERIES = 3;
export const MAX_RESULTS_PER_QUERY = 5;
export const TAVILY_TIMEOUT_MS = 12_000;
/**
 * Cap on web sources carried into the LLM prompts. Bounds prompt size so a run
 * completes well inside the Vercel Hobby 60s limit (measured: uncapped 15
 * sources pushed a run to ~58s; capped runs land far lower).
 */
export const MAX_WEB_SOURCES = 8;

// --- PDF retrieval (pgvector) ---
export const MAX_PDF_MATCHES = 8;

// --- LLM (OpenRouter) ---
export const LLM_TIMEOUT_MS = 30_000;
export const LLM_TEMPERATURE = 0.2;

// --- Research question input ---
export const MAX_QUESTION_LENGTH = 1000;
export const MIN_QUESTION_LENGTH = 8;

// --- Rate limiting (hackathon-simple) ---
export const RATE_LIMIT_MAX_RUNS = 10;
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
