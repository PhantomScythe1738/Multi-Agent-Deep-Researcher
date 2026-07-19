import { describe, it, expect } from "vitest";
import { redactSecrets, maskKey } from "@/lib/ai/redact";
import { buildEmbedBatches } from "@/lib/ai/embed-batching";

describe("redactSecrets", () => {
  it("redacts an OpenRouter key from error text", () => {
    const key = "sk-or-v1-" + "0".repeat(48) + "EXAMPLE";
    const out = redactSecrets(`Request failed with Authorization: Bearer ${key}`);
    expect(out).not.toContain(key);
    expect(out).toContain("[redacted]");
  });

  it("redacts Tavily and Supabase secrets", () => {
    const out = redactSecrets("tvly-dev-ABC123xyz_-0 and sb_secret_ABC123xyz_-0");
    expect(out).not.toMatch(/tvly-dev-ABC123/);
    expect(out).not.toMatch(/sb_secret_ABC123/);
  });

  it("redacts JWTs and bearer tokens", () => {
    const jwt = ["eyJ" + "X".repeat(20), "Y".repeat(20), "Z".repeat(16)].join(".");
    expect(redactSecrets(`token=${jwt}`)).not.toContain(jwt);
  });

  it("leaves ordinary text untouched", () => {
    const msg = "Web search was unavailable; proceeding with available evidence.";
    expect(redactSecrets(msg)).toBe(msg);
  });
});

describe("maskKey", () => {
  it("shows only a prefix and suffix", () => {
    const key = "sk-or-v1-" + "0".repeat(48) + "EXAMPLE";
    const masked = maskKey(key);
    expect(masked.startsWith(key.slice(0, 12))).toBe(true);
    expect(masked.endsWith(key.slice(-4))).toBe(true);
    // The middle of the key must never be shown.
    expect(masked).not.toContain(key.slice(12, -4));
    expect(masked).toContain("…");
  });

  it("fully masks short values", () => {
    expect(maskKey("short")).not.toContain("short");
  });
});

describe("buildEmbedBatches", () => {
  it("splits by character budget, not just count", () => {
    // 4 texts of 2000 chars = 8000 chars: must not land in one request.
    const texts = Array.from({ length: 4 }, () => "x".repeat(2000));
    const batches = buildEmbedBatches(texts, 4, 4500);
    expect(batches.length).toBeGreaterThan(1);
    for (const b of batches) {
      const chars = b.reduce((s, t) => s + t.length, 0);
      // A batch may exceed only when it holds a single oversized text.
      if (b.length > 1) expect(chars).toBeLessThanOrEqual(4500);
    }
  });

  it("respects the count cap for short texts", () => {
    const texts = Array.from({ length: 10 }, () => "short");
    const batches = buildEmbedBatches(texts, 4, 4500);
    expect(Math.max(...batches.map((b) => b.length))).toBeLessThanOrEqual(4);
  });

  it("gives a single oversized text its own batch and loses nothing", () => {
    const texts = ["a".repeat(9000), "b", "c"];
    const batches = buildEmbedBatches(texts, 4, 4500);
    expect(batches[0]).toEqual([texts[0]]);
    expect(batches.flat()).toEqual(texts);
  });

  it("returns no batches for no input", () => {
    expect(buildEmbedBatches([], 4, 4500)).toEqual([]);
  });
});
