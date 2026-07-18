/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
//
// embed — generate normalized gte-small embeddings for a bounded batch of texts.
//
// Runs on the Supabase Edge Runtime (Deno). JWT verification is enforced via
// supabase/config.toml ([functions.embed] verify_jwt = true), so only
// authenticated callers reach this function. Never logs document content.

interface EmbedRequest {
  texts?: unknown;
  text?: unknown;
}

const MAX_BATCH = 16;
const MAX_CHARS_PER_TEXT = 4000;

const session = new Supabase.ai.Session("gte-small");

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let payload: EmbedRequest;
  try {
    payload = (await req.json()) as EmbedRequest;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  // Accept either a single string or a bounded array of strings.
  let texts: string[];
  if (typeof payload.text === "string") {
    texts = [payload.text];
  } else if (Array.isArray(payload.texts)) {
    texts = payload.texts.filter((t): t is string => typeof t === "string");
  } else {
    return jsonResponse({ error: "Provide `text` (string) or `texts` (string[])" }, 400);
  }

  if (texts.length === 0) {
    return jsonResponse({ error: "No texts provided" }, 400);
  }
  if (texts.length > MAX_BATCH) {
    return jsonResponse({ error: `Too many texts (max ${MAX_BATCH})` }, 413);
  }
  if (texts.some((t) => t.length > MAX_CHARS_PER_TEXT)) {
    return jsonResponse({ error: `Text too long (max ${MAX_CHARS_PER_TEXT} chars)` }, 413);
  }

  try {
    const embeddings: number[][] = [];
    for (const text of texts) {
      // mean_pool + normalize => unit vectors suitable for cosine similarity.
      const embedding = (await session.run(text, {
        mean_pool: true,
        normalize: true,
      })) as number[];
      embeddings.push(embedding);
    }

    return jsonResponse({
      embeddings,
      dim: embeddings[0]?.length ?? 0,
      count: embeddings.length,
    });
  } catch (err) {
    console.error("embed: inference failed", err instanceof Error ? err.message : "unknown");
    return jsonResponse({ error: "Embedding generation failed" }, 500);
  }
});
