import { BottomNav } from "@/components/layout/bottom-nav";
import { AuthGate } from "@/components/layout/auth-gate";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col">
      <AuthGate>
        <main className="flex-1 pb-24">{children}</main>
        <BottomNav />
      </AuthGate>
    </div>
  );
}
