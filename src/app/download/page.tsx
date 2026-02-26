"use client";

import { useEffect, useState } from "react";
import { Heart, Smartphone } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

type Platform = "android" | "ios" | "unknown";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "unknown";
}

const STORE_URLS: Record<Platform, string | null> = {
  android: null,
  ios: null,
  unknown: null,
};

export default function DownloadPage() {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const { t } = useI18n();

  useEffect(() => {
    const detected = detectPlatform();
    setPlatform(detected);
    const storeUrl = STORE_URLS[detected];
    if (storeUrl) window.location.replace(storeUrl);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f6f6] px-6">
      <div className="w-full max-w-[380px] rounded-[40px] border border-[#ece8ea] bg-white px-8 py-10 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#fef3f6]">
            <Heart className="h-8 w-8 text-[#efb8c2]" fill="#efb8c2" />
          </div>
          <h1 className="font-serif text-[28px] font-bold text-[#1f2a3d]">
            {t("common_brand")}
          </h1>
          <p className="text-center text-[14px] leading-relaxed text-[#8d99ac] whitespace-pre-line">
            {t("common_brand_tagline")}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              const url = STORE_URLS.android;
              if (url) window.location.href = url;
              else alert(t("download_google_coming"));
            }}
            className="flex items-center justify-center gap-2 rounded-full bg-[#1f2a3d] py-3.5 text-[15px] font-bold text-white transition-opacity hover:opacity-90"
          >
            <Smartphone className="h-4 w-4" />
            {t("download_google_play")}
          </button>

          <button
            onClick={() => {
              const url = STORE_URLS.ios;
              if (url) window.location.href = url;
              else alert(t("download_app_store_coming"));
            }}
            className="flex items-center justify-center gap-2 rounded-full border border-[#ece8ea] bg-white py-3.5 text-[15px] font-bold text-[#1f2a3d] transition-opacity hover:opacity-90"
          >
            <Smartphone className="h-4 w-4" />
            {t("download_app_store")}
          </button>
        </div>

        {platform !== "unknown" && (
          <p className="mt-4 text-center text-[12px] text-[#8d99ac]">
            {t("download_platform_detected", { platform: platform === "android" ? "Android" : "iOS" })}
          </p>
        )}

        <div className="mt-6 text-center">
          <a
            href="https://gamsa-app.vercel.app"
            className="text-[13px] font-medium text-[#efb8c2] underline underline-offset-2"
          >
            {t("download_use_web")}
          </a>
        </div>
      </div>

      <p className="mt-8 text-[12px] text-[#8d99ac]">
        Doyakmin &middot; {t("common_brand")}
      </p>
    </div>
  );
}
