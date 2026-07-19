"use client";

import { useState } from "react";
import { KeyRound, Trash2, ShieldCheck, Monitor, Clock } from "lucide-react";
import { useApiKey } from "@/components/byok/api-key-provider";
import { KeyOnboarding } from "@/components/byok/key-onboarding";
import { Button } from "@/components/ui/button";
import { maskKey } from "@/lib/ai/redact";

export function KeySettings() {
  const { apiKey, mode, info, removeKey } = useApiKey();
  const [replacing, setReplacing] = useState(false);

  if (replacing || !apiKey) {
    return (
      <div className="space-y-3">
        <KeyOnboarding compact />
        {apiKey ? (
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={() => setReplacing(false)}>
              Cancel
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <KeyRound className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">OpenRouter key connected</p>
              <p className="font-mono text-xs text-slate-500">{maskKey(apiKey)}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
            Active
          </span>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              {mode === "device" ? (
                <Monitor className="h-3.5 w-3.5" />
              ) : (
                <Clock className="h-3.5 w-3.5" />
              )}
              Stored
            </dt>
            <dd className="mt-1 text-sm text-slate-800">
              {mode === "device" ? "On this device" : "This tab only"}
            </dd>
            <dd className="text-xs text-slate-500">
              {mode === "device"
                ? "Persists in this browser until removed."
                : "Cleared when you close the tab."}
            </dd>
          </div>
          {info?.creditRemaining != null ? (
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs font-medium text-slate-500">Credit remaining</dt>
              <dd className="mt-1 text-sm text-slate-800">${info.creditRemaining.toFixed(2)}</dd>
              <dd className="text-xs text-slate-500">Reported by OpenRouter at last check.</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setReplacing(true)}>
            Replace key
          </Button>
          <Button variant="destructive" size="sm" onClick={removeKey}>
            <Trash2 className="h-4 w-4" />
            Remove key
          </Button>
        </div>
      </div>

      <div className="flex gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        <p>
          <span className="font-medium text-slate-800">How your key is handled.</span> It is held
          only in this browser and sent with each research request so the agents can call OpenRouter
          as you. It is never stored in our database, never written to logs, and never shared with
          other users. This app has no key of its own — removing yours stops all research.
        </p>
      </div>
    </div>
  );
}
