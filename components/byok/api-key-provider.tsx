"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  clearKey as clearStoredKey,
  loadKey,
  saveKey as persistKey,
  type KeyStorageMode,
} from "@/lib/byok/key-store";

export interface KeyInfo {
  label?: string;
  creditRemaining?: number | null;
  isFreeTier?: boolean;
}

type KeyState = "loading" | "absent" | "present";

interface ApiKeyContextValue {
  state: KeyState;
  apiKey: string | null;
  mode: KeyStorageMode | null;
  info: KeyInfo | null;
  /** Validate against OpenRouter and store on success. */
  saveKey: (
    apiKey: string,
    mode: KeyStorageMode,
  ) => Promise<{ ok: boolean; error?: string; info?: KeyInfo }>;
  removeKey: () => void;
}

const ApiKeyContext = createContext<ApiKeyContextValue | null>(null);

export function useApiKey(): ApiKeyContextValue {
  const ctx = useContext(ApiKeyContext);
  if (!ctx) throw new Error("useApiKey must be used inside <ApiKeyProvider>");
  return ctx;
}

export function ApiKeyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<KeyState>("loading");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [mode, setMode] = useState<KeyStorageMode | null>(null);
  const [info, setInfo] = useState<KeyInfo | null>(null);

  // Resolve storage after mount to avoid hydration mismatch.
  useEffect(() => {
    const stored = loadKey();
    if (stored) {
      setApiKey(stored.apiKey);
      setMode(stored.mode);
      setState("present");
    } else {
      setState("absent");
    }
  }, []);

  const saveKey = useCallback(async (candidate: string, nextMode: KeyStorageMode) => {
    const trimmed = candidate.trim();
    try {
      const res = await fetch("/api/key/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: trimmed }),
      });
      const json = await res.json();
      if (!res.ok || !json.valid) {
        return { ok: false as const, error: json.error ?? "That key could not be validated." };
      }
      persistKey(trimmed, nextMode);
      setApiKey(trimmed);
      setMode(nextMode);
      setInfo({
        label: json.label,
        creditRemaining: json.creditRemaining,
        isFreeTier: json.isFreeTier,
      });
      setState("present");
      return { ok: true as const, info: json as KeyInfo };
    } catch {
      return { ok: false as const, error: "Could not reach the validation service." };
    }
  }, []);

  const removeKey = useCallback(() => {
    clearStoredKey();
    setApiKey(null);
    setMode(null);
    setInfo(null);
    setState("absent");
  }, []);

  const value = useMemo(
    () => ({ state, apiKey, mode, info, saveKey, removeKey }),
    [state, apiKey, mode, info, saveKey, removeKey],
  );

  return <ApiKeyContext.Provider value={value}>{children}</ApiKeyContext.Provider>;
}
