"use client";

import { useEffect, useState } from "react";
import { Heart, Smartphone } from "lucide-react";

type Platform = "android" | "ios" | "unknown";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent.toLowerCase();
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "unknown";
}

// TODO: 스토어 등록 후 실제 URL로 교체
const STORE_URLS: Record<Platform, string | null> = {
  android: null, // Play Store URL
  ios: null, // App Store URL
  unknown: null,
};

export default function DownloadPage() {
  const [platform, setPlatform] = useState<Platform>("unknown");

  useEffect(() => {
    const detected = detectPlatform();
    setPlatform(detected);

    // 스토어 URL이 있으면 자동 리다이렉트
    const storeUrl = STORE_URLS[detected];
    if (storeUrl) {
      window.location.replace(storeUrl);
    }
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f8f6f6] px-6">
      <div className="w-full max-w-[380px] rounded-[40px] border border-[#ece8ea] bg-white px-8 py-10 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#fef3f6]">
            <Heart className="h-8 w-8 text-[#efb8c2]" fill="#efb8c2" />
          </div>
          <h1 className="font-serif text-[28px] font-bold text-[#1f2a3d]">
            감사노트
          </h1>
          <p className="text-center text-[14px] leading-relaxed text-[#8d99ac]">
            매일 감사를 기록하고,
            <br />그 마음이 상대방에게 도착하는 앱
          </p>
        </div>

        {/* Store buttons */}
        <div className="flex flex-col gap-3">
          {/* Android */}
          <button
            onClick={() => {
              const url = STORE_URLS.android;
              if (url) window.location.href = url;
              else alert("Google Play Store 등록 준비 중입니다.");
            }}
            className="flex items-center justify-center gap-2 rounded-full bg-[#1f2a3d] py-3.5 text-[15px] font-bold text-white transition-opacity hover:opacity-90"
          >
            <Smartphone className="h-4 w-4" />
            Google Play에서 다운로드
          </button>

          {/* iOS */}
          <button
            onClick={() => {
              const url = STORE_URLS.ios;
              if (url) window.location.href = url;
              else alert("App Store 등록 준비 중입니다.");
            }}
            className="flex items-center justify-center gap-2 rounded-full border border-[#ece8ea] bg-white py-3.5 text-[15px] font-bold text-[#1f2a3d] transition-opacity hover:opacity-90"
          >
            <Smartphone className="h-4 w-4" />
            App Store에서 다운로드
          </button>
        </div>

        {/* Platform hint */}
        {platform !== "unknown" && (
          <p className="mt-4 text-center text-[12px] text-[#8d99ac]">
            {platform === "android" ? "Android" : "iOS"} 기기가 감지되었습니다
          </p>
        )}

        {/* Web version link */}
        <div className="mt-6 text-center">
          <a
            href="https://gamsa-app.vercel.app"
            className="text-[13px] font-medium text-[#efb8c2] underline underline-offset-2"
          >
            웹 버전으로 바로 사용하기
          </a>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-[12px] text-[#8d99ac]">
        Doyakmin &middot; 감사노트
      </p>
    </div>
  );
}
