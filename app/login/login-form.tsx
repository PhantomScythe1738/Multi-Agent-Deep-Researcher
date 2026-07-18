"use client";

import { useActionState } from "react";
import { login, signup, type AuthState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthState = { error: null, notice: null };

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [loginState, loginAction, loginPending] = useActionState(login, initialState);
  const [signupState, signupAction, signupPending] = useActionState(signup, initialState);

  const error = loginState.error ?? signupState.error;
  const notice = loginState.notice ?? signupState.notice;
  const pending = loginPending || signupPending;

  return (
    <form className="space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo ?? "/"} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="At least 8 characters"
          required
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-sm text-emerald-700">
          {notice}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <Button type="submit" formAction={loginAction} disabled={pending}>
          {loginPending ? "Signing in…" : "Sign in"}
        </Button>
        <Button type="submit" variant="outline" formAction={signupAction} disabled={pending}>
          {signupPending ? "Creating account…" : "Create account"}
        </Button>
      </div>
    </form>
  );
}
