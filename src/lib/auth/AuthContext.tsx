"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User as FirebaseUser } from "firebase/auth";
import { api } from "@/lib/api";
import type { User } from "@/types";

interface AuthState {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  isNewUser: boolean;
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    user: null,
    loading: true,
    isNewUser: false,
  });

  useEffect(() => {
    const unsubscribe = api.auth.onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await Promise.race([
            api.auth.getUserProfile(firebaseUser.uid),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
          ]);
          setState({
            firebaseUser,
            user: userDoc,
            loading: false,
            isNewUser: userDoc === null || userDoc.name === "",
          });
        } catch {
          setState({
            firebaseUser,
            user: null,
            loading: false,
            isNewUser: true,
          });
        }
      } else {
        setState({
          firebaseUser: null,
          user: null,
          loading: false,
          isNewUser: false,
        });
      }
    });
    return unsubscribe;
  }, []);

  const signOut = useCallback(async () => {
    await api.auth.signOut();
  }, []);

  const refreshUser = useCallback(async () => {
    if (state.firebaseUser) {
      const userDoc = await api.auth.getUserProfile(state.firebaseUser.uid);
      setState((prev) => ({
        ...prev,
        user: userDoc,
        isNewUser: userDoc === null || userDoc.name === "",
      }));
    }
  }, [state.firebaseUser]);

  return (
    <AuthContext.Provider value={{ ...state, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
