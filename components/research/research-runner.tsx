"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { NdjsonParser } from "@/lib/stream/parse";
import type { AgentEvent } from "@/lib/graph/events";
import type { QualityReport } from "@/lib/report/validate";
import { AgentTimeline } from "@/components/research/agent-timeline";
import { ReportView } from "@/components/research/report-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RunStatus = "running" | "completed" | "failed";

export function ResearchRunner({ question, fileIds }: { question: string; fileIds: string[] }) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [status, setStatus] = useState<RunStatus>("running");
  const [runId, setRunId] = useState<string | null>(null);
  const [report, setReport] = useState<{ markdown: string; quality: QualityReport | null } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, fileIds }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const j = await res.json().catch(() => ({}));
          setError(j.error ?? "Could not start research.");
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
  }, [question, fileIds]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Agent activity</CardTitle>
          {runId ? (
            <Link
              href={`/research/${runId}`}
              className="text-sm font-medium text-sky-700 underline print:hidden"
            >
              Permalink
            </Link>
          ) : null}
        </CardHeader>
        <CardContent>
          {status === "running" ? (
            <p className="mb-3 text-sm text-sky-700">Research in progress…</p>
          ) : null}
          {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
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
