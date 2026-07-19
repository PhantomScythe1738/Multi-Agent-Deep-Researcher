"use client";

import { useCallback, useState } from "react";
import { Search, Sparkles, ChevronDown, Globe, FileText, Scale, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PdfUpload } from "@/components/research/pdf-upload";
import { ResearchRunner } from "@/components/research/research-runner";
import { MAX_PDFS, MAX_QUESTION_LENGTH, MIN_QUESTION_LENGTH } from "@/lib/constants";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "How do recent studies compare on the productivity effects of a four-day work week?",
  "What is the current evidence on microplastics in drinking water and human health?",
  "How do experts disagree about the impact of remote work on team innovation?",
];

const STAGES = [
  {
    icon: Sparkles,
    label: "Plans the research",
    detail: "Turns your question into focused searches",
  },
  { icon: Globe, label: "Searches the web", detail: "Up to 3 live searches via Tavily" },
  { icon: FileText, label: "Searches your PDFs", detail: "Finds the most relevant passages" },
  { icon: Scale, label: "Weighs the evidence", detail: "Flags contradictions and gaps" },
  { icon: Lightbulb, label: "Writes a cited report", detail: "Every claim links to a source" },
];

export function ResearchForm({ userId }: { userId: string }) {
  const [question, setQuestion] = useState("");
  const [readyIds, setReadyIds] = useState<string[]>([]);
  const [started, setStarted] = useState<{ question: string; fileIds: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHow, setShowHow] = useState(false);

  const onReadyChange = useCallback((ids: string[]) => setReadyIds(ids), []);
  const trimmed = question.trim();
  const tooShort = trimmed.length < MIN_QUESTION_LENGTH;

  const start = () => {
    if (tooShort) {
      setError(
        `Please write at least ${MIN_QUESTION_LENGTH} characters so the agents have enough to work with.`,
      );
      return;
    }
    setError(null);
    setStarted({ question: trimmed, fileIds: readyIds });
  };

  if (started) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Your research</h2>
            <p className="line-clamp-1 text-sm text-slate-500">{started.question}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setStarted(null)}>
            New research
          </Button>
        </div>
        <ResearchRunner question={started.question} fileIds={started.fileIds} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="space-y-2">
          <Label htmlFor="question" className="text-base">
            What do you want to research?
          </Label>
          <p className="text-sm text-slate-500">
            Ask something that needs several sources to answer well — comparisons and disagreements
            work best.
          </p>
          <Textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. How do recent studies compare with my internal report on the effects of a four-day work week?"
            rows={4}
            maxLength={MAX_QUESTION_LENGTH}
            className="mt-1 text-base"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>{tooShort ? `At least ${MIN_QUESTION_LENGTH} characters` : "Looks good"}</span>
            <span>
              {trimmed.length}/{MAX_QUESTION_LENGTH}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-slate-500">Not sure? Try one of these:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setQuestion(ex);
                  setError(null);
                }}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs text-slate-700 transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-900"
              >
                {ex.length > 62 ? ex.slice(0, 62) + "…" : ex}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-2 border-t border-slate-100 pt-5">
          <Label>
            Add your own PDFs <span className="font-normal text-slate-400">(optional)</span>
          </Label>
          <p className="text-xs text-slate-500">
            Up to {MAX_PDFS} text-based PDFs, 10&nbsp;MB each. Scanned/photo PDFs aren&apos;t
            supported. Your files stay private to your account.
          </p>
          <PdfUpload userId={userId} onReadyChange={onReadyChange} />
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button size="lg" onClick={start} disabled={tooShort} className="sm:w-auto">
            <Search className="h-4 w-4" />
            Start research
          </Button>
          <p className="text-xs text-slate-400">
            {tooShort ? "Write your question to enable this" : "Takes about 40 seconds"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => setShowHow((s) => !s)}
          className="flex w-full items-center justify-between px-5 py-3.5 text-left"
          aria-expanded={showHow}
        >
          <span className="text-sm font-medium text-slate-900">
            What happens when I click start?
          </span>
          <ChevronDown
            className={cn("h-4 w-4 text-slate-400 transition-transform", showHow && "rotate-180")}
          />
        </button>
        {showHow ? (
          <ol className="space-y-3 border-t border-slate-100 px-5 py-4">
            {STAGES.map(({ icon: Icon, label, detail }, i) => (
              <li key={label} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {i + 1}. {label}
                  </p>
                  <p className="text-xs text-slate-500">{detail}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </div>
  );
}
