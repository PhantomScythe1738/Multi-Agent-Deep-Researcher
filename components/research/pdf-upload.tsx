"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Loader2, CheckCircle2, XCircle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { MAX_PDFS, MAX_PDF_BYTES, PDF_MIME_TYPE } from "@/lib/constants";

type FileStatus = "uploading" | "ingesting" | "ready" | "failed";

interface UploadItem {
  id: string;
  name: string;
  status: FileStatus;
  error?: string;
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "document.pdf";
}

export function PdfUpload({
  userId,
  disabled,
  onReadyChange,
}: {
  userId: string;
  disabled?: boolean;
  onReadyChange: (readyIds: string[]) => void;
}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    onReadyChange(items.filter((i) => i.status === "ready").map((i) => i.id));
  }, [items, onReadyChange]);

  const update = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList) return;
      setError(null);
      const remaining = MAX_PDFS - items.length;
      if (remaining <= 0) {
        setError(`You can attach at most ${MAX_PDFS} PDFs.`);
        return;
      }
      const files = Array.from(fileList).slice(0, remaining);

      for (const file of files) {
        if (file.type !== PDF_MIME_TYPE) {
          setError("Only PDF files are supported.");
          continue;
        }
        if (file.size > MAX_PDF_BYTES) {
          setError(`Each PDF must be under ${MAX_PDF_BYTES / (1024 * 1024)} MB.`);
          continue;
        }

        const id = crypto.randomUUID();
        const path = `${userId}/${id}/${sanitizeName(file.name)}`;
        setItems((prev) => [...prev, { id, name: file.name, status: "uploading" }]);

        const { error: upErr } = await supabase.storage
          .from("pdfs")
          .upload(path, file, { contentType: PDF_MIME_TYPE, upsert: false });
        if (upErr) {
          update(id, { status: "failed", error: "Upload failed." });
          continue;
        }

        const { error: insErr } = await supabase.from("uploaded_files").insert({
          id,
          user_id: userId,
          storage_path: path,
          original_name: file.name,
          mime_type: PDF_MIME_TYPE,
          size_bytes: file.size,
          ingestion_status: "pending",
        });
        if (insErr) {
          update(id, { status: "failed", error: "Could not register file." });
          continue;
        }

        update(id, { status: "ingesting" });
        try {
          const res = await fetch("/api/ingest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileId: id }),
          });
          const json = await res.json();
          if (res.ok && json.status === "ready") {
            update(id, { status: "ready" });
          } else {
            update(id, { status: "failed", error: json.error ?? "Ingestion failed." });
          }
        } catch {
          update(id, { status: "failed", error: "Ingestion request failed." });
        }
      }
      if (inputRef.current) inputRef.current.value = "";
    },
    [items.length, supabase, update, userId],
  );

  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || items.length >= MAX_PDFS}
        onClick={() => inputRef.current?.click()}
      >
        <FileText className="h-4 w-4" />
        Attach PDF ({items.length}/{MAX_PDFS})
      </Button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {items.length > 0 ? (
        <ul className="space-y-1">
          {items.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2 truncate">
                {i.status === "ready" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : i.status === "failed" ? (
                  <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                ) : (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-sky-600" />
                )}
                <span className="truncate text-slate-700">{i.name}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  {i.status === "uploading"
                    ? "Uploading…"
                    : i.status === "ingesting"
                      ? "Processing…"
                      : i.status === "ready"
                        ? "Ready"
                        : (i.error ?? "Failed")}
                </span>
                <button
                  type="button"
                  onClick={() => remove(i.id)}
                  className="text-slate-400 hover:text-slate-700"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
