import { requireUser } from "@/lib/auth";
import { ResearchForm } from "@/components/research/research-form";

export default async function HomePage() {
  const user = await requireUser();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Multi-Agent AI Deep Researcher
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          A team of AI agents plans your research, searches the live web and your own PDFs, weighs
          contradictions, and writes a report where every claim links back to a source.
        </p>
      </div>

      <ResearchForm userId={user.id} />
    </main>
  );
}
