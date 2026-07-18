import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AgentTimeline } from "@/components/research/agent-timeline";
import { ReportView } from "@/components/research/report-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgentEvent, AgentEventType, AgentStatus } from "@/lib/graph/events";
import type { QualityReport } from "@/lib/report/validate";

export const dynamic = "force-dynamic";

function rowToEvent(row: {
  sequence: number;
  agent_name: string;
  status: string;
  message: string;
  safe_metadata: unknown;
  created_at: string;
}): AgentEvent {
  const status = (
    ["running", "completed", "warning", "failed"].includes(row.status) ? row.status : null
  ) as AgentStatus | null;
  const type: AgentEventType =
    status === "running"
      ? "agent_started"
      : status === "warning"
        ? "agent_warning"
        : status === "failed"
          ? "agent_failed"
          : status === "completed"
            ? "agent_completed"
            : "source_count";
  return {
    v: 1,
    runId: "",
    sequence: row.sequence,
    type,
    agentName: row.agent_name === "system" ? null : row.agent_name,
    status,
    message: row.message,
    safeMetadata: (row.safe_metadata as Record<string, unknown> | null) ?? null,
    timestamp: row.created_at,
  };
}

export default async function ResearchRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: run } = await supabase
    .from("research_runs")
    .select("id, question, status, report_markdown, quality, error_summary, created_at")
    .eq("id", id)
    .single();

  if (!run) notFound();

  const { data: eventRows } = await supabase
    .from("agent_events")
    .select("sequence, agent_name, status, message, safe_metadata, created_at")
    .eq("run_id", id)
    .order("sequence", { ascending: true });

  const events = (eventRows ?? []).map(rowToEvent);
  const quality = (run.quality as QualityReport | null) ?? null;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-6 print:hidden">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          Research run · {run.status}
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">{run.question}</h1>
      </div>

      {run.error_summary ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 print:hidden">
          {run.error_summary}
        </p>
      ) : null}

      <div className="grid gap-6 print:block">
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle>Agent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <AgentTimeline events={events} />
          </CardContent>
        </Card>

        {run.report_markdown ? (
          <Card>
            <CardContent className="pt-6">
              <ReportView markdown={run.report_markdown} quality={quality} />
            </CardContent>
          </Card>
        ) : (
          <p className="text-sm text-slate-500 print:hidden">
            No report is available for this run yet.
          </p>
        )}
      </div>
    </main>
  );
}
