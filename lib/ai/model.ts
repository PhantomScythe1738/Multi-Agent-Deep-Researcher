import "server-only";
import { ChatOpenRouter } from "@langchain/openrouter";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { serverEnv } from "@/lib/env";
import { LLM_TEMPERATURE, LLM_TIMEOUT_MS } from "@/lib/constants";

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
 * instruction-following models that were verified to return valid JSON.
 */
const FALLBACK_MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "tencent/hy3:free",
  "google/gemma-4-26b-a4b-it:free",
];

let cachedModel: ChatOpenRouter | null = null;

/** Single shared OpenRouter chat model (server-only). */
function getModel(): ChatOpenRouter {
  if (cachedModel) return cachedModel;
  const env = serverEnv();
  const primary = env.OPENROUTER_MODEL;
  // Ordered candidate list: primary first, then distinct fallbacks.
  const models = [primary, ...FALLBACK_MODELS.filter((m) => m !== primary)];
  cachedModel = new ChatOpenRouter({
    apiKey: env.OPENROUTER_API_KEY,
    model: primary,
    models,
    route: "fallback",
    temperature: LLM_TEMPERATURE,
    // Attribution headers (only sent when configured).
    siteUrl: env.OPENROUTER_SITE_URL,
    siteName: env.OPENROUTER_APP_NAME,
  });
  return cachedModel;
}

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

/** Production LlmClient backed by the shared OpenRouter model. */
export function createLlmClient(): LlmClient {
  return {
    async complete({ system, user, signal }) {
      const model = getModel();
      const res = await model.invoke([new SystemMessage(system), new HumanMessage(user)], {
        signal,
        timeout: LLM_TIMEOUT_MS,
      });
      return messageText(res.content);
    },
  };
}
