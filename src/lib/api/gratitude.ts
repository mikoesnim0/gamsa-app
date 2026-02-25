/**
 * 감사 기록 API 추상화 레이어
 *
 * Phase 1: Firestore 직접 호출
 * Phase 2: FastAPI 엔드포인트로 교체 (이 파일 내부만 수정, 컴포넌트 변경 없음)
 */

import {
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  type QueryConstraint,
} from "firebase/firestore";
import { entriesCol, entryDoc } from "@/lib/firebase/collections";
import type { GratitudeEntry, GratitudeEntryCreate, EmotionTag } from "@/types";

export async function createEntry(
  userId: string,
  data: GratitudeEntryCreate
): Promise<GratitudeEntry> {
  const docRef = await addDoc(entriesCol(userId), {
    ...data,
    userId,
    createdAt: serverTimestamp(),
  });

  const snap = await getDoc(docRef);
  return { ...snap.data(), id: snap.id } as GratitudeEntry;
}

export async function getEntries(
  userId: string,
  options?: {
    targetId?: string;
    emotionTag?: EmotionTag;
    limitCount?: number;
  }
): Promise<GratitudeEntry[]> {
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];

  if (options?.targetId) {
    constraints.unshift(where("targetId", "==", options.targetId));
  }
  if (options?.emotionTag) {
    constraints.unshift(where("emotionTags", "array-contains", options.emotionTag));
  }
  if (options?.limitCount) {
    constraints.push(limit(options.limitCount));
  }

  const q = query(entriesCol(userId), ...constraints);
  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
  })) as GratitudeEntry[];
}

export async function getEntry(
  userId: string,
  entryId: string
): Promise<GratitudeEntry | null> {
  const snap = await getDoc(entryDoc(userId, entryId));
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id } as GratitudeEntry;
}

export async function updateEntry(
  userId: string,
  entryId: string,
  data: Partial<GratitudeEntryCreate>
): Promise<void> {
  await updateDoc(entryDoc(userId, entryId), data);
}

export async function deleteEntry(
  userId: string,
  entryId: string
): Promise<void> {
  await deleteDoc(entryDoc(userId, entryId));
}

export async function getTodayEntryCount(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const q = query(
    entriesCol(userId),
    where("createdAt", ">=", today),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.size;
}

export async function getEntriesForTarget(
  userId: string,
  targetId: string
): Promise<GratitudeEntry[]> {
  return getEntries(userId, { targetId });
}

export async function getRecentEntries(
  userId: string,
  count: number = 5
): Promise<GratitudeEntry[]> {
  return getEntries(userId, { limitCount: count });
}
