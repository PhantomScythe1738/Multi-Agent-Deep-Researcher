/**
 * Redact anything that looks like a provider secret from free-form text.
 *
 * Defence-in-depth: provider SDKs sometimes echo request context into error
 * messages. Every error that can reach a client response or a server log is
 * passed through this first, so a user's BYOK key can never leak.
 */
const SECRET_PATTERNS: RegExp[] = [
  /sk-or-v1-[A-Za-z0-9]+/g, // OpenRouter
  /sk-[A-Za-z0-9]{20,}/g, // generic OpenAI-style
  /tvly-[A-Za-z0-9_-]+/g, // Tavily
  /sb_secret_[A-Za-z0-9_-]+/g, // Supabase secret
  /sb_publishable_[A-Za-z0-9_-]+/g, // Supabase publishable
  /sbp_[A-Za-z0-9]+/g, // Supabase access token
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+/g, // JWTs
  /Bearer\s+[A-Za-z0-9._-]{12,}/gi, // Authorization headers
];

export function redactSecrets(input: string): string {
  let out = input;
  for (const re of SECRET_PATTERNS) out = out.replace(re, "[redacted]");
  return out;
}

/** Mask a key for display, e.g. "sk-or-v1-4c8…2613". Never shows the middle. */
export function maskKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 12) return "•".repeat(Math.max(trimmed.length, 4));
  return `${trimmed.slice(0, 12)}…${trimmed.slice(-4)}`;
}
