/**
 * 스트릭 API 추상화 레이어
 */

import { getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { streakDoc } from "@/lib/firebase/collections";
import type { Streak } from "@/types";

export async function getStreak(userId: string): Promise<Streak> {
  const snap = await getDoc(streakDoc(userId));

  if (!snap.exists()) {
    const defaultStreak: Omit<Streak, "id"> = {
      userId,
      currentStreak: 0,
      maxStreak: 0,
      freezeUsedThisWeek: false,
      lastEntryDate: serverTimestamp() as never,
    };
    await setDoc(streakDoc(userId), defaultStreak);
    return { id: userId, ...defaultStreak } as Streak;
  }

  return { ...snap.data(), id: snap.id } as Streak;
}

export async function checkAndUpdateStreak(userId: string): Promise<Streak> {
  // 스트릭 계산 로직은 추후 Cloud Functions에서 처리
  // 클라이언트에서는 읽기만 수행
  return getStreak(userId);
}
