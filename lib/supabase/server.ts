import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Supabase client bound to the current request's auth cookies.
 * Use for all user-scoped reads/writes so RLS applies as the signed-in user.
 */
export async function createClient() {
  const env = publicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` is called from a Server Component render where cookies
            // are read-only. The middleware refreshes the session instead, so
            // this can be safely ignored.
          }
        },
      },
    },
  );
}

/**
 * Service-role client that BYPASSES RLS. Server-only.
 *
 * Use ONLY for narrowly-scoped operations that genuinely need it, and ALWAYS
 * filter explicitly by the authenticated user's id. Never expose to the browser.
 */
export function createServiceRoleClient() {
  const env = publicEnv();
  const secrets = serverEnv();
  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    secrets.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
