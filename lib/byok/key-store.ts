/**
 * Browser-side storage for the user's OpenRouter key (BYOK).
 *
 * The key NEVER goes to our database. It lives only in this browser:
 *  - "session" (default): sessionStorage — cleared when the tab closes.
 *  - "device"  (opt-in) : localStorage  — persists on this device until removed.
 *
 * It is sent to our server per research request (over HTTPS) purely so the
 * server-side agents can call OpenRouter, and is held in memory for that run
 * only. We deliberately do NOT pretend to encrypt it here: any key we could use
 * to decrypt it in the browser would also ship in the JavaScript bundle.
 */

export type KeyStorageMode = "session" | "device";

const KEY_ITEM = "mar.openrouter.key";
const MODE_ITEM = "mar.openrouter.mode";

export interface StoredKey {
  apiKey: string;
  mode: KeyStorageMode;
}

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

/** Read the key from device storage first, then session storage. */
export function loadKey(): StoredKey | null {
  if (!canUseStorage()) return null;
  try {
    const deviceKey = window.localStorage.getItem(KEY_ITEM);
    if (deviceKey) return { apiKey: deviceKey, mode: "device" };
    const sessionKey = window.sessionStorage.getItem(KEY_ITEM);
    if (sessionKey) return { apiKey: sessionKey, mode: "session" };
  } catch {
    // Storage can be blocked (private mode / strict settings).
  }
  return null;
}

/** Persist the key in the chosen store, clearing the other one. */
export function saveKey(apiKey: string, mode: KeyStorageMode): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(KEY_ITEM);
    window.sessionStorage.removeItem(KEY_ITEM);
    const store = mode === "device" ? window.localStorage : window.sessionStorage;
    store.setItem(KEY_ITEM, apiKey);
    window.localStorage.setItem(MODE_ITEM, mode);
  } catch {
    // Non-fatal: the key simply won't survive a reload.
  }
}

/** Remove the key from both stores. */
export function clearKey(): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(KEY_ITEM);
    window.sessionStorage.removeItem(KEY_ITEM);
    window.localStorage.removeItem(MODE_ITEM);
  } catch {
    // ignore
  }
}
