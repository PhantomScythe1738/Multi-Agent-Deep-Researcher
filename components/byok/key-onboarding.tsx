"use client";

import { useState } from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  ExternalLink,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useApiKey } from "@/components/byok/api-key-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { KeyStorageMode } from "@/lib/byok/key-store";

const STEPS = [
  {
    n: 1,
    title: "Create a free OpenRouter account",
    body: "OpenRouter gives you access to free AI models. No card needed to start.",
  },
  {
    n: 2,
    title: "Copy your API key",
    body: "On the Keys page, create a key and copy it. It starts with sk-or-.",
  },
  { n: 3, title: "Paste it below", body: "We check it works, then you're ready to research." },
];

export function KeyOnboarding({ compact = false }: { compact?: boolean }) {
  const { saveKey } = useApiKey();
  const [value, setValue] = useState("");
  const [remember, setRemember] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(null);
    const mode: KeyStorageMode = remember ? "device" : "session";
    const res = await saveKey(value, mode);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? "That key could not be validated.");
      return;
    }
    const credit = res.info?.creditRemaining;
    setOk(
      typeof credit === "number"
        ? `Key verified — $${credit.toFixed(2)} credit remaining.`
        : "Key verified.",
    );
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              {compact ? "Update your OpenRouter key" : "Connect your AI key to begin"}
            </h1>
            <p className="text-sm text-slate-500">
              This app runs on <span className="font-medium text-slate-700">your</span> OpenRouter
              key — you stay in control of usage and cost.
            </p>
          </div>
        </div>

        {!compact ? (
          <ol className="mb-6 space-y-3">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                  {s.n}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-900">{s.title}</p>
                  <p className="text-sm text-slate-500">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : null}

        <a
          href="https://openrouter.ai/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-sky-700 hover:underline"
        >
          Get a free key at openrouter.ai/keys
          <ExternalLink className="h-3.5 w-3.5" />
        </a>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">OpenRouter API key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={reveal ? "text" : "password"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="sk-or-v1-…"
                autoComplete="off"
                spellCheck={false}
                className="pr-10 font-mono text-xs"
                required
              />
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label={reveal ? "Hide key" : "Show key"}
              >
                {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
            />
            <span className="text-sm">
              <span className="font-medium text-slate-900">Remember on this device</span>
              <span className="block text-slate-500">
                {remember
                  ? "Stored in this browser until you remove it. Avoid on shared computers."
                  : "Off — the key is kept for this tab only and cleared when you close it."}
              </span>
            </span>
          </label>

          {error ? (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {ok ? (
            <p
              role="status"
              className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
            >
              <CheckCircle2 className="h-4 w-4" />
              {ok}
            </p>
          ) : null}

          <Button type="submit" disabled={busy || value.trim().length === 0} className="w-full">
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Checking your key…
              </>
            ) : (
              "Verify key & continue"
            )}
          </Button>
        </form>

        <div className="mt-5 flex gap-2.5 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <p>
            <span className="font-medium text-slate-800">Where your key lives.</span> It is stored
            only in this browser and sent with each research request so the agents can call
            OpenRouter on your behalf. It is <span className="font-medium">never</span> saved to our
            database, never written to logs, and never shared. Remove it any time from Settings.
          </p>
        </div>
      </div>
    </div>
  );
}
