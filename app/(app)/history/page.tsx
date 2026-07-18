import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteRunButton } from "@/components/research/delete-run-button";
import type { QualityReport } from "@/lib/report/validate";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "History — Multi-Agent AI Deep Researcher",
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: runs } = await supabase
    .from("research_runs")
    .select("id, question, status, quality, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">Research history</h1>

      {!runs || runs.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No runs yet</CardTitle>
            <CardDescription>
              Start a research run from the{" "}
              <Link href="/" className="font-medium text-slate-900 underline">
                home page
              </Link>
              .
            </CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      ) : (
        <ul className="space-y-3">
          {runs.map((run) => {
            const score = (run.quality as QualityReport | null)?.score ?? null;
            return (
              <li
                key={run.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/research/${run.id}`}
                    className="line-clamp-2 font-medium text-slate-900 hover:underline"
                  >
                    {run.question}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(run.created_at)} · {run.status}
                    {score !== null ? ` · quality ${score}/100` : ""}
                  </p>
                </div>
                <DeleteRunButton runId={run.id} />
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
