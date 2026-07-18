import { CheckCircle2, AlertTriangle, XCircle, Loader2, Circle, Info } from "lucide-react";
import type { AgentEvent, AgentStatus } from "@/lib/graph/events";
import { cn } from "@/lib/utils";

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

function metaText(meta: Record<string, unknown> | null): string | null {
  if (!meta) return null;
  const parts: string[] = [];
  if (typeof meta.web === "number") parts.push(`web: ${meta.web}`);
  if (typeof meta.pdf === "number") parts.push(`pdf: ${meta.pdf}`);
  if (typeof meta.count === "number") parts.push(`${meta.count} result(s)`);
  if (typeof meta.score === "number") parts.push(`score ${meta.score}/100`);
  return parts.length ? parts.join(" · ") : null;
}

/** Vertical agent timeline. Renders any AgentEvent list (live or persisted). */
export function AgentTimeline({ events }: { events: AgentEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-slate-500">Waiting for the workflow to start…</p>;
  }
  return (
    <ol className="space-y-3">
      {events.map((e) => {
        const meta = metaText(e.safeMetadata);
        return (
          <li key={e.sequence} className="flex items-start gap-3">
            <span className="mt-0.5">
              <StatusIcon status={e.status} type={e.type} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {e.agentName ? (
                  <span className="text-sm font-medium text-slate-900">{e.agentName}</span>
                ) : (
                  <span className="text-sm font-medium text-slate-500">System</span>
                )}
                <span className="text-xs text-slate-400">#{e.sequence}</span>
              </div>
              <p className={cn("text-sm text-slate-600")}>{e.message}</p>
              {meta ? <p className="text-xs text-slate-400">{meta}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
