import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import { researchRequestSchema } from "@/lib/validation/research";
import { checkRunRateLimit } from "@/lib/ratelimit";
import { createLlmClient } from "@/lib/ai/model";
import { createTavilyClient } from "@/lib/retrieval/web";
import { retrievePdfEvidence } from "@/lib/retrieval/pdf";
import { getResearchGraph } from "@/lib/graph/graph";
import { persistRun } from "@/lib/research/persist";
import type { GraphDeps } from "@/lib/graph/deps";
import type { EmitInput, AgentEvent } from "@/lib/graph/events";
import type { ResearchStateType } from "@/lib/graph/state";
import type { Json } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = researchRequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const rate = await checkRunRateLimit(supabase);
  if (!rate.ok) {
    return NextResponse.json(
      { error: `Rate limit reached (${rate.limit}/hour). Try again later.` },
      { status: 429 },
    );
  }

  // Verify selected files belong to the user (RLS) and are ready.
  let pdfFileNames: string[] = [];
  if (body.fileIds.length > 0) {
    const { data: files } = await supabase
      .from("uploaded_files")
      .select("id, original_name, ingestion_status")
      .in("id", body.fileIds);
    if (!files || files.length !== body.fileIds.length) {
      return NextResponse.json({ error: "One or more files were not found" }, { status: 400 });
    }
    if (files.some((f) => f.ingestion_status !== "ready")) {
      return NextResponse.json({ error: "One or more files are not ready yet" }, { status: 400 });
    }
    pdfFileNames = files.map((f) => f.original_name);
  }

  const { data: run, error: runErr } = await supabase
    .from("research_runs")
    .insert({
      user_id: user.id,
      question: body.question,
      status: "queued",
      mode: "live",
      scope: { fileIds: body.fileIds },
    })
    .select("id")
    .single();
  if (runErr || !run) {
    return NextResponse.json({ error: "Could not create research run" }, { status: 500 });
  }
  const runId = run.id;
  const userId = user.id;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let sequence = 0;
      let closed = false;

      const emit = async (input: EmitInput) => {
        const event: AgentEvent = {
          v: 1,
          runId,
          sequence: sequence++,
          type: input.type,
          agentName: input.agentName ?? null,
          status: input.status ?? null,
          message: input.message,
          safeMetadata: input.safeMetadata ?? null,
          timestamp: new Date().toISOString(),
        };
        if (!closed) {
          try {
            controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
          } catch {
            // Controller already closed (client disconnected).
          }
        }
        // Best-effort persistence for replay; never fail the run on a log write.
        try {
          await supabase.from("agent_events").insert({
            run_id: runId,
            user_id: userId,
            sequence: event.sequence,
            agent_name: event.agentName ?? "system",
            status: event.status ?? "info",
            message: event.message,
            safe_metadata: (event.safeMetadata ?? null) as Json,
          });
        } catch {
          // ignore
        }
      };

      await emit({
        type: "run_created",
        message: "Research run created.",
        safeMetadata: { runId },
      });

      const deps: GraphDeps = {
        llm: createLlmClient(),
        web: createTavilyClient(serverEnv().TAVILY_API_KEY),
        retrievePdf: (q, ids) => retrievePdfEvidence(supabase, q, ids),
        emit,
        persist: (state: ResearchStateType) => persistRun(supabase, userId, runId, state),
        signal: request.signal,
      };

      const initialState: ResearchStateType = {
        runId,
        userId,
        question: body.question,
        selectedFileIds: body.fileIds,
        pdfFileNames,
        mode: "live",
        plan: null,
        webSources: [],
        pdfEvidence: [],
        analysis: null,
        insights: null,
        reportMarkdown: "",
        quality: null,
        iteration: 0,
        refinedQuery: null,
        warnings: [],
        errors: [],
        status: "queued",
        startedAt: new Date().toISOString(),
      };

      try {
        await supabase.from("research_runs").update({ status: "planning" }).eq("id", runId);
        await getResearchGraph().invoke(initialState, {
          configurable: { deps },
          signal: request.signal,
          recursionLimit: 50,
        });
        await emit({ type: "stream_complete", message: "Stream complete." });
      } catch (err) {
        if (request.signal.aborted) {
          await supabase
            .from("research_runs")
            .update({ status: "failed", error_summary: "Cancelled by user." })
            .eq("id", runId);
        } else {
          await supabase
            .from("research_runs")
            .update({ status: "failed", error_summary: "Research run failed." })
            .eq("id", runId);
          await emit({
            type: "run_failed",
            status: "failed",
            message: "Research failed. Please try again.",
          });
          console.error("research stream error", {
            runId,
            name: err instanceof Error ? err.name : "unknown",
          });
        }
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
