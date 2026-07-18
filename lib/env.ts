import { z } from "zod";

/**
 * Environment validation.
 *
 * Split into two layers so the app can boot for auth-only work before the
 * AI/search provider secrets are configured:
 *  - `publicEnv`  : NEXT_PUBLIC_* values, safe for the browser bundle.
 *  - `serverEnv()`: secret-bearing values, validated lazily and only on the
 *                   server the first time a feature that needs them runs.
 *
 * Never import `serverEnv` from a Client Component.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

type PublicEnv = z.infer<typeof publicSchema>;
let cachedPublicEnv: PublicEnv | null = null;

/** Validate and return NEXT_PUBLIC Supabase env. Cached after first call. */
export function publicEnv(): PublicEnv {
  if (cachedPublicEnv) return cachedPublicEnv;
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(
      `Missing/invalid public Supabase environment variables: ${missing}. ` +
        `Copy .env.example to .env.local and fill in the values.`,
    );
  }
  cachedPublicEnv = parsed.data;
  return cachedPublicEnv;
}

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENROUTER_API_KEY: z.string().min(1),
  OPENROUTER_MODEL: z.string().min(1).default("openrouter/free"),
  OPENROUTER_SITE_URL: z.string().url().optional(),
  OPENROUTER_APP_NAME: z.string().min(1).default("Multi-Agent AI Deep Researcher"),
  TAVILY_API_KEY: z.string().min(1),
  DEMO_SAFE_MODE: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
});

type ServerEnv = z.infer<typeof serverSchema>;
let cachedServerEnv: ServerEnv | null = null;

/** Validate and return secret-bearing server env. Throws with a safe message. */
export function serverEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;
  const parsed = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
    OPENROUTER_SITE_URL: process.env.OPENROUTER_SITE_URL,
    OPENROUTER_APP_NAME: process.env.OPENROUTER_APP_NAME,
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    DEMO_SAFE_MODE: process.env.DEMO_SAFE_MODE,
  });
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Missing/invalid server environment variables: ${missing}.`);
  }
  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

/** Whether Demo Safe Mode is enabled (defaults to true when unset). */
export function isDemoSafeMode(): boolean {
  return (process.env.DEMO_SAFE_MODE ?? "true") !== "false";
}
