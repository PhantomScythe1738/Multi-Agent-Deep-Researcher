import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ResearchForm } from "@/components/research/research-form";
import { isDemoSafeMode } from "@/lib/env";

export default async function HomePage() {
  const user = await requireUser();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Multi-Agent AI Deep Researcher
        </h1>
        <p className="mt-2 text-slate-600">
          Specialized agents plan, retrieve evidence from live web search and your PDFs, weigh
          contradictions, and compile an evidence-backed report with traceable citations.
        </p>
      </div>

      <ResearchForm userId={user.id} />

      <div className="mt-6 flex items-center gap-4 text-sm text-slate-500">
        <Link href="/history" className="font-medium text-slate-900 underline">
          View research history
        </Link>
        {isDemoSafeMode() ? (
          <Link href="/demo" className="font-medium text-slate-900 underline">
            View a demo sample
          </Link>
        ) : null}
      </div>
    </main>
  );
}
