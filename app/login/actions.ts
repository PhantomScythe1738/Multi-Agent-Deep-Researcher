"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  redirectTo: z.string().optional(),
});

export type AuthState = { error: string | null; notice?: string | null };

function safeRedirectTo(value: string | undefined): string {
  // Only allow same-origin relative paths to avoid open-redirects.
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return { error: "Invalid email or password." };
  }

  redirect(safeRedirectTo(parsed.data.redirectTo));
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return { error: error.message };
  }

  // When email confirmation is enabled, no session is returned yet.
  if (!data.session) {
    return { error: null, notice: "Check your email to confirm your account, then sign in." };
  }

  redirect(safeRedirectTo(parsed.data.redirectTo));
}
