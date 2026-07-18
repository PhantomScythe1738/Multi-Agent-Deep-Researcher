"use client";

import { useCallback, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PdfUpload } from "@/components/research/pdf-upload";
import { ResearchRunner } from "@/components/research/research-runner";
import { MAX_PDFS, MAX_QUESTION_LENGTH, MIN_QUESTION_LENGTH } from "@/lib/constants";

export function ResearchForm({ userId }: { userId: string }) {
  const [question, setQuestion] = useState("");
  const [readyIds, setReadyIds] = useState<string[]>([]);
  const [started, setStarted] = useState<{ question: string; fileIds: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onReadyChange = useCallback((ids: string[]) => setReadyIds(ids), []);

  const start = () => {
    const q = question.trim();
    if (q.length < MIN_QUESTION_LENGTH) {
      setError(`Please enter at least ${MIN_QUESTION_LENGTH} characters.`);
      return;
    }
    if (q.length > MAX_QUESTION_LENGTH) {
      setError(`Please keep the question under ${MAX_QUESTION_LENGTH} characters.`);
      return;
    }
    setError(null);
    setStarted({ question: q, fileIds: readyIds });
  };

  if (started) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between print:hidden">
          <h2 className="text-lg font-semibold text-slate-900">Researching…</h2>
          <Button variant="ghost" size="sm" onClick={() => setStarted(null)}>
            New research
          </Button>
        </div>
        <ResearchRunner question={started.question} fileIds={started.fileIds} />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Start a new investigation</CardTitle>
        <CardDescription>
          Ask a multi-hop question. Optionally attach up to {MAX_PDFS} text-based PDFs (max
          10&nbsp;MB each). Agents will plan, search the web, search your PDFs, weigh
          contradictions, and write a cited report.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="question">Research question</Label>
          <Textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. How do recent studies and my attached report compare on the health effects of intermittent fasting?"
            rows={4}
            maxLength={MAX_QUESTION_LENGTH}
          />
        </div>

        <div className="space-y-2">
          <Label>Attachments (optional)</Label>
          <PdfUpload userId={userId} onReadyChange={onReadyChange} />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex items-center gap-3">
          <Button onClick={start}>
            <Search className="h-4 w-4" />
            Start research
          </Button>
          <span className="text-xs text-slate-400">
            Scope: ≤3 web queries, ≤{MAX_PDFS} PDFs, bounded agent steps.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
