"use client";

import { Loader2 } from "lucide-react";
import { useApiKey } from "@/components/byok/api-key-provider";
import { KeyOnboarding } from "@/components/byok/key-onboarding";

/**
 * Hard gate: no research UI is reachable until the user has supplied a
 * validated OpenRouter key of their own. There is no server-side key to fall
 * back to, so this is a genuine gate rather than a cosmetic one.
 */
export function KeyGate({ children }: { children: React.ReactNode }) {
  const { state } = useApiKey();

  if (state === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (state === "absent") {
    return (
      <div className="px-4 py-10">
        <KeyOnboarding />
      </div>
    );
  }

  return <>{children}</>;
}
