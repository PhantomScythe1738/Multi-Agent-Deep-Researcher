import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { RATE_LIMIT_MAX_RUNS, RATE_LIMIT_WINDOW_MS } from "@/lib/constants";

/**
 * Simple DB-backed per-user rate limit: count the caller's runs in the trailing
 * window. RLS scopes the count to the current user automatically.
 */
export async function checkRunRateLimit(
  supabase: SupabaseClient<Database>,
): Promise<{ ok: boolean; used: number; limit: number }> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("research_runs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);

  const used = count ?? 0;
  return { ok: used < RATE_LIMIT_MAX_RUNS, used, limit: RATE_LIMIT_MAX_RUNS };
}
