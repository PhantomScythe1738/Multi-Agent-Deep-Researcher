import "server-only";
import { ChatOpenRouter } from "@langchain/openrouter";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { serverEnv } from "@/lib/env";
import { LLM_TEMPERATURE, LLM_TIMEOUT_MS } from "@/lib/constants";
import { redactSecrets } from "@/lib/ai/redact";

/** Minimal LLM interface so agents/graph can be tested without a live model. */
export interface LlmClient {
  complete(input: { system: string; user: string; signal?: AbortSignal }): Promise<string>;
}

/**
 * Free-tier fallbacks used if the configured model is unavailable/rate-limited.
 *
 * NOTE: do not use the `openrouter/free` router here — it may route to a model
 * unsuited to structured output (we observed it selecting a content-safety
 * classifier that replied "User Safety: safe" instead of JSON). Pin general
 * instruction-following models verified to return valid JSON.
 */
const FALLBACK_MODELS = [
  "tencent/hy3:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-26b-a4b-it:free",
];

function messageText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === "string"
          ? part
          : part && typeof part === "object" && "text" in part
            ? String((part as { text: unknown }).text)
            : "",
      )
      .join("");
  }
  return "";
}

/**
 * Build an LlmClient for ONE user's OpenRouter key (BYOK).
 *
 * The key is supplied per request and held only for the lifetime of that
 * request. It is never cached across users, never persisted, and never logged —
 * any error text is passed through `redactSecrets` before it can surface.
 */
export function createLlmClient(apiKey: string): LlmClient {
  if (!apiKey) {
    throw new Error("An OpenRouter API key is required.");
  }
  const env = serverEnv();
  const primary = env.OPENROUTER_MODEL;
  const models = [primary, ...FALLBACK_MODELS.filter((m) => m !== primary)];

  // Constructed per request: never shared between users.
  const model = new ChatOpenRouter({
    apiKey,
    model: primary,
    models,
    route: "fallback",
    temperature: LLM_TEMPERATURE,
    siteUrl: env.OPENROUTER_SITE_URL,
    siteName: env.OPENROUTER_APP_NAME,
  });

  return {
    async complete({ system, user, signal }) {
      try {
        const res = await model.invoke([new SystemMessage(system), new HumanMessage(user)], {
          signal,
          timeout: LLM_TIMEOUT_MS,
        });
        return messageText(res.content);
      } catch (err) {
        // Never let a provider error echo the key back to the client/logs.
        throw new Error(redactSecrets(err instanceof Error ? err.message : "LLM request failed"));
      }
    },
  };
}
