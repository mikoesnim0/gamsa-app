import { BottomNav } from "@/components/layout/bottom-nav";
import { AuthGate } from "@/components/layout/auth-gate";
import { AndroidBackHandler } from "@/components/layout/android-back-handler";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col">
      <AuthGate>
        <AndroidBackHandler />
        <main className="flex-1 pb-24">{children}</main>
        <BottomNav />
      </AuthGate>
    </div>
  );
}
