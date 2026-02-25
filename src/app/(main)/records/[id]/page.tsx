"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { EmotionIcon } from "@/components/ui/emotion-icon";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { GratitudeEntry, Target } from "@/types";

const EMOTION_LABELS: Record<string, string> = {
  gratitude: "감사",
  comfort: "위로",
  respect: "존경",
  love: "사랑",
  warmth: "따뜻함",
  joy: "기쁨",
  nostalgia: "그리움",
  trust: "신뢰",
  hope: "희망",
};

export default function EntryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const [entry, setEntry] = useState<GratitudeEntry | null>(null);
  const [targetName, setTargetName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const entryId = params.id as string;

  useEffect(() => {
    if (!firebaseUser || !entryId) return;
    const uid = firebaseUser.uid;

    api.gratitude
      .getEntry(uid, entryId)
      .then(async (data) => {
        setEntry(data);
        if (data?.targetId) {
          const targets = await api.targets.getTargets(uid);
          const target = targets.find((t: Target) => t.id === data.targetId);
          setTargetName(target?.name ?? "알 수 없음");
        } else {
          setTargetName("나에게");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
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
        <p className="text-[#8d99ac]">편지를 찾을 수 없습니다.</p>
        <button
          onClick={() => router.back()}
          className="rounded-full border border-[#f0e7e2] bg-white px-6 py-2 text-sm font-medium text-[#2e3744]"
        >
          돌아가기
        </button>
      </div>
    );
  }

  const createdDate = entry.createdAt?.toDate
    ? entry.createdAt.toDate()
    : new Date(entry.createdAt as unknown as string);

  const dateStr = `${createdDate.getFullYear()}.${String(createdDate.getMonth() + 1).padStart(2, "0")}.${String(createdDate.getDate()).padStart(2, "0")}`;

  return (
    <div className="flex flex-col bg-[#f7efe6] min-h-screen">
      {/* Header — from reference: grid centered */}
      <header className="sticky top-0 z-10 grid grid-cols-[40px_1fr_40px] items-center bg-[#f7efe6]/80 px-4 py-4 backdrop-blur-md">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center"
        >
          <ArrowLeft className="h-6 w-6 text-[#303640]" strokeWidth={1.5} />
        </button>
        <h1 className="text-center font-serif text-[22px] font-bold text-[#1f2a3d]">
          편지 보기
        </h1>
        <div className="w-10" />
      </header>

      <div className="px-4 pb-8">
        {/* Main letter card — from reference */}
        <div className="rounded-[40px] border border-[#f0e7e2] bg-white px-6 pb-7 pt-6 shadow-[0_2px_0_rgba(0,0,0,0.03)]">
          {/* Emotion badge + date row */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {entry.emotionTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-[#f8edf0] px-4 py-1 text-[12px] font-medium text-[#e59aaa]"
                >
                  <EmotionIcon emotion={tag} className="h-3.5 w-3.5" />
                  {EMOTION_LABELS[tag] ?? tag}
                </span>
              ))}
            </div>
            <span className="font-serif text-[14px] text-[#8d9198]">{dateStr}</span>
          </div>

          {/* From label */}
          <p className="mb-6 font-serif text-[20px] font-bold text-[#2f353f]">
            From. {targetName}
          </p>

          {/* Title */}
          {entry.title && (
            <h2 className="mb-4 font-serif text-[18px] font-bold text-[#2e3744]">
              {entry.title}
            </h2>
          )}

          {/* Body text — from reference */}
          <p className="whitespace-pre-wrap font-serif text-[16px] leading-[1.75] text-[#2e333c]">
            {entry.content}
          </p>

          {/* Image — from reference rounded-[30px] */}
          {entry.imageUrl && (
            <div className="mt-7 overflow-hidden rounded-[30px] bg-[#efe8e4]">
              <img
                src={entry.imageUrl}
                alt="첨부 사진"
                className="aspect-square w-full object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
