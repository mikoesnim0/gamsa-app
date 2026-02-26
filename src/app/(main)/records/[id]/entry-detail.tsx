"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { EmotionIcon } from "@/components/ui/emotion-icon";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n-context";
import type { GratitudeEntry, Target } from "@/types";

const EMOTION_KEYS: Record<string, string> = {
  gratitude: "emotion_gratitude",
  comfort: "emotion_comfort",
  respect: "emotion_respect",
  love: "emotion_love",
  warmth: "emotion_warmth",
  joy: "emotion_joy",
  nostalgia: "emotion_nostalgia",
  trust: "emotion_trust",
  hope: "emotion_hope",
};

export default function EntryDetailClient() {
  const params = useParams();
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const { t } = useI18n();
  const [entry, setEntry] = useState<GratitudeEntry | null>(null);
  const [targetName, setTargetName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  const entryId = params.id as string;

  const handleShare = useCallback(async () => {
    if (!entry || !firebaseUser) return;
    setSharing(true);
    try {
      const authorName = firebaseUser.displayName ?? t("common_anonymous");
      const shareId = await api.share.createSharedLetter(entry, authorName, targetName);
      const shareUrl = `https://gamsa-app.vercel.app/share/${shareId}`;

      if (navigator.share) {
        await navigator.share({
          title: t("entry_detail_share_title", { targetName }),
          text: entry.content.slice(0, 100) + (entry.content.length > 100 ? "..." : ""),
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success(t("entry_detail_toast_share_copied"));
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error(t("entry_detail_error_share"));
      }
    } finally {
      setSharing(false);
    }
  }, [entry, firebaseUser, targetName, t]);

  useEffect(() => {
    if (!firebaseUser || !entryId) return;
    const uid = firebaseUser.uid;

    api.gratitude
      .getEntry(uid, entryId)
      .then(async (data) => {
        setEntry(data);
        if (data?.targetId) {
          const targets = await api.targets.getTargets(uid);
          const target = targets.find((tgt: Target) => tgt.id === data.targetId);
          setTargetName(target?.name ?? t("common_unknown"));
        } else {
          setTargetName(t("common_to_self"));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, entryId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#8d99ac]" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-[#8d99ac]">{t("entry_detail_not_found")}</p>
        <button
          onClick={() => router.back()}
          className="rounded-full border border-[#f0e7e2] bg-white px-6 py-2 text-sm font-medium text-[#2e3744]"
        >
          {t("common_go_back")}
        </button>
      </div>
    );
  }

  const createdDate = entry.createdAt?.toDate
    ? entry.createdAt.toDate()
    : new Date(entry.createdAt as unknown as string);

  const dateStr = `${createdDate.getFullYear()}.${String(createdDate.getMonth() + 1).padStart(2, "0")}.${String(createdDate.getDate()).padStart(2, "0")}`;

  return (
    <div className="flex flex-col bg-[#f8f6f6] min-h-screen">
      <header className="screen-safe-top sticky top-0 z-10 grid grid-cols-[40px_1fr_40px] items-center bg-[#f8f6f6]/80 px-4 py-4 backdrop-blur-md">
        <button
          type="button"
          onClick={() => router.push(`/records?highlight=${entryId}`)}
          className="flex h-10 w-10 items-center justify-center"
        >
          <ArrowLeft className="h-6 w-6 text-[#303640]" strokeWidth={1.5} />
        </button>
        <h1 className="text-center font-serif text-[22px] font-bold text-[#1f2a3d]">
          {t("entry_detail_title")}
        </h1>
        <button
          type="button"
          onClick={handleShare}
          disabled={sharing}
          className="flex h-10 w-10 items-center justify-center"
        >
          {sharing ? (
            <Loader2 className="h-5 w-5 animate-spin text-[#8d99ac]" />
          ) : (
            <Share2 className="h-5 w-5 text-[#303640]" strokeWidth={1.5} />
          )}
        </button>
      </header>

      <div className="px-4 pb-8">
        <div className="rounded-[40px] border border-[#ece8ea] bg-white px-6 pb-7 pt-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {entry.emotionTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-[#fef3f6] px-4 py-1 text-[12px] font-medium text-[#efb8c2]"
                >
                  <EmotionIcon emotion={tag} className="h-3.5 w-3.5" />
                  {t(EMOTION_KEYS[tag] ?? tag)}
                </span>
              ))}
            </div>
            <span className="font-serif text-[14px] text-[#8d99ac]">{dateStr}</span>
          </div>

          <p className="mb-6 font-serif text-[20px] font-bold text-[#1f2a3d]">
            To. {targetName}
          </p>

          {entry.title && (
            <h2 className="mb-4 font-serif text-[18px] font-bold text-[#2e3744]">
              {entry.title}
            </h2>
          )}

          <p className="whitespace-pre-wrap font-serif text-[16px] leading-[1.75] text-[#1f2a3d]">
            {entry.content}
          </p>

          {entry.imageUrl && (
            <div className="mt-7 overflow-hidden rounded-[30px] bg-[#f2f2f3]">
              <img
                src={entry.imageUrl}
                alt={t("entry_detail_photo_alt")}
                className="aspect-square w-full object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
