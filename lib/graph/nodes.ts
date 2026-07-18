import type { RunnableConfig } from "@langchain/core/runnables";
import { getDeps } from "@/lib/graph/deps";
import type { ResearchStateType, ResearchStateUpdate } from "@/lib/graph/state";
import { canonicalizeUrl } from "@/lib/retrieval/url";
import { MAX_WEB_SOURCES } from "@/lib/constants";
import { searchWeb } from "@/lib/retrieval/web";
import type { WebSource, PdfEvidence } from "@/lib/retrieval/types";
import { generateStructured } from "@/lib/ai/json";
import { analysisSchema, insightsSchema, plannerSchema, refinementSchema } from "@/lib/ai/schemas";
import type { AnalysisOutput, InsightsOutput } from "@/lib/ai/schemas";
import {
  buildAnalysisPrompt,
  buildInsightPrompt,
  buildPlannerPrompt,
  buildRefinementPrompt,
} from "@/lib/ai/prompts";
import { buildReport } from "@/lib/report/build";
import { computeQuality } from "@/lib/report/validate";

const EMPTY_ANALYSIS: AnalysisOutput = {
  claims: [],
  contradictions: [],
  sourceConcerns: [],
  knowledgeGaps: ["Automated analysis could not be completed for this run."],
  evidenceSufficiency: "insufficient",
};

const EMPTY_INSIGHTS: InsightsOutput = {
  trends: [],
  insights: [],
  hypotheses: [],
  implications: [],
  limitations: ["Insight generation was unavailable; findings are limited to the analysis above."],
};

/**
 * Merge fresh web sources into existing (dedupe by canonical URL), keep the
 * highest-scoring MAX_WEB_SOURCES, and re-key so citations stay stable/compact.
 */
function mergeWeb(existing: WebSource[], fresh: WebSource[]): WebSource[] {
  const seen = new Set(existing.map((s) => canonicalizeUrl(s.url)));
  const merged = [...existing];
  for (const s of fresh) {
    const c = canonicalizeUrl(s.url);
    if (!seen.has(c)) {
      seen.add(c);
      merged.push(s);
    }
  }
  // Prefer higher relevance scores; nulls sort last. Stable for equal scores.
  const ranked = merged
    .map((s, i) => ({ s, i }))
    .sort((a, b) => (b.s.score ?? -1) - (a.s.score ?? -1) || a.i - b.i)
    .slice(0, MAX_WEB_SOURCES)
    .map(({ s }) => s);
  return ranked.map((s, i) => ({ ...s, key: `W${i + 1}` }));
}

/** Merge PDF evidence by (fileId, chunkIndex) and re-key. */
function mergePdf(existing: PdfEvidence[], fresh: PdfEvidence[]): PdfEvidence[] {
  const seen = new Set(existing.map((e) => `${e.fileId}:${e.chunkIndex}`));
  const merged = [...existing];
  for (const e of fresh) {
    const id = `${e.fileId}:${e.chunkIndex}`;
    if (!seen.has(id)) {
      seen.add(id);
      merged.push(e);
    }
  }
  return merged.map((e, i) => ({ ...e, key: `P${i + 1}` }));
}

export async function planResearch(
  state: ResearchStateType,
  config?: RunnableConfig,
): Promise<ResearchStateUpdate> {
  const deps = getDeps(config);
  await deps.emit({
    type: "agent_started",
    agentName: "Research Planner",
    status: "running",
    message: "Planning the investigation…",
  });

  try {
    const plan = await generateStructured(deps.llm, {
      ...buildPlannerPrompt(state.question, state.pdfFileNames),
      schema: plannerSchema,
      signal: deps.signal,
    });
    await deps.emit({
      type: "agent_completed",
      agentName: "Research Planner",
      status: "completed",
      message: `Planned ${plan.searchQueries.length} search queries.`,
      safeMetadata: { queryCount: plan.searchQueries.length },
    });
    return { plan, status: "retrieving" };
  } catch {
    // Degrade to a default plan built from the question.
    const plan = {
      objective: state.question,
      searchQueries: [state.question.slice(0, 300)],
      evidenceRequirements: [],
      reportSections: [],
    };
    await deps.emit({
      type: "agent_warning",
      agentName: "Research Planner",
      status: "warning",
      message: "Planner output could not be parsed; using a default plan.",
    });
    return { plan, status: "retrieving", warnings: ["Planner degraded to default plan."] };
  }
}

