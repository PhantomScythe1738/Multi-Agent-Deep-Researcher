import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import { redactSecrets } from "@/lib/ai/redact";

/** Canonical event types written to public.app_logs. */
export type AppEventType =
  | "signup_success"
  | "signup_failed"
  | "login_success"
  | "login_failed"
  | "logout"
  | "research_started"
  | "research_completed"
  | "research_failed"
  | "ingest_completed"
  | "ingest_failed"
  | "api_key_validated"
  | "api_key_rejected";

/**
 * Record an application event in public.app_logs via the log_event() RPC.
 *
 * Fire-and-forget by design: logging must never break a user flow, so failures
 * are swallowed (and surfaced to the server console instead). `user_id` is set
 * by the database from auth.uid(), not by the caller, so it cannot be spoofed.
 *
 * Details are redacted before storage — never log secrets, keys, or passwords.
 */
export async function logEvent(
  supabase: SupabaseClient<Database>,
  eventType: AppEventType,
  details: Record<string, unknown> = {},
): Promise<void> {
  try {
    const safeDetails = JSON.parse(redactSecrets(JSON.stringify(details))) as Json;
    await supabase.rpc("log_event", {
      p_event_type: eventType,
      p_details: safeDetails,
    });
  } catch (err) {
    console.error("log_event failed", {
      eventType,
      reason: err instanceof Error ? redactSecrets(err.message).slice(0, 200) : "unknown",
    });
  }
}
