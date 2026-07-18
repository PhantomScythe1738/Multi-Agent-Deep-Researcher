import { notFound } from "next/navigation";
import { isDemoSafeMode } from "@/lib/env";
import { getDemoRun } from "@/lib/demo/sample";
import { AgentTimeline } from "@/components/research/agent-timeline";
import { ReportView } from "@/components/research/report-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Demo Sample — Multi-Agent AI Deep Researcher",
};

export default function DemoPage() {
  if (!isDemoSafeMode()) notFound();
  const demo = getDemoRun();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-800 print:hidden">
        Demo Sample — not live research. This is a pre-recorded example to illustrate the workflow.
      </div>

      <h1 className="mb-6 text-xl font-bold tracking-tight text-slate-900 print:hidden">
        {demo.question}
      </h1>

      <div className="grid gap-6">
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle>Agent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <AgentTimeline events={demo.events} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <ReportView markdown={demo.reportMarkdown} quality={demo.quality} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
