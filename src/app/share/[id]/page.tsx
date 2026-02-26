"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Heart, Loader2 } from "lucide-react";
import { EmotionIcon } from "@/components/ui/emotion-icon";
import { api } from "@/lib/api";
import type { SharedLetter } from "@/types";

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

export default function SharedLetterPage() {
  const params = useParams();
  const shareId = params.id as string;
  const [letter, setLetter] = useState<SharedLetter | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!shareId) return;
    api.share
      .getSharedLetter(shareId)
      .then((data) => {
        if (!data) {
          setNotFound(true);
        } else {
          setLetter(data);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [shareId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f6f6]">
        <Loader2 className="h-6 w-6 animate-spin text-[#8d99ac]" />
      </div>
    );
  }

  if (notFound || !letter) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f8f6f6] px-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f2f2f3]">
          <Heart className="h-8 w-8 text-[#8d99ac]" />
        </div>
        <p className="text-center font-serif text-[18px] text-[#8d99ac]">
          편지를 찾을 수 없습니다
        </p>
        <a
          href="/"
          className="rounded-full border border-[#ece8ea] bg-white px-6 py-2 text-sm font-medium text-[#1f2a3d]"
        >
          홈으로
        </a>
      </div>
    );
  }

  const createdDate = letter.originalCreatedAt?.toDate
    ? letter.originalCreatedAt.toDate()
    : new Date(letter.originalCreatedAt as unknown as string);

  const dateStr = `${createdDate.getFullYear()}.${String(createdDate.getMonth() + 1).padStart(2, "0")}.${String(createdDate.getDate()).padStart(2, "0")}`;

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f6f6]">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-center bg-[#f8f6f6]/80 px-4 py-4 backdrop-blur-md">
        <h1 className="font-serif text-[22px] font-bold text-[#1f2a3d]">
          감사 편지
        </h1>
      </header>

      <div className="px-4 pb-8">
        {/* Letter card */}
        <div className="rounded-[40px] border border-[#ece8ea] bg-white px-6 pb-7 pt-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          {/* Emotion badge + date */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {letter.emotionTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-[#fef3f6] px-4 py-1 text-[12px] font-medium text-[#efb8c2]"
                >
                  <EmotionIcon emotion={tag} className="h-3.5 w-3.5" />
                  {EMOTION_LABELS[tag] ?? tag}
                </span>
              ))}
            </div>
            <span className="font-serif text-[14px] text-[#8d99ac]">
              {dateStr}
            </span>
          </div>

          {/* Author & Target */}
          <div className="mb-6 space-y-1">
            <p className="font-serif text-[20px] font-bold text-[#1f2a3d]">
              To. {letter.targetName}
            </p>
            <p className="font-serif text-[14px] text-[#8d99ac]">
              From. {letter.authorName}
            </p>
          </div>

          {/* Title */}
          {letter.title && (
            <h2 className="mb-4 font-serif text-[18px] font-bold text-[#1f2a3d]">
              {letter.title}
            </h2>
          )}

          {/* Body */}
          <p className="whitespace-pre-wrap font-serif text-[16px] leading-[1.75] text-[#1f2a3d]">
            {letter.content}
          </p>

          {/* Image */}
          {letter.imageUrl && (
            <div className="mt-7 overflow-hidden rounded-[30px] bg-[#f2f2f3]">
              <img
                src={letter.imageUrl}
                alt="첨부 사진"
                className="aspect-square w-full object-cover"
              />
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-6 flex flex-col items-center gap-3">
          <a
            href="/download"
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#efb8c2] py-3.5 text-[16px] font-bold text-white transition-opacity hover:opacity-90"
          >
            <Heart className="h-4 w-4" fill="currentColor" />
            나도 감사 보내기
          </a>
          <p className="text-center text-[12px] text-[#8d99ac]">
            감사노트 앱에서 소중한 사람에게 마음을 전하세요
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pb-6 text-center">
        <p className="text-[12px] text-[#8d99ac]">
          Doyakmin &middot; 감사노트
        </p>
      </div>
    </div>
  );
}
