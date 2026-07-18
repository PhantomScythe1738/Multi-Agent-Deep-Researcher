import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Multi-Agent AI Deep Researcher
        </h1>
        <p className="mt-2 text-slate-600">
          Ask a research question and let specialized agents plan, retrieve evidence from live web
          search and your PDFs, weigh contradictions, and compile a cited report.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Start a new investigation</CardTitle>
          <CardDescription>
            The research form is being assembled. Upload support (max 2 text PDFs) and live agent
            streaming come online in the next build steps.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            View past runs on your{" "}
            <Link href="/history" className="font-medium text-slate-900 underline">
              history
            </Link>{" "}
            page.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
