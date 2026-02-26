/**
 * 공유 편지 API 추상화 레이어
 *
 * Phase 1: Firestore top-level `shared_letters` 컬렉션
 * Phase 2: FastAPI 엔드포인트로 교체
 */

import { addDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { sharedLettersCol, sharedLetterDoc } from "@/lib/firebase/collections";
import type { SharedLetter, GratitudeEntry } from "@/types";

export async function createSharedLetter(
  entry: GratitudeEntry,
  authorName: string,
  targetName: string
): Promise<string> {
  const docRef = await addDoc(sharedLettersCol(), {
    entryId: entry.id,
    authorId: entry.userId,
    authorName,
    targetName,
    content: entry.content,
    title: entry.title,
    emotionTags: entry.emotionTags,
    imageUrl: entry.imageUrl,
    originalCreatedAt: entry.createdAt,
    sharedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function getSharedLetter(
  shareId: string
): Promise<SharedLetter | null> {
  const snap = await getDoc(sharedLetterDoc(shareId));
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id } as SharedLetter;
}
