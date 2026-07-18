"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Delete a research run and its cascaded events/sources. RLS ensures a user can
 * only delete their own run (the delete simply matches nothing otherwise).
 */
export async function deleteRun(runId: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase.from("research_runs").delete().eq("id", runId);
  if (error) return { ok: false };

  revalidatePath("/history");
  return { ok: true };
}
