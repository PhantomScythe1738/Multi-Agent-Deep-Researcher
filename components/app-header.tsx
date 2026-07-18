import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Top navigation for authenticated pages. Hidden in print via `print:hidden`. */
export function AppHeader({ email }: { email?: string | null }) {
  return (
    <header className="border-b border-slate-200 bg-white print:hidden">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <FlaskConical className="h-5 w-5 text-slate-700" />
          <span>Deep Researcher</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            New research
          </Link>
          <Link href="/history" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            History
          </Link>
          {email ? <span className="hidden text-sm text-slate-500 sm:inline">{email}</span> : null}
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
