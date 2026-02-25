"use client";

import { Loader2 } from "lucide-react";
import { useRequireAuth } from "@/lib/auth";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, firebaseUser } = useRequireAuth();

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!firebaseUser) return null;

  return <>{children}</>;
}
