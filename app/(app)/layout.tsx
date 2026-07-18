import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";

// Auth-dependent: always render per-request, never prerender at build.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader email={user.email} />
      {children}
    </div>
  );
}
