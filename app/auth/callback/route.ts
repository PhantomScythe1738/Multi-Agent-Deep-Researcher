import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/logging/events";

export const dynamic = "force-dynamic";

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change"];

function safePath(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

/**
 * Auth redirect handler for email confirmation, magic links, recovery and OAuth.
 *
 * Supabase sends users here in one of three shapes, so all are handled:
 *  1. `?code=…`                  — PKCE / OAuth  -> exchangeCodeForSession
 *  2. `?token_hash=…&type=signup`— email links using {{ .TokenHash }} -> verifyOtp
 *  3. `?error=…&error_description=…` — expired/used link -> show the real reason
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const next = safePath(searchParams.get("next"));

  // 3. Supabase reported a problem with the link itself.
  const providerError = searchParams.get("error") ?? searchParams.get("error_code");
  if (providerError) {
    const description = searchParams.get("error_description") ?? providerError;
    const supabase = await createClient();
    await logEvent(supabase, "login_failed", { stage: "auth_callback", reason: description });
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(description.slice(0, 200))}`,
    );
  }

  const supabase = await createClient();

  // 1. PKCE / OAuth code exchange.
  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await logEvent(supabase, "login_success", { method: "oauth_or_pkce" });
      return NextResponse.redirect(`${origin}${next}`);
    }
    await logEvent(supabase, "login_failed", { stage: "code_exchange", reason: error.message });
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("That sign-in link is invalid or has expired. Please request a new one.")}`,
    );
  }

  // 2. Email link carrying a token hash (confirmation, recovery, magic link).
  const tokenHash = searchParams.get("token_hash");
  const rawType = searchParams.get("type");
  const type = OTP_TYPES.includes(rawType as EmailOtpType) ? (rawType as EmailOtpType) : null;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      await logEvent(supabase, "login_success", { method: `otp_${type}` });
      return NextResponse.redirect(`${origin}${next}`);
    }
    await logEvent(supabase, "login_failed", { stage: "verify_otp", type, reason: error.message });
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("That confirmation link is invalid or has expired. Please request a new one.")}`,
    );
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("That link is missing its confirmation token.")}`,
  );
}
