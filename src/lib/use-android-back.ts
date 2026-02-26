"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * Android hardware back button handler (Capacitor)
 * - On home/root pages: minimize app (exit)
 * - On other pages: window.history.back() — identical to web browser back
 */
export function useAndroidBackButton() {
  const pathname = usePathname();

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    async function setup() {
      try {
        const { App } = await import("@capacitor/app");
        const listener = await App.addListener("backButton", () => {
          // On home/root pages, minimize the app
          if (pathname === "/home" || pathname === "/") {
            App.minimizeApp();
          } else {
            // Use native browser history — identical to web "back" button
            window.history.back();
          }
        });
        cleanup = () => listener.remove();
      } catch {
        // Not running in Capacitor environment — ignore
      }
    }

    setup();
    return () => cleanup?.();
  }, [pathname]);
}
