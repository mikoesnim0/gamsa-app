/**
 * 차단 목록 API 추상화 레이어
 */

import {
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { blockedCol, blockedDoc } from "@/lib/firebase/collections";
import type { BlockedUser } from "@/types";

export async function getBlockedUsers(userId: string): Promise<BlockedUser[]> {
  const q = query(blockedCol(userId), orderBy("createdAt", "desc"), limit(300));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
  })) as BlockedUser[];
}

export async function addBlockedUser(
  userId: string,
  targetName: string
): Promise<void> {
  await setDoc(blockedDoc(userId, targetName), {
    name: targetName,
    createdAt: serverTimestamp(),
  });
}

export async function removeBlockedUser(
  userId: string,
  targetName: string
): Promise<void> {
  await deleteDoc(blockedDoc(userId, targetName));
}
