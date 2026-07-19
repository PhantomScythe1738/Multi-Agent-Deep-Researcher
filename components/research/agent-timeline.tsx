import { CheckCircle2, AlertTriangle, XCircle, Loader2, Circle, Info } from "lucide-react";
import type { AgentEvent, AgentStatus } from "@/lib/graph/events";
import { cn } from "@/lib/utils";

/** Plain-language label for each agent, so non-experts can follow along. */
const FRIENDLY: Record<string, string> = {
  "Research Planner": "Planning the research",
  "Web Retriever": "Searching the web",
  "PDF Retriever": "Searching your PDFs",
  "Critical Analysis": "Weighing the evidence",
  "Query Refinement": "Refining the search",
  "Insight Generation": "Finding insights",
  "Report Builder": "Writing the report",
  "Evidence Quality": "Checking every citation",
};

function StatusIcon({ status, type }: { status: AgentStatus | null; type: string }) {
  if (type === "run_failed" || status === "failed")
    return <XCircle className="h-4 w-4 text-red-600" />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  if (status === "completed" || type === "report_completed")
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === "running") return <Loader2 className="h-4 w-4 animate-spin text-sky-600" />;
  if (type === "source_count" || type === "run_created")
    return <Info className="h-4 w-4 text-slate-400" />;
  return <Circle className="h-4 w-4 text-slate-300" />;
}

function metaChips(meta: Record<string, unknown> | null): string[] {
  if (!meta) return [];
  const chips: string[] = [];
  if (typeof meta.web === "number") chips.push(`${meta.web} web`);
  if (typeof meta.pdf === "number") chips.push(`${meta.pdf} PDF`);
  if (typeof meta.count === "number") chips.push(`${meta.count} found`);
  if (typeof meta.claims === "number") chips.push(`${meta.claims} claims`);
  if (typeof meta.contradictions === "number")
    chips.push(`${meta.contradictions} contradiction${meta.contradictions === 1 ? "" : "s"}`);
  if (typeof meta.queryCount === "number") chips.push(`${meta.queryCount} queries`);
  if (typeof meta.score === "number") chips.push(`score ${meta.score}/100`);
  return chips;
}

/** Vertical agent timeline. Renders any AgentEvent list (live or persisted). */
export function AgentTimeline({ events }: { events: AgentEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-slate-500">Starting the agents…</p>;
  }

  return (
    <ol className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[7px] before:w-px before:bg-slate-200">
      {events.map((e) => {
        const chips = metaChips(e.safeMetadata);
        const friendly = e.agentName ? FRIENDLY[e.agentName] : null;
        return (
          <li key={e.sequence} className="relative flex items-start gap-3">
            <span className="z-10 mt-0.5 bg-white">
              <StatusIcon status={e.status} type={e.type} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-sm font-medium text-slate-900">
                  {friendly ?? (e.agentName || "Workflow")}
                </span>
                {e.agentName ? (
                  <span className="text-[11px] text-slate-400">{e.agentName}</span>
                ) : null}
              </div>
              <p
                className={cn(
                  "text-sm",
                  e.status === "warning"
                    ? "text-amber-700"
                    : e.status === "failed"
                      ? "text-red-700"
                      : "text-slate-600",
                )}
              >
                {e.message}
              </p>
              {chips.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1">
                  {chips.map((c) => (
                    <span
                      key={c}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
