import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, isEmailConfigured } from "@/lib/email/resend";
import { logEvent } from "@/lib/logging/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Send a test email to the SIGNED-IN USER'S OWN address.
 *
 * The recipient is taken from the session, never from the request body, so this
 * cannot be used as an open relay to email arbitrary people.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Email is not configured. Set RESEND_API_KEY.", code: "email_disabled" },
      { status: 503 },
    );
  }

  const result = await sendEmail({
    to: user.email,
    subject: "Multi-Agent AI Deep Researcher — test email",
    html: `
      <h2>Email is working 🎉</h2>
      <p>This test email was sent from <strong>Multi-Agent AI Deep Researcher</strong>
      to confirm your Resend configuration is correct.</p>
      <p>If you received this, transactional email is set up properly.</p>
    `,
  });

  await logEvent(supabase, result.ok ? "email_sent" : "email_failed", {
    purpose: "test",
    ...(result.ok ? { id: result.id } : { reason: result.error }),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ sent: true, to: user.email, id: result.id });
}
