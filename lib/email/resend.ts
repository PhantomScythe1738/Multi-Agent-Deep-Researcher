import "server-only";
import { Resend } from "resend";
import { serverEnv } from "@/lib/env";
import { redactSecrets } from "@/lib/ai/redact";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export type SendEmailResult =
  { ok: true; id: string | null } | { ok: false; error: string; disabled?: boolean };

/** Whether transactional email is configured for this deployment. */
export function isEmailConfigured(): boolean {
  return Boolean(serverEnv().RESEND_API_KEY);
}

/**
 * Send a transactional email via Resend.
 *
 * Server-only: the API key is read from server env and never reaches the
 * browser. Failures are returned (not thrown) so callers can degrade quietly —
 * email is never allowed to break a user flow. Provider errors are redacted.
 *
 * NOTE: this is for email sent BY the app. Supabase auth emails (signup
 * confirmation, password reset) are sent by Supabase itself and must be
 * configured separately as Custom SMTP using the same Resend key.
 */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<SendEmailResult> {
  const env = serverEnv();
  if (!env.RESEND_API_KEY) {
    return { ok: false, disabled: true, error: "Email is not configured (RESEND_API_KEY unset)." };
  }

  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    if (error) {
      return {
        ok: false,
        error: redactSecrets(error.message ?? "Email provider rejected the request."),
      };
    }
    return { ok: true, id: data?.id ?? null };
  } catch (err) {
    return {
      ok: false,
      error: redactSecrets(err instanceof Error ? err.message : "Email send failed."),
    };
  }
}
