"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Android hardware back button handler (Capacitor)
 * - On home page ("/home"): minimize app (exit)
 * - On other pages: navigate back
 */
export function useAndroidBackButton() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    async function setup() {
      try {
        const { App } = await import("@capacitor/app");
        const listener = await App.addListener("backButton", ({ canGoBack }) => {
          // On home/root pages, minimize the app
          if (pathname === "/home" || pathname === "/") {
            App.minimizeApp();
          } else if (canGoBack) {
            router.back();
          } else {
            router.push("/home");
          }
        });
        cleanup = () => listener.remove();
      } catch {
        // Not running in Capacitor environment — ignore
      }
    }

    setup();
    return () => cleanup?.();
  }, [pathname, router]);
}
