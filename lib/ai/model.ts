import "server-only";
import { ChatOpenRouter } from "@langchain/openrouter";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { serverEnv } from "@/lib/env";
import { LLM_TEMPERATURE, LLM_TIMEOUT_MS } from "@/lib/constants";

/** Minimal LLM interface so agents/graph can be tested without a live model. */
export interface LlmClient {
  complete(input: { system: string; user: string; signal?: AbortSignal }): Promise<string>;
}

let cachedModel: ChatOpenRouter | null = null;

/** Single shared OpenRouter chat model (server-only). */
function getModel(): ChatOpenRouter {
  if (cachedModel) return cachedModel;
  const env = serverEnv();
  cachedModel = new ChatOpenRouter({
    apiKey: env.OPENROUTER_API_KEY,
    model: env.OPENROUTER_MODEL,
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
