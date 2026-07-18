import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { ResearchStateType } from "@/lib/graph/state";

/**
 * Persist the final research result: report, quality, plan, and the source list.
 * Called from the graph's persistResult node. All writes are user-scoped.
 */
export async function persistRun(
  supabase: SupabaseClient<Database>,
  userId: string,
  runId: string,
  state: ResearchStateType,
): Promise<void> {
  await supabase
    .from("research_runs")
    .update({
      status: "completed",
      report_markdown: state.reportMarkdown,
      quality: state.quality ? JSON.parse(JSON.stringify(state.quality)) : null,
      plan: state.plan ? JSON.parse(JSON.stringify(state.plan)) : null,
      error_summary: null,
    })
    .eq("id", runId);

  // Rewrite the source list for this run.
  await supabase.from("sources").delete().eq("run_id", runId);

  const sourceRows = [
    ...state.webSources.map((s) => ({
      run_id: runId,
      user_id: userId,
      source_key: s.key,
      source_type: "web",
      title: s.title,
      url: s.url,
      excerpt: s.excerpt,
      citation_metadata: { score: s.score, publishedDate: s.publishedDate },
    })),
    ...state.pdfEvidence.map((e) => ({
      run_id: runId,
      user_id: userId,
      source_key: e.key,
      source_type: "pdf",
      title: e.fileName,
      url: null,
      excerpt: e.content.slice(0, 500),
      citation_metadata: { page: e.page, fileId: e.fileId, similarity: e.similarity },
    })),
  ];

  if (sourceRows.length > 0) {
    await supabase.from("sources").insert(sourceRows);
  }
}
