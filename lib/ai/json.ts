import type { ZodType } from "zod";
import type { LlmClient } from "@/lib/ai/model";

/**
 * Best-effort extraction of a JSON value from free-form model output.
 * Handles ```json fences and surrounding prose by locating the outermost
 * object/array. Throws when nothing parseable is found. Pure.
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();

  // Strip a fenced block if present.
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : trimmed;

  const direct = tryParse(candidate);
  if (direct.ok) return direct.value;

  // Fall back to the outermost {...} or [...] span.
  const span = outermostSpan(candidate);
  if (span) {
    const parsed = tryParse(span);
    if (parsed.ok) return parsed.value;
  }

  throw new Error("No parseable JSON found in model output.");
}

function tryParse(s: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(s) };
  } catch {
    return { ok: false };
  }
}

function outermostSpan(s: string): string | null {
  const firstObj = s.indexOf("{");
  const firstArr = s.indexOf("[");
  const start =
    firstObj === -1 ? firstArr : firstArr === -1 ? firstObj : Math.min(firstObj, firstArr);
  if (start === -1) return null;
  const open = s[start];
  const close = open === "{" ? "}" : "]";
  const end = s.lastIndexOf(close);
  if (end <= start) return null;
  return s.slice(start, end + 1);
}

export type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Extract JSON and validate against a Zod schema. Pure. */
export function parseStructured<T>(schema: ZodType<T>, text: string): ParseResult<T> {
  let json: unknown;
  try {
    json = extractJson(text);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "JSON extraction failed" };
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    return { ok: false, error: `Schema validation failed: ${issues}` };
  }
  return { ok: true, data: result.data };
}

export class StructuredOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StructuredOutputError";
  }
}

/**
 * Call the LLM and parse structured JSON, allowing exactly ONE repair attempt.
 * On repeated failure throws StructuredOutputError (never silently casts).
 */
export async function generateStructured<T>(
  llm: LlmClient,
  opts: { system: string; user: string; schema: ZodType<T>; signal?: AbortSignal },
): Promise<T> {
  const first = await llm.complete({ system: opts.system, user: opts.user, signal: opts.signal });
  const parsed = parseStructured(opts.schema, first);
  if (parsed.ok) return parsed.data;

  // Single repair attempt: show the model its own output and the error.
  const repairUser =
    `Your previous response could not be parsed as valid JSON matching the required schema.\n` +
    `Error: ${parsed.error}\n\n` +
    `Previous response:\n${first}\n\n` +
    `Return ONLY corrected, valid JSON. No prose, no code fences.`;

  const second = await llm.complete({
    system: opts.system,
    user: repairUser,
    signal: opts.signal,
  });
  const reparsed = parseStructured(opts.schema, second);
  if (reparsed.ok) return reparsed.data;

  throw new StructuredOutputError(reparsed.error);
}
