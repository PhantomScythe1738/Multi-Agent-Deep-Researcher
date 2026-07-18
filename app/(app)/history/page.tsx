import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "History — Multi-Agent AI Deep Researcher",
};

export default function HistoryPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">Research history</h1>
      <Card>
        <CardHeader>
          <CardTitle>No runs yet</CardTitle>
          <CardDescription>
            Your completed research runs will appear here once the workflow is wired up.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </main>
  );
}
