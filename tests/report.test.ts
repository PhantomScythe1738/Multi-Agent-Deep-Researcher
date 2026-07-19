import { describe, it, expect } from "vitest";
import { buildReport } from "@/lib/report/build";
import { REQUIRED_SECTIONS } from "@/lib/report/validate";
import { getDemoRun } from "@/lib/demo/sample";
import type { WebSource } from "@/lib/retrieval/types";
import type { AnalysisOutput, InsightsOutput } from "@/lib/ai/schemas";

const web: WebSource[] = [
  {
    key: "W1",
    type: "web",
    title: "Src",
    url: "https://a.com",
    excerpt: "e",
    score: null,
    publishedDate: null,
  },
];

const analysis: AnalysisOutput = {
  claims: [
    { statement: "Valid cited claim", citations: ["W1"], confidence: "high" },
    { statement: "Bad cited claim", citations: ["W99"], confidence: "low" },
  ],
  contradictions: [],
  sourceConcerns: [],
  knowledgeGaps: [],
  evidenceSufficiency: "sufficient",
};

const insights: InsightsOutput = {
  trends: [],
  insights: [],
  hypotheses: [],
  implications: [],
  limitations: [],
};

describe("buildReport", () => {
  it("includes every required section", () => {
    const md = buildReport({
      question: "Q?",
      plan: null,
      webSources: web,
      pdfEvidence: [],
      analysis,
      insights,
      warnings: [],
      mode: "live",
    });
    for (const section of REQUIRED_SECTIONS) {
      const first = section.split(" ")[0].toLowerCase();
      expect(md.toLowerCase()).toContain(`## ${first}`);
    }
  });

  it("renders valid citations but drops invalid ones", () => {
    const md = buildReport({
      question: "Q?",
      plan: null,
      webSources: web,
      pdfEvidence: [],
      analysis,
      insights,
      warnings: [],
      mode: "live",
    });
    expect(md).toContain("[W1]");
    expect(md).not.toContain("[W99]");
  });

  it("does not duplicate a citation the model already wrote inline", () => {
    const md = buildReport({
      question: "Q?",
      plan: null,
      webSources: web,
      pdfEvidence: [],
      analysis: {
        ...analysis,
        claims: [{ statement: "Velocity was flat [W1].", citations: ["W1"], confidence: "high" }],
      },
      insights,
      warnings: [],
      mode: "live",
    });
    // "[W1]" should appear once in the finding line, not twice.
    const findingLine = md.split("\n").find((l) => l.includes("Velocity was flat")) ?? "";
    expect((findingLine.match(/\[W1\]/g) ?? []).length).toBe(1);
  });

  it("always includes a limitations disclaimer", () => {
    const md = buildReport({
      question: "Q?",
      plan: null,
      webSources: web,
      pdfEvidence: [],
      analysis,
      insights,
      warnings: [],
      mode: "live",
    });
    expect(md.toLowerCase()).toContain("not guaranteed factual truth");
  });
});

describe("demo run", () => {
  it("is clearly labelled and renders through the real builders", () => {
    const demo = getDemoRun();
    expect(demo.reportMarkdown).toContain("Demo Sample — not live research");
    expect(demo.quality.score).toBeGreaterThan(0);
    expect(demo.events.length).toBeGreaterThan(0);
  });
});
