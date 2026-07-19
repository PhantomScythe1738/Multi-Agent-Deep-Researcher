"use client";

import Link from "next/link";
import { KeyRound } from "lucide-react";
import { useApiKey } from "@/components/byok/api-key-provider";
import { cn } from "@/lib/utils";

/** Always-visible indicator of BYOK status. Click to manage the key. */
export function KeyStatusPill() {
  const { state, mode } = useApiKey();
  if (state === "loading") return null;

  const active = state === "present";
  return (
    <Link
      href="/settings"
      title={
        active
          ? mode === "device"
            ? "Key stored on this device — click to manage"
            : "Key active for this tab only — click to manage"
          : "No API key — click to add one"
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
          : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-emerald-500" : "bg-amber-500")}
        aria-hidden
      />
      <KeyRound className="h-3 w-3" />
      {active ? (mode === "device" ? "Key saved" : "Key active") : "Add key"}
    </Link>
  );
}
