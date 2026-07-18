import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { ingestPdf, EmptyPdfError } from "@/lib/pdf/ingest";
import { embedTexts, toVectorLiteral } from "@/lib/ai/embeddings";
import { MAX_PDF_BYTES } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  fileId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let fileId: string;
  try {
    const json = await request.json();
    fileId = bodySchema.parse(json).fileId;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Verify ownership via RLS-scoped read.
  const { data: file, error: fileErr } = await supabase
    .from("uploaded_files")
    .select("*")
    .eq("id", fileId)
    .single();

  if (fileErr || !file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
  if (file.user_id !== user.id || !file.storage_path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (file.size_bytes > MAX_PDF_BYTES) {
    await markFailed(supabase, fileId, "File exceeds the size limit.");
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }
  if (file.ingestion_status === "ready") {
    return NextResponse.json({ status: "ready", alreadyIngested: true });
  }

  await supabase
    .from("uploaded_files")
    .update({ ingestion_status: "processing", error_summary: null })
    .eq("id", fileId);

  try {
    // Download the private object (storage RLS restricts to the owner).
    const { data: blob, error: dlErr } = await supabase.storage
      .from("pdfs")
      .download(file.storage_path);
    if (dlErr || !blob) {
      throw new Error("Could not download the uploaded file.");
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    const { chunks, pageCount } = await ingestPdf(buffer, file.original_name);

    const embeddings = await embedTexts(
      supabase,
      chunks.map((c) => c.content),
    );

    // Idempotent: clear any partial chunks from a prior attempt.
    await supabase.from("document_chunks").delete().eq("file_id", fileId);

    const rows = chunks.map((c, i) => ({
      file_id: fileId,
      user_id: user.id,
      chunk_index: c.chunkIndex,
      page_number: c.pageNumber,
      content: c.content,
      token_count: c.tokenCount,
      metadata: { fileName: file.original_name, page: c.pageNumber },
      embedding: toVectorLiteral(embeddings[i]),
    }));

    const { error: insErr } = await supabase.from("document_chunks").insert(rows);
    if (insErr) {
      throw new Error("Failed to store document chunks.");
    }

    await supabase
      .from("uploaded_files")
      .update({ ingestion_status: "ready", page_count: pageCount, error_summary: null })
      .eq("id", fileId);

    return NextResponse.json({ status: "ready", chunkCount: rows.length, pageCount });
  } catch (err) {
    const message =
      err instanceof EmptyPdfError
        ? err.message
        : "Ingestion failed. Please try a different text-based PDF.";
    // Clean partial chunks and record a safe error summary.
    await supabase.from("document_chunks").delete().eq("file_id", fileId);
    await markFailed(supabase, fileId, message);
    // Log redacted server-side; never leak internals to the client.
    console.error("ingest error", { fileId, name: err instanceof Error ? err.name : "unknown" });
    return NextResponse.json({ status: "failed", error: message }, { status: 422 });
  }
}

async function markFailed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fileId: string,
  summary: string,
) {
  await supabase
    .from("uploaded_files")
    .update({ ingestion_status: "failed", error_summary: summary })
    .eq("id", fileId);
}
