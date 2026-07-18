import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

/**
 * Return the authenticated user or redirect to /login.
 * Use at the top of every protected Server Component / route handler.
 */
export async function requireUser(redirectTo?: string): Promise<User> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const target = redirectTo ? `/login?redirectTo=${encodeURIComponent(redirectTo)}` : "/login";
    redirect(target);
  }
  return user;
}
