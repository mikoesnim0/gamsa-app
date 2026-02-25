/**
 * 알림 API 추상화 레이어
 */

import {
  getDocs,
  query,
  orderBy,
  limit,
  where,
  updateDoc,
  writeBatch,
  type QueryConstraint,
} from "firebase/firestore";
import { notificationsCol } from "@/lib/firebase/collections";
import { getFirebaseDb } from "@/lib/firebase/config";
import type { Notification } from "@/types";

export async function getNotifications(
  userId: string,
  options?: {
    unreadOnly?: boolean;
    limitCount?: number;
  }
): Promise<Notification[]> {
  const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];

  if (options?.unreadOnly) {
    constraints.unshift(where("isRead", "==", false));
  }
  if (options?.limitCount) {
    constraints.push(limit(options.limitCount));
  }

  const q = query(notificationsCol(userId), ...constraints);
  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
  })) as Notification[];
}

export async function markAsRead(
  userId: string,
  notificationId: string
): Promise<void> {
  const docRef = notificationsCol(userId);
  const q = query(docRef, where("__name__", "==", notificationId));
  const snap = await getDocs(q);

  if (!snap.empty) {
    await updateDoc(snap.docs[0].ref, { isRead: true });
  }
}

export async function markAllAsRead(userId: string): Promise<void> {
  const q = query(
    notificationsCol(userId),
    where("isRead", "==", false)
  );
  const snap = await getDocs(q);

  const batch = writeBatch(getFirebaseDb());
  snap.docs.forEach((doc) => {
    batch.update(doc.ref, { isRead: true });
  });
  await batch.commit();
}

export async function getUnreadCount(userId: string): Promise<number> {
  const q = query(
    notificationsCol(userId),
    where("isRead", "==", false)
  );
  const snap = await getDocs(q);
  return snap.size;
}
