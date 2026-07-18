import type { LlmClient } from "@/lib/ai/model";
import type { WebSearchClient } from "@/lib/retrieval/web";
import type { PdfEvidence } from "@/lib/retrieval/types";
import type { Emit } from "@/lib/graph/events";
import type { ResearchStateType } from "@/lib/graph/state";

/**
 * Per-request dependencies passed to the compiled graph via
 * `config.configurable.deps`. Everything the graph touches externally is here
 * so the whole workflow can be driven with mocks in tests.
 */
export interface GraphDeps {
  llm: LlmClient;
  web: WebSearchClient;
  retrievePdf: (question: string, fileIds: string[]) => Promise<PdfEvidence[]>;
  emit: Emit;
  persist: (state: ResearchStateType) => Promise<void>;
  signal?: AbortSignal;
}

interface ConfigLike {
  configurable?: { deps?: GraphDeps };
}

export function getDeps(config: ConfigLike | undefined): GraphDeps {
  const deps = config?.configurable?.deps;
  if (!deps) throw new Error("Graph dependencies were not provided.");
  return deps;
}
