import { StateGraph, START, END } from "@langchain/langgraph";
import { ResearchState } from "@/lib/graph/state";
import { routeAfterGate } from "@/lib/graph/gate";
import {
  analyzeEvidence,
  buildReportNode,
  generateInsights,
  persistResult,
  planResearch,
  refineQuery,
  retrieveEvidence,
  validateReportNode,
} from "@/lib/graph/nodes";

/**
 * Build the research StateGraph:
 *
 *   START → planResearch → retrieveEvidence → analyzeEvidence → [gate]
 *   gate: sufficient → generateInsights
 *         insufficient & iteration 0 → refineQuery → retrieveEvidence → …
 *         insufficient & already refined → generateInsights
 *   generateInsights → buildReport → validateReport → persistResult → END
 *
 * The gate is a deterministic conditional edge; refinement is bounded to one
 * cycle by `routeAfterGate`, so the graph cannot loop indefinitely.
 */
function buildGraph() {
  const workflow = new StateGraph(ResearchState)
    .addNode("planResearch", planResearch)
    .addNode("retrieveEvidence", retrieveEvidence)
    .addNode("analyzeEvidence", analyzeEvidence)
    .addNode("refineQuery", refineQuery)
    .addNode("generateInsights", generateInsights)
    .addNode("buildReport", buildReportNode)
    .addNode("validateReport", validateReportNode)
    .addNode("persistResult", persistResult)
    .addEdge(START, "planResearch")
    .addEdge("planResearch", "retrieveEvidence")
    .addEdge("retrieveEvidence", "analyzeEvidence")
    .addConditionalEdges("analyzeEvidence", routeAfterGate, {
      refineQuery: "refineQuery",
      generateInsights: "generateInsights",
    })
    .addEdge("refineQuery", "retrieveEvidence")
    .addEdge("generateInsights", "buildReport")
    .addEdge("buildReport", "validateReport")
    .addEdge("validateReport", "persistResult")
    .addEdge("persistResult", END);

  return workflow.compile();
}

type CompiledGraph = ReturnType<typeof buildGraph>;
let cached: CompiledGraph | null = null;

/** Lazily compile the graph once and reuse it across requests. */
export function getResearchGraph(): CompiledGraph {
  if (!cached) cached = buildGraph();
  return cached;
}
