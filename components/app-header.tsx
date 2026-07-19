import Link from "next/link";
import { FlaskConical, Settings } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { KeyStatusPill } from "@/components/byok/key-status-pill";
import { cn } from "@/lib/utils";

/** Top navigation for authenticated pages. Hidden in print via `print:hidden`. */
export function AppHeader({ email }: { email?: string | null }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <FlaskConical className="h-5 w-5 text-sky-700" />
          <span className="hidden sm:inline">Deep Researcher</span>
        </Link>

        <nav className="flex items-center gap-1.5">
          <KeyStatusPill />
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "hidden sm:inline-flex",
            )}
          >
            New research
          </Link>
          <Link href="/history" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            History
          </Link>
          <Link
            href="/settings"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
            aria-label="Settings"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
          {email ? (
            <span className="hidden max-w-[14ch] truncate text-xs text-slate-500 lg:inline">
              {email}
            </span>
          ) : null}
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </nav>
      </div>
    </header>
  );
}
