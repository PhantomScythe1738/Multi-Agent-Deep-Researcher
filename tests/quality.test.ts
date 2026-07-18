import { describe, it, expect } from "vitest";
import {
  computeQuality,
  extractCitationTokens,
  filterValidCitations,
  validateReportSections,
  REQUIRED_SECTIONS,
} from "@/lib/report/validate";
import type { AnalysisOutput, InsightsOutput } from "@/lib/ai/schemas";

describe("citation helpers", () => {
  it("extracts W/P tokens", () => {
    expect(extractCitationTokens("Claim [W1] and [P2] and [W1].")).toEqual(["W1", "P2", "W1"]);
  });

  it("filters to valid, de-duplicated keys", () => {
    const valid = new Set(["W1", "P1"]);
    expect(filterValidCitations(["W1", "W9", "P1", "W1"], valid)).toEqual(["W1", "P1"]);
  });
});

describe("validateReportSections", () => {
  it("detects present and missing sections", () => {
    const md = "# Research Report\n## Executive Summary\ntext\n## Sources and Citations\n";
    const checks = validateReportSections(md);
    const byName = Object.fromEntries(checks.map((c) => [c.name, c.present]));
    expect(byName["Executive Summary"]).toBe(true);
    expect(byName["Sources"]).toBe(true);
    expect(byName["Key Findings"]).toBe(false);
    expect(checks).toHaveLength(REQUIRED_SECTIONS.length);
  });
});

const analysis: AnalysisOutput = {
  claims: [
    { statement: "A", citations: ["W1"], confidence: "high" },
    { statement: "B", citations: [], confidence: "low" },
    { statement: "C", citations: ["W99"], confidence: "medium" },
  ],
  contradictions: [{ description: "X vs Y", citations: ["W1", "P1"] }],
  sourceConcerns: [],
  knowledgeGaps: [],
  evidenceSufficiency: "sufficient",
};

const insights: InsightsOutput = {
  trends: [],
  insights: [{ statement: "I", citations: ["W1"] }],
  hypotheses: [],
  implications: [],
  limitations: [],
};

describe("computeQuality", () => {
  const fullReport = REQUIRED_SECTIONS.map((s) => `## ${s}`).join("\n") + "\n";

  it("computes coverage, flags invalid citations, and produces a 0-100 score", () => {
    const q = computeQuality({
      analysis,
      insights,
      validKeys: new Set(["W1", "P1"]),
      webSourceCount: 2,
      pdfSourceCount: 1,
      reportMarkdown: fullReport,
    });
    expect(q.totalClaims).toBe(3);
    expect(q.supportedClaims).toBe(1); // only W1 is valid
    expect(q.unsupportedClaims).toBe(2);
    expect(q.invalidCitationTokens).toContain("W99");
    expect(q.sourceDiversity).toBe(1); // both web + pdf
    expect(q.sectionCompleteness).toBe(1);
    expect(q.score).toBeGreaterThan(0);
    expect(q.score).toBeLessThanOrEqual(100);
  });

  it("gives lower section completeness when sections are missing", () => {
    const q = computeQuality({
      analysis,
      insights,
      validKeys: new Set(["W1", "P1"]),
      webSourceCount: 1,
      pdfSourceCount: 0,
      reportMarkdown: "## Executive Summary\n",
    });
    expect(q.sectionCompleteness).toBeLessThan(1);
    expect(q.sourceDiversity).toBe(0.6); // web only
  });
});
