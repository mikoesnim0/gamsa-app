"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthContext";

export function useRequireAuth() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.loading && !auth.firebaseUser) {
      router.replace("/");
    }
  }, [auth.loading, auth.firebaseUser, router]);

  return auth;
}
