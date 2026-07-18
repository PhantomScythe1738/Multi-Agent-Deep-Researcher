import type { ResearchStateType } from "@/lib/graph/state";

/**
 * Deterministic evidence-sufficiency check. Combines the analyst's own
 * assessment with hard counts so the gate cannot be talked into looping. Pure.
 */
export function evidenceSufficient(state: ResearchStateType): boolean {
  const totalSources = state.webSources.length + state.pdfEvidence.length;
  if (totalSources === 0) return false;

  const supportedClaims = state.analysis
    ? state.analysis.claims.filter((c) => c.citations.length > 0).length
    : 0;
  const modelSufficient = state.analysis?.evidenceSufficiency === "sufficient";

  return (
    (modelSufficient && totalSources >= 2 && supportedClaims >= 1) ||
    (totalSources >= 4 && supportedClaims >= 3)
  );
}

const MAX_REFINEMENTS = 1;

/**
 * Conditional route after the evidence gate:
 * - sufficient evidence            -> generateInsights
 * - insufficient & no refine yet   -> refineQuery (one cycle only)
 * - insufficient & already refined -> generateInsights (with limitations)
 * Pure and total.
 */
export function routeAfterGate(state: ResearchStateType): "refineQuery" | "generateInsights" {
  if (evidenceSufficient(state)) return "generateInsights";
  if (state.iteration < MAX_REFINEMENTS) return "refineQuery";
  return "generateInsights";
}
