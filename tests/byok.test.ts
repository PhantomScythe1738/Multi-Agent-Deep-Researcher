import { describe, it, expect } from "vitest";
import { redactSecrets, maskKey } from "@/lib/ai/redact";

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