export async function retrieveEvidence(
  state: ResearchStateType,
  config?: RunnableConfig,
): Promise<ResearchStateUpdate> {
  const deps = getDeps(config);
  const queries = state.refinedQuery
    ? [state.refinedQuery]
    : (state.plan?.searchQueries ?? [state.question]);

  await deps.emit({
    type: "agent_started",
    agentName: "Web Retriever",
    status: "running",
    message: "Searching the web…",
  });
  await deps.emit({
    type: "agent_started",
    agentName: "PDF Retriever",
    status: "running",
    message: "Searching your PDFs…",
  });

  const [webResult, pdfResult] = await Promise.allSettled([
    searchWeb(deps.web, queries, deps.signal),
    deps.retrievePdf(state.question, state.selectedFileIds),
  ]);

  const warnings: string[] = [];

  let webSources = state.webSources;
  if (webResult.status === "fulfilled") {
    webSources = mergeWeb(state.webSources, webResult.value);
    await deps.emit({
      type: "agent_completed",
      agentName: "Web Retriever",
      status: "completed",
      message: `Found ${webSources.length} web source(s).`,
      safeMetadata: { count: webSources.length },
    });
  } else {
    warnings.push("Web search was unavailable; proceeding with available evidence.");
    await deps.emit({
      type: "agent_warning",
      agentName: "Web Retriever",
      status: "warning",
      message: "Web search unavailable.",
    });
  }

  let pdfEvidence = state.pdfEvidence;
  if (pdfResult.status === "fulfilled") {
    pdfEvidence = mergePdf(state.pdfEvidence, pdfResult.value);
    await deps.emit({
      type: "agent_completed",
      agentName: "PDF Retriever",
      status: "completed",
      message: `Found ${pdfEvidence.length} PDF excerpt(s).`,
      safeMetadata: { count: pdfEvidence.length },
    });
  } else if (state.selectedFileIds.length > 0) {
    warnings.push("PDF retrieval was unavailable; proceeding with web evidence.");
    await deps.emit({
      type: "agent_warning",
      agentName: "PDF Retriever",
      status: "warning",
      message: "PDF retrieval unavailable.",
    });
  } else {
    await deps.emit({
      type: "agent_completed",
      agentName: "PDF Retriever",
      status: "completed",
      message: "No PDFs attached.",
    });
  }

  await deps.emit({
    type: "source_count",
    message: "Evidence collected.",
    safeMetadata: { web: webSources.length, pdf: pdfEvidence.length },
  });

  return { webSources, pdfEvidence, status: "analyzing", ...(warnings.length ? { warnings } : {}) };
}

export async function analyzeEvidence(
  state: ResearchStateType,
  config?: RunnableConfig,
): Promise<ResearchStateUpdate> {
  const deps = getDeps(config);
  await deps.emit({
    type: "agent_started",
    agentName: "Critical Analysis",
    status: "running",
    message: "Analyzing evidence…",
  });

  try {
    const analysis = await generateStructured(deps.llm, {
      ...buildAnalysisPrompt(state.question, state.webSources, state.pdfEvidence),
      schema: analysisSchema,
      signal: deps.signal,
    });
    await deps.emit({
      type: "agent_completed",
      agentName: "Critical Analysis",
      status: "completed",
      message: `Identified ${analysis.claims.length} claim(s), ${analysis.contradictions.length} contradiction(s).`,
      safeMetadata: {
        claims: analysis.claims.length,
        contradictions: analysis.contradictions.length,
        sufficiency: analysis.evidenceSufficiency,
      },
    });
    return { analysis, status: "analyzing" };
  } catch {
    await deps.emit({
      type: "agent_warning",
      agentName: "Critical Analysis",
      status: "warning",
      message: "Analysis output could not be parsed; continuing with a degraded report.",
    });
    return { analysis: EMPTY_ANALYSIS, warnings: ["Critical analysis degraded."] };
  }
}

export async function refineQuery(
  state: ResearchStateType,
  config?: RunnableConfig,
): Promise<ResearchStateUpdate> {
  const deps = getDeps(config);
  await deps.emit({
    type: "agent_started",
    agentName: "Query Refinement",
    status: "running",
    message: "Refining the search…",
  });

  const gaps = state.analysis?.knowledgeGaps ?? [];
  const priorQueries = state.plan?.searchQueries ?? [];

  try {
    const refined = await generateStructured(deps.llm, {
      ...buildRefinementPrompt(state.question, gaps, priorQueries),
      schema: refinementSchema,
      signal: deps.signal,
    });
    await deps.emit({
      type: "agent_completed",
      agentName: "Query Refinement",
      status: "completed",
      message: refined.reason,
      safeMetadata: { refined: true },
    });
    return { refinedQuery: refined.improvedQuery, iteration: state.iteration + 1 };
  } catch {
    await deps.emit({
      type: "agent_warning",
      agentName: "Query Refinement",
      status: "warning",
      message: "Refinement unavailable; finalizing with current evidence.",
    });
    // Increment iteration so the gate cannot loop again.
    return {
      refinedQuery: null,
      iteration: state.iteration + 1,
      warnings: ["Query refinement degraded."],
    };
  }
}

