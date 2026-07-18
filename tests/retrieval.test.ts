import { describe, it, expect } from "vitest";
import { canonicalizeUrl } from "@/lib/retrieval/url";
import { normalizeWebResults, type RawWebResult } from "@/lib/retrieval/web";

describe("canonicalizeUrl", () => {
  it("lowercases host and strips fragment", () => {
    expect(canonicalizeUrl("https://Example.COM/Path#section")).toBe("https://example.com/Path");
  });

  it("removes tracking params but keeps meaningful ones", () => {
    expect(canonicalizeUrl("https://x.com/a?utm_source=news&id=5&fbclid=z")).toBe(
      "https://x.com/a?id=5",
    );
  });

  it("drops a trailing slash and default port", () => {
    expect(canonicalizeUrl("https://x.com:443/a/")).toBe("https://x.com/a");
  });

  it("treats tracking-only variants as the same canonical URL", () => {
    expect(canonicalizeUrl("https://x.com/a?utm_medium=cpc")).toBe(
      canonicalizeUrl("https://x.com/a"),
    );
  });

  it("returns the trimmed input for unparseable URLs", () => {
    expect(canonicalizeUrl("  not a url  ")).toBe("not a url");
  });
});

describe("normalizeWebResults", () => {
  it("assigns stable W1..Wn keys in order", () => {
    const raw: RawWebResult[] = [
      { title: "A", url: "https://a.com", content: "alpha" },
      { title: "B", url: "https://b.com", content: "beta" },
    ];
    const out = normalizeWebResults(raw);
    expect(out.map((s) => s.key)).toEqual(["W1", "W2"]);
  });

  it("de-duplicates by canonical URL (keeps first occurrence)", () => {
    const raw: RawWebResult[] = [
      { title: "First", url: "https://a.com/x", content: "one" },
      { title: "Dup", url: "https://a.com/x?utm_source=q", content: "two" },
      { title: "Other", url: "https://b.com", content: "three" },
    ];
    const out = normalizeWebResults(raw);
    expect(out).toHaveLength(2);
    expect(out[0].title).toBe("First");
    expect(out.map((s) => s.key)).toEqual(["W1", "W2"]);
  });

  it("drops results with no URL or no text", () => {
    const raw: RawWebResult[] = [
      { title: "No url", content: "x" },
      { url: "https://c.com" }, // no title/content
      { title: "Good", url: "https://d.com", content: "ok" },
    ];
    const out = normalizeWebResults(raw);
    expect(out).toHaveLength(1);
    expect(out[0].url).toBe("https://d.com");
  });

  it("truncates long excerpts", () => {
    const raw: RawWebResult[] = [{ title: "T", url: "https://e.com", content: "z".repeat(2000) }];
    const out = normalizeWebResults(raw);
    expect(out[0].excerpt.length).toBeLessThanOrEqual(600);
  });
});
