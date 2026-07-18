import { Annotation } from "@langchain/langgraph";
import type { WebSource, PdfEvidence } from "@/lib/retrieval/types";
import type { AnalysisOutput, InsightsOutput, PlannerOutput } from "@/lib/ai/schemas";
import type { QualityReport } from "@/lib/report/validate";
import type { RunStatus } from "@/lib/supabase/types";

/**
 * Shared, strongly-typed graph state. Nodes return ONLY the keys they change.
 * `warnings`/`errors` use concat reducers because multiple nodes append to them.
 * Evidence arrays are managed whole by the single retrieval node (replace).
 */
export const ResearchState = Annotation.Root({
  runId: Annotation<string>,
  userId: Annotation<string>,
  question: Annotation<string>,
  selectedFileIds: Annotation<string[]>,
  pdfFileNames: Annotation<string[]>,
  mode: Annotation<"live" | "demo">,

  plan: Annotation<PlannerOutput | null>,
  webSources: Annotation<WebSource[]>,
  pdfEvidence: Annotation<PdfEvidence[]>,
  analysis: Annotation<AnalysisOutput | null>,
  insights: Annotation<InsightsOutput | null>,
  reportMarkdown: Annotation<string>,
  quality: Annotation<QualityReport | null>,

  iteration: Annotation<number>,
  refinedQuery: Annotation<string | null>,

  warnings: Annotation<string[]>({
    reducer: (a, b) => a.concat(b),
    default: () => [],
  }),
  errors: Annotation<string[]>({
    reducer: (a, b) => a.concat(b),
    default: () => [],
  }),
  status: Annotation<RunStatus>,
  startedAt: Annotation<string>,
});

export type ResearchStateType = typeof ResearchState.State;
export type ResearchStateUpdate = Partial<ResearchStateType>;
