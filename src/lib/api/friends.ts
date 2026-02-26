/**
 * 친구 API 추상화 레이어
 */

import {
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { friendsCol, friendDoc, usersCol } from "@/lib/firebase/collections";
import type { Friend } from "@/types";

export interface PhoneMatchResult {
  userId: string;
  name: string;
  phoneHash: string;
}

export async function getFriends(userId: string): Promise<Friend[]> {
  const q = query(
    friendsCol(userId),
    where("status", "==", "active"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
  })) as Friend[];
}

export async function getPendingRequests(userId: string): Promise<Friend[]> {
  const q = query(
    friendsCol(userId),
    where("status", "==", "pending_received")
  );
  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
  })) as Friend[];
}

export async function sendFriendRequest(
  userId: string,
  friendUserId: string
): Promise<void> {
  await addDoc(friendsCol(userId), {
    userId,
    friendUserId,
    status: "pending_sent",
    createdAt: serverTimestamp(),
  });

  await addDoc(friendsCol(friendUserId), {
    userId: friendUserId,
    friendUserId: userId,
    status: "pending_received",
    createdAt: serverTimestamp(),
  });
}

export async function acceptFriendRequest(
  userId: string,
  friendRecordId: string
): Promise<void> {
  const snap = await getDoc(friendDoc(userId, friendRecordId));
  if (!snap.exists()) return;

  const friendData = snap.data() as Friend;

  await updateDoc(friendDoc(userId, friendRecordId), { status: "active" });

  const otherQ = query(
    friendsCol(friendData.friendUserId),
    where("friendUserId", "==", userId),
    where("status", "==", "pending_sent")
  );
  const otherSnap = await getDocs(otherQ);
  for (const doc of otherSnap.docs) {
    await updateDoc(doc.ref, { status: "active" });
  }
}

export async function rejectFriendRequest(
  userId: string,
  friendRecordId: string
): Promise<void> {
  const snap = await getDoc(friendDoc(userId, friendRecordId));
  if (!snap.exists()) return;

  const friendData = snap.data() as Friend;
  await deleteDoc(friendDoc(userId, friendRecordId));

  const otherQ = query(
    friendsCol(friendData.friendUserId),
    where("friendUserId", "==", userId),
    where("status", "==", "pending_sent")
  );
  const otherSnap = await getDocs(otherQ);
  for (const doc of otherSnap.docs) {
    await deleteDoc(doc.ref);
  }
}

export async function sendFriendRequestByCode(
  userId: string,
  inviteCode: string
): Promise<void> {
  const q = query(usersCol(), where("inviteCode", "==", inviteCode));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error("Invalid invite code");
  }

  const friendUserId = snap.docs[0].id;

  if (friendUserId === userId) {
    throw new Error("Cannot add yourself");
  }

  await sendFriendRequest(userId, friendUserId);
}

/**
 * 전화번호 해시 목록으로 가입된 사용자 찾기
 * Firestore `in` 쿼리 제한(30개)에 맞춰 배치 처리
 */
export async function findUsersByPhoneHashes(
  currentUserId: string,
  phoneHashes: string[]
): Promise<PhoneMatchResult[]> {
  if (phoneHashes.length === 0) return [];

  // 이미 친구인 사용자 ID 수집
  const existingFriends = await getFriends(currentUserId);
  const friendIds = new Set(existingFriends.map((f) => f.friendUserId));

  const results: PhoneMatchResult[] = [];

  // Firestore `in` 쿼리는 최대 30개까지
  const BATCH_SIZE = 30;
  for (let i = 0; i < phoneHashes.length; i += BATCH_SIZE) {
    const batch = phoneHashes.slice(i, i + BATCH_SIZE);
    const q = query(usersCol(), where("phoneHash", "in", batch));
    const snap = await getDocs(q);

    for (const doc of snap.docs) {
      const data = doc.data();
      // 본인 제외 + 이미 친구인 사람 제외
      if (doc.id === currentUserId) continue;
      if (friendIds.has(doc.id)) continue;

      results.push({
        userId: doc.id,
        name: (data as { name?: string }).name ?? "알 수 없음",
        phoneHash: (data as { phoneHash?: string }).phoneHash ?? "",
      });
    }
  }

  return results;
}
