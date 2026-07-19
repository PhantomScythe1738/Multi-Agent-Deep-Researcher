import Link from "next/link";
import { KeySettings } from "@/components/byok/key-settings";
import { isDemoSafeMode } from "@/lib/env";

export const metadata = {
  title: "Settings — Multi-Agent AI Deep Researcher",
};

export default function SettingsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">Settings</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        Manage the AI key this app uses on your behalf.
      </p>

      <KeySettings />

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Your data</h2>
        <p className="mt-1 text-sm text-slate-500">
          Research runs, uploaded PDFs and their extracted text are stored against your account and
          protected by row-level security. Delete individual runs from{" "}
          <Link href="/history" className="font-medium text-sky-700 hover:underline">
            History
          </Link>
          .
        </p>
        {isDemoSafeMode() ? (
          <p className="mt-3 text-sm text-slate-500">
            Provider rate-limited?{" "}
            <Link href="/demo" className="font-medium text-sky-700 hover:underline">
              View the labelled demo sample
            </Link>{" "}
            to see what a finished report looks like.
          </p>
        ) : null}
      </div>
    </main>
  );
}