export async function generateInsights(
  state: ResearchStateType,
  config?: RunnableConfig,
): Promise<ResearchStateUpdate> {
  const deps = getDeps(config);
  await deps.emit({
    type: "agent_started",
    agentName: "Insight Generation",
    status: "running",
    message: "Generating insights…",
  });

  const analysis = state.analysis ?? EMPTY_ANALYSIS;
  try {
    const insights = await generateStructured(deps.llm, {
      ...buildInsightPrompt(state.question, JSON.stringify(analysis)),
      schema: insightsSchema,
      signal: deps.signal,
    });
    await deps.emit({
      type: "agent_completed",
      agentName: "Insight Generation",
      status: "completed",
      message: `Generated ${insights.insights.length} insight(s), ${insights.hypotheses.length} hypothesis(es).`,
      safeMetadata: { insights: insights.insights.length, hypotheses: insights.hypotheses.length },
    });
    return { insights, status: "building" };
  } catch {
    await deps.emit({
      type: "agent_warning",
      agentName: "Insight Generation",
      status: "warning",
      message: "Insight generation degraded.",
    });
    return {
      insights: EMPTY_INSIGHTS,
      status: "building",
      warnings: ["Insight generation degraded."],
    };
  }
}

export async function buildReportNode(
  state: ResearchStateType,
  config?: RunnableConfig,
): Promise<ResearchStateUpdate> {
  const deps = getDeps(config);
  await deps.emit({
    type: "agent_started",
    agentName: "Report Builder",
    status: "running",
    message: "Compiling the report…",
  });

  const reportMarkdown = buildReport({
    question: state.question,
    plan: state.plan,
    webSources: state.webSources,
    pdfEvidence: state.pdfEvidence,
    analysis: state.analysis ?? EMPTY_ANALYSIS,
    insights: state.insights ?? EMPTY_INSIGHTS,
    warnings: state.warnings,
    mode: state.mode === "demo" ? "demo" : "live",
  });

  await deps.emit({
    type: "agent_completed",
    agentName: "Report Builder",
    status: "completed",
    message: "Report compiled.",
  });
  return { reportMarkdown, status: "building" };
}

export async function validateReportNode(
  state: ResearchStateType,
  config?: RunnableConfig,
): Promise<ResearchStateUpdate> {
  const deps = getDeps(config);
  await deps.emit({
    type: "agent_started",
    agentName: "Evidence Quality",
    status: "running",
    message: "Validating citations…",
  });

  const validKeys = new Set<string>([
    ...state.webSources.map((s) => s.key),
    ...state.pdfEvidence.map((e) => e.key),
  ]);

  const quality = computeQuality({
    analysis: state.analysis ?? EMPTY_ANALYSIS,
    insights: state.insights ?? EMPTY_INSIGHTS,
    validKeys,
    webSourceCount: state.webSources.length,
    pdfSourceCount: state.pdfEvidence.length,
    reportMarkdown: state.reportMarkdown,
  });

  if (quality.invalidCitationTokens.length > 0) {
    await deps.emit({
      type: "agent_warning",
      agentName: "Evidence Quality",
      status: "warning",
      message: `Dropped ${quality.invalidCitationTokens.length} invalid citation token(s).`,
    });
  }
  await deps.emit({
    type: "agent_completed",
    agentName: "Evidence Quality",
    status: "completed",
    message: `Quality score: ${quality.score}/100.`,
    safeMetadata: { score: quality.score },
  });

  return { quality, status: "completed" };
}

export async function persistResult(
  state: ResearchStateType,
  config?: RunnableConfig,
): Promise<ResearchStateUpdate> {
  const deps = getDeps(config);
  await deps.persist({ ...state, status: "completed" });
  await deps.emit({
    type: "report_completed",
    status: "completed",
    message: "Research complete.",
    safeMetadata: { score: state.quality?.score ?? null },
  });
  return { status: "completed" };
}
