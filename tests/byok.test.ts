import { describe, it, expect } from "vitest";
import { redactSecrets, maskKey } from "@/lib/ai/redact";

describe("redactSecrets", () => {
  it("redacts an OpenRouter key from error text", () => {
    const key = "sk-or-v1-REDACTED-TEST-FIXTURE";
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
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmno";
    expect(redactSecrets(`token=${jwt}`)).not.toContain(jwt);
  });

  it("leaves ordinary text untouched", () => {
    const msg = "Web search was unavailable; proceeding with available evidence.";
    expect(redactSecrets(msg)).toBe(msg);
  });
});

describe("maskKey", () => {
  it("shows only a prefix and suffix", () => {
    const key = "sk-or-v1-REDACTED-TEST-FIXTURE";
    const masked = maskKey(key);
    expect(masked.startsWith("sk-or-v1-0af")).toBe(true);
    expect(masked.endsWith("5d9f")).toBe(true);
    expect(masked).not.toContain(key.slice(20, 40));
  });

  it("fully masks short values", () => {
    expect(maskKey("short")).not.toContain("short");
  });
});
