/**
 * 감사 대상 API 추상화 레이어
 */

import {
  addDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { targetsCol, targetDoc } from "@/lib/firebase/collections";
import type { Target, TargetCreate } from "@/types";

async function hashPhone(phone: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(phone.replace(/[^0-9]/g, ""));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createTarget(
  userId: string,
  data: TargetCreate
): Promise<Target> {
  const phoneHash = data.phone ? await hashPhone(data.phone) : null;

  const docRef = await addDoc(targetsCol(userId), {
    userId,
    name: data.name,
    phoneHash,
    kakaoId: data.kakaoId,
    linkedUserId: null,
    profileImg: null,
    createdAt: serverTimestamp(),
  });

  const snap = await getDoc(docRef);
  return { ...snap.data(), id: snap.id } as Target;
}

export async function getTargets(userId: string): Promise<Target[]> {
  const q = query(targetsCol(userId), orderBy("name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
  })) as Target[];
}

export async function getTarget(
  userId: string,
  targetId: string
): Promise<Target | null> {
  const snap = await getDoc(targetDoc(userId, targetId));
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id } as Target;
}

export async function updateTarget(
  userId: string,
  targetId: string,
  data: Partial<TargetCreate>
): Promise<void> {
  const updates: Record<string, unknown> = {};
  if (data.name) updates.name = data.name;
  if (data.kakaoId !== undefined) updates.kakaoId = data.kakaoId;
  if (data.phone) updates.phoneHash = await hashPhone(data.phone);

  await updateDoc(targetDoc(userId, targetId), updates);
}

export async function deleteTarget(
  userId: string,
  targetId: string
): Promise<void> {
  await deleteDoc(targetDoc(userId, targetId));
}
