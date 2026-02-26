/**
 * Firestore 컬렉션 참조
 * 타입 안전한 컬렉션 접근을 위한 헬퍼
 *
 * `id`는 Firestore 문서 ID로 자동 생성되므로,
 * 컬렉션/문서 참조에서는 `Omit<T, 'id'>`를 사용합니다.
 */

import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from "firebase/firestore";
import { getFirebaseDb } from "./config";
import type {
  User,
  GratitudeEntry,
  Target,
  Streak,
  Badge,
  GratitudePage,
  Notification,
  Friend,
  BlockedUser,
  SharedLetter,
} from "@/types";

type FirestoreData<T> = Omit<T, "id">;

function typedCollection<T>(path: string): CollectionReference<FirestoreData<T>> {
  return collection(getFirebaseDb(), path) as CollectionReference<FirestoreData<T>>;
}

function typedDoc<T>(collectionPath: string, docId: string): DocumentReference<FirestoreData<T>> {
  return doc(getFirebaseDb(), collectionPath, docId) as DocumentReference<FirestoreData<T>>;
}

// ─── Collections ────────────────────────────────────────

export const usersCol = () => typedCollection<User>("users");
export const userDoc = (id: string) => typedDoc<User>("users", id);

export const entriesCol = (userId: string) =>
  typedCollection<GratitudeEntry>(`users/${userId}/entries`);
export const entryDoc = (userId: string, entryId: string) =>
  typedDoc<GratitudeEntry>(`users/${userId}/entries`, entryId);

export const targetsCol = (userId: string) =>
  typedCollection<Target>(`users/${userId}/targets`);
export const targetDoc = (userId: string, targetId: string) =>
  typedDoc<Target>(`users/${userId}/targets`, targetId);

export const streakDoc = (userId: string) =>
  typedDoc<Streak>("streaks", userId);

export const badgesCol = (userId: string) =>
  typedCollection<Badge>(`users/${userId}/badges`);
export const badgeDoc = (userId: string, badgeId: string) =>
  typedDoc<Badge>(`users/${userId}/badges`, badgeId);

export const pagesCol = () => typedCollection<GratitudePage>("gratitude_pages");
export const pageDoc = (id: string) =>
  typedDoc<GratitudePage>("gratitude_pages", id);

export const notificationsCol = (userId: string) =>
  typedCollection<Notification>(`users/${userId}/notifications`);

export const friendsCol = (userId: string) =>
  typedCollection<Friend>(`users/${userId}/friends`);
export const friendDoc = (userId: string, friendId: string) =>
  typedDoc<Friend>(`users/${userId}/friends`, friendId);

export const blockedCol = (userId: string) =>
  typedCollection<BlockedUser>(`users/${userId}/blocked`);
export const blockedDoc = (userId: string, targetName: string) =>
  typedDoc<BlockedUser>(`users/${userId}/blocked`, targetName);

export const sharedLettersCol = () =>
  typedCollection<SharedLetter>("shared_letters");
export const sharedLetterDoc = (id: string) =>
  typedDoc<SharedLetter>("shared_letters", id);
