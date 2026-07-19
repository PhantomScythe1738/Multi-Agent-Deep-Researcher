import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { ApiKeyProvider } from "@/components/byok/api-key-provider";
import { KeyGate } from "@/components/byok/key-gate";

// Auth-dependent: always render per-request, never prerender at build.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <ApiKeyProvider>
      <div className="flex min-h-screen flex-col">
        <AppHeader email={user.email} />
        <KeyGate>{children}</KeyGate>
      </div>
    </ApiKeyProvider>
  );
}
