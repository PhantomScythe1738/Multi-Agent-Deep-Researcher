import "server-only";
import { redactSecrets } from "@/lib/ai/redact";

const OPENROUTER_KEY_URL = "https://openrouter.ai/api/v1/key";
const VALIDATE_TIMEOUT_MS = 10_000;

export interface KeyValidationResult {
  valid: boolean;
  /** Human-readable label OpenRouter reports for the key (already masked). */
  label?: string;
  /** Remaining credit, when OpenRouter reports a limit. null = no limit set. */
  creditRemaining?: number | null;
  isFreeTier?: boolean;
  /** Safe, user-facing reason when invalid. Never contains the key. */
  error?: string;
}

/** Shape of the OpenRouter key-introspection payload we rely on. */
interface OpenRouterKeyData {
  label?: string;
  limit_remaining?: number | null;
  is_free_tier?: boolean;
}

/**
 * Validate a user-supplied OpenRouter key by introspecting it against
 * OpenRouter. The key is used for this single request and never stored.
 */
export async function validateOpenRouterKey(apiKey: string): Promise<KeyValidationResult> {
  const key = apiKey.trim();
  if (!key) return { valid: false, error: "Enter your OpenRouter API key." };
  if (!key.startsWith("sk-or-")) {
    return { valid: false, error: "That doesn't look like an OpenRouter key (expected sk-or-…)." };
  }

  try {
    const res = await fetch(OPENROUTER_KEY_URL, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(VALIDATE_TIMEOUT_MS),
    });

    if (res.status === 401) {
      return {
        valid: false,
        error: "OpenRouter rejected this key. Check it was copied fully, or create a new one.",
      };
    }
    if (!res.ok) {
      return { valid: false, error: `OpenRouter returned an error (${res.status}). Try again.` };
    }

    const json = (await res.json()) as { data?: OpenRouterKeyData };
    const data = json.data ?? {};
    return {
      valid: true,
      label: data.label,
      creditRemaining: data.limit_remaining ?? null,
      isFreeTier: data.is_free_tier,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    if (message.includes("timeout") || message.includes("abort")) {
      return { valid: false, error: "OpenRouter timed out. Check your connection and try again." };
    }
    return { valid: false, error: redactSecrets(`Could not reach OpenRouter: ${message}`) };
  }
}
