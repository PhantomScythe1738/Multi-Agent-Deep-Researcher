import { describe, it, expect, vi } from "vitest";
import { getResearchGraph } from "@/lib/graph/graph";
import { evidenceSufficient, routeAfterGate } from "@/lib/graph/gate";
import type { ResearchStateType } from "@/lib/graph/state";
import type { GraphDeps } from "@/lib/graph/deps";
import type { WebSearchClient } from "@/lib/retrieval/web";
import type { LlmClient } from "@/lib/ai/model";
import type { AgentEvent, EmitInput } from "@/lib/graph/events";
import type { PdfEvidence } from "@/lib/retrieval/types";

function baseState(overrides: Partial<ResearchStateType> = {}): ResearchStateType {
  return {
    runId: "run-1",
    userId: "user-1",
    question: "What are the effects of X on Y?",
    selectedFileIds: [],
    pdfFileNames: [],
    mode: "live",
    plan: null,
    webSources: [],
    pdfEvidence: [],
    analysis: null,
    insights: null,
    reportMarkdown: "",
    quality: null,
    iteration: 0,
    refinedQuery: null,
    warnings: [],
    errors: [],
    status: "queued",
    startedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("evidence gate", () => {
  it("routes sufficient evidence straight to insights", () => {
    const state = baseState({
      webSources: [
        {
          key: "W1",
          type: "web",
          title: "t",
          url: "https://a.com",
          excerpt: "e",
          score: null,
          publishedDate: null,
        },
        {
          key: "W2",
          type: "web",
          title: "t",
          url: "https://b.com",
          excerpt: "e",
          score: null,
          publishedDate: null,
        },
      ],
      analysis: {
        claims: [{ statement: "c", citations: ["W1"], confidence: "high" }],
        contradictions: [],
        sourceConcerns: [],
        knowledgeGaps: [],
        evidenceSufficiency: "sufficient",
      },
    });
    expect(evidenceSufficient(state)).toBe(true);
    expect(routeAfterGate(state)).toBe("generateInsights");
  });

  it("refines once when evidence is insufficient and iteration is 0", () => {
    const state = baseState({
      webSources: [
        {
          key: "W1",
          type: "web",
          title: "t",
          url: "https://a.com",
          excerpt: "e",
          score: null,
          publishedDate: null,
        },
      ],
      analysis: {
        claims: [],
        contradictions: [],
        sourceConcerns: [],
        knowledgeGaps: ["gap"],
        evidenceSufficiency: "insufficient",
      },
      iteration: 0,
    });
    expect(routeAfterGate(state)).toBe("refineQuery");
  });

  it("does not loop again after one refinement", () => {
    const state = baseState({
      webSources: [
        {
          key: "W1",
          type: "web",
          title: "t",
          url: "https://a.com",
          excerpt: "e",
          score: null,
          publishedDate: null,
        },
      ],
      analysis: {
        claims: [],
        contradictions: [],
        sourceConcerns: [],
        knowledgeGaps: ["gap"],
        evidenceSufficiency: "insufficient",
      },
      iteration: 1,
    });
    expect(routeAfterGate(state)).toBe("generateInsights");
  });
});

// --- Mock helpers for full graph runs ---

const PLANNER_JSON = JSON.stringify({
  objective: "obj",
  searchQueries: ["q1", "q2"],
  evidenceRequirements: ["r1"],
  reportSections: ["Findings"],
});
const INSIGHTS_JSON = JSON.stringify({
  trends: ["t1"],
  insights: [{ statement: "insight", citations: ["W1"] }],
  hypotheses: ["hypo"],
  implications: ["impl"],
  limitations: ["lim"],
});
function analysisJson(sufficiency: "sufficient" | "insufficient") {
  return JSON.stringify({
    claims: [{ statement: "claim", citations: ["W1"], confidence: "high" }],
    contradictions: [{ description: "a vs b", citations: ["W1"] }],
    sourceConcerns: [],
    knowledgeGaps: ["gap"],
    evidenceSufficiency: sufficiency,
  });
}

function makeLlm(sufficiency: "sufficient" | "insufficient"): LlmClient {
  return {
    complete: vi.fn(async ({ user }: { user: string }) => {
      if (user.includes("Plan the investigation")) return PLANNER_JSON;
      if (user.includes("Critically analyze")) return analysisJson(sufficiency);
      if (user.includes("Propose ONE improved")) {
        return JSON.stringify({ improvedQuery: "better query", reason: "closing the gap" });
      }
      if (user.includes("Generate higher-order insights")) return INSIGHTS_JSON;
      return "{}";
    }),
  };
}

const webClient: WebSearchClient = {
  search: vi.fn(async () => [
    { title: "T1", url: "https://a.com", content: "web evidence", score: 0.9 },
  ]),
};

function makeDeps(
  sufficiency: "sufficient" | "insufficient",
  pdf: PdfEvidence[],
  events: AgentEvent[],
): GraphDeps {
  let seq = 0;
  const emit = async (input: EmitInput) => {
    events.push({
      v: 1,
      runId: "run-1",
      sequence: seq++,
      type: input.type,
      agentName: input.agentName ?? null,
      status: input.status ?? null,
      message: input.message,
      safeMetadata: input.safeMetadata ?? null,
      timestamp: new Date().toISOString(),
    });
  };
  return {
    llm: makeLlm(sufficiency),
    web: webClient,
    retrievePdf: vi.fn(async () => pdf),
    emit,
    persist: vi.fn(async () => {}),
  };
}

const samplePdf: PdfEvidence[] = [
  {
    key: "P1",
    type: "pdf",
    fileId: "f1",
    fileName: "doc.pdf",
    page: 2,
    content: "pdf evidence",
    similarity: 0.8,
    chunkIndex: 0,
  },
];

describe("research graph (mocked)", () => {
  it("runs end-to-end and produces a cited report when evidence is sufficient", async () => {
    const events: AgentEvent[] = [];
    const deps = makeDeps("sufficient", samplePdf, events);
    const graph = getResearchGraph();

    const final = await graph.invoke(baseState({ selectedFileIds: ["f1"] }), {
      configurable: { deps },
    });

    expect(final.reportMarkdown).toContain("# Research Report");
    expect(final.reportMarkdown).toContain("## Executive Summary");
    expect(final.reportMarkdown).toContain("## Sources and Citations");
    expect(final.quality?.score).toBeGreaterThan(0);
    expect(deps.persist).toHaveBeenCalledTimes(1);
    expect(events.some((e) => e.type === "report_completed")).toBe(true);

    // No refinement should have happened.
    const refineCalls = (deps.llm.complete as ReturnType<typeof vi.fn>).mock.calls.filter(([arg]) =>
      (arg as { user: string }).user.includes("Propose ONE improved"),
    );
    expect(refineCalls).toHaveLength(0);
  });

  it("refines exactly once when evidence stays insufficient", async () => {
    const events: AgentEvent[] = [];
    const deps = makeDeps("insufficient", [], events);
    const graph = getResearchGraph();

    const final = await graph.invoke(baseState(), { configurable: { deps } });

    const calls = (deps.llm.complete as ReturnType<typeof vi.fn>).mock.calls.map(
      ([arg]) => (arg as { user: string }).user,
    );
    const refineCount = calls.filter((u) => u.includes("Propose ONE improved")).length;
    const analysisCount = calls.filter((u) => u.includes("Critically analyze")).length;

    expect(refineCount).toBe(1); // bounded to one refinement
    expect(analysisCount).toBe(2); // analyzed before and after refinement
    expect(final.iteration).toBe(1);
    expect(final.reportMarkdown).toContain("# Research Report");
    expect(deps.persist).toHaveBeenCalledTimes(1);
  });
});
