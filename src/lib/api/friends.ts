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
import { friendsCol, friendDoc } from "@/lib/firebase/collections";
import type { Friend } from "@/types";

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
