"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useApiKey } from "@/components/byok/api-key-provider";
import { NdjsonParser } from "@/lib/stream/parse";
import type { AgentEvent } from "@/lib/graph/events";
import type { QualityReport } from "@/lib/report/validate";
import { AgentTimeline } from "@/components/research/agent-timeline";
import { ReportView } from "@/components/research/report-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RunStatus = "running" | "completed" | "failed";

export function ResearchRunner({ question, fileIds }: { question: string; fileIds: string[] }) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [status, setStatus] = useState<RunStatus>("running");
  const [runId, setRunId] = useState<string | null>(null);
  const [report, setReport] = useState<{ markdown: string; quality: QualityReport | null } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startedRef = useRef(false);
  const { apiKey } = useApiKey();

  // Elapsed-time ticker; stops as soon as the run settles.
  useEffect(() => {
    if (status !== "running") return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  useEffect(() => {
    if (startedRef.current) return; // guard against double-invoke (dev StrictMode)
    startedRef.current = true;
    const controller = new AbortController();
    let resolvedRunId: string | null = null;

    const addEvents = (incoming: AgentEvent[]) => {
      if (incoming.length === 0) return;
      for (const e of incoming) {
        if (e.type === "run_created") {
          const id = (e.safeMetadata?.runId as string) ?? null;
          if (id) {
            resolvedRunId = id;
            setRunId(id);
          }
        }
        if (e.type === "run_failed") {
          setStatus("failed");
          setError(e.message);
        }
      }
      // Idempotent merge by sequence.
      setEvents((prev) => {
        const seen = new Set(prev.map((p) => p.sequence));
        const merged = [...prev];
        for (const e of incoming) if (!seen.has(e.sequence)) merged.push(e);
        merged.sort((a, b) => a.sequence - b.sequence);
        return merged;
      });
    };

    const loadReport = async (id: string) => {
      const supabase = createClient();
      const { data } = await supabase
        .from("research_runs")
        .select("report_markdown, quality, status")
        .eq("id", id)
        .single();
      if (data?.report_markdown) {
        setReport({
          markdown: data.report_markdown,
          quality: (data.quality as QualityReport | null) ?? null,
        });
        setStatus(data.status === "failed" ? "failed" : "completed");
      } else {
        setStatus((s) => (s === "failed" ? s : "completed"));
      }
    };

    const run = async () => {
      try {
        const res = await fetch("/api/research/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // BYOK: sent per request; never stored server-side.
            "x-openrouter-key": apiKey ?? "",
          },
          body: JSON.stringify({ question, fileIds }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const j = await res.json().catch(() => ({}));
          setError(
            j.code === "missing_api_key"
              ? "Your OpenRouter key is missing or was removed. Add it again in Settings to run research."
              : (j.error ?? "Could not start research."),
          );
          setStatus("failed");
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        const parser = new NdjsonParser();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          addEvents(parser.push(decoder.decode(value, { stream: true })));
        }
        addEvents(parser.flush());
        if (resolvedRunId) await loadReport(resolvedRunId);
        else setStatus((s) => (s === "failed" ? s : "completed"));
      } catch {
        if (!controller.signal.aborted) {
          setError("The research stream was interrupted.");
          setStatus("failed");
          // Attempt to recover the persisted result.
          if (resolvedRunId) await loadReport(resolvedRunId);
        }
      }
    };

    run();
    return () => controller.abort();
  }, [question, fileIds, apiKey]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Agent activity</CardTitle>
            <p
              className={cn(
                "mt-1 text-sm",
                status === "running"
                  ? "text-sky-700"
                  : status === "failed"
                    ? "text-red-600"
                    : "text-emerald-700",
              )}
            >
              {status === "running"
                ? `Working… ${elapsed}s elapsed (usually ~40s)`
                : status === "failed"
                  ? "Run stopped"
                  : `Finished in ${elapsed}s`}
            </p>
          </div>
          {runId ? (
            <Link
              href={`/research/${runId}`}
              className="shrink-0 text-sm font-medium text-sky-700 hover:underline print:hidden"
            >
              Permalink
            </Link>
          ) : null}
        </CardHeader>
        <CardContent>
          {status === "running" ? (
            <div className="mb-4 h-1 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-sky-500" />
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <AgentTimeline events={events} />
        </CardContent>
      </Card>

      {report ? (
        <Card>
          <CardContent className="pt-6">
            <ReportView markdown={report.markdown} quality={report.quality} />
          </CardContent>
        </Card>
      ) : status === "completed" ? (
        <p className="text-sm text-slate-500">
          The run completed but no report was returned. Check your history.
        </p>
      ) : null}
    </div>
  );
}
