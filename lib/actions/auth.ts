"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/logging/events";

export async function signOut() {
  const supabase = await createClient();
  await logEvent(supabase, "logout");
  await supabase.auth.signOut();
  redirect("/login");
}
