"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QualityReport } from "@/lib/report/validate";

function QualityBadge({ quality }: { quality: QualityReport | null }) {
  if (!quality) return null;
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 print:hidden">
      <span className="font-semibold text-slate-800">Report quality: {quality.score}/100</span> —
      citation coverage {Math.round(quality.citationCoverage * 100)}%, sections{" "}
      {Math.round(quality.sectionCompleteness * 100)}%, {quality.webSourceCount} web /{" "}
      {quality.pdfSourceCount} pdf source(s).
      <span className="mt-1 block text-slate-400">
        A transparency metric of report hygiene — not a measure of factual correctness.
      </span>
    </div>
  );
}

/** Renders the Markdown report. Raw HTML is disabled (react-markdown default). */
export function ReportView({
  markdown,
  quality,
}: {
  markdown: string;
  quality?: QualityReport | null;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <h2 className="text-lg font-semibold text-slate-900">Report</h2>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Export PDF
        </Button>
      </div>
      {quality ? (
        <div className="mb-4">
          <QualityBadge quality={quality} />
        </div>
      ) : null}
      <article className="prose prose-slate prose-sm prose-headings:font-semibold prose-a:text-sky-700 max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer nofollow">
                {children}
              </a>
            ),
          }}
        >
          {markdown}
        </ReactMarkdown>
      </article>
    </div>
  );
}
