"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";

export default function InvitePage() {
  const params = useParams();
  const code = params.code as string;
  const { t } = useI18n();
  const [isApp, setIsApp] = useState(false);

  useEffect(() => {
    const isCapacitor =
      typeof window !== "undefined" &&
      (window as unknown as Record<string, unknown>).Capacitor !== undefined;

    if (isCapacitor) {
      setIsApp(true);
      window.location.replace(`/friends?invite=${encodeURIComponent(code)}`);
    }
  }, [code]);

  if (isApp) return null;

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

        <div className="mb-6 rounded-[20px] bg-[#fef3f6] px-5 py-4 text-center">
          <p className="mb-1 text-[12px] text-[#8d99ac]">{t("invite_code_label")}</p>
          <p className="font-serif text-[24px] font-bold text-[#1f2a3d]">
            {decodeURIComponent(code)}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href="/download"
            className="flex items-center justify-center rounded-full bg-[#efb8c2] py-3.5 text-[16px] font-bold text-white transition-opacity hover:opacity-90"
          >
            {t("invite_download_app")}
          </a>
          <p className="text-center text-[12px] text-[#8d99ac]">
            {t("invite_instruction")}
          </p>
        </div>
      </div>

      <p className="mt-8 text-[12px] text-[#8d99ac]">
        Doyakmin &middot; {t("common_brand")}
      </p>
    </div>
  );
}
