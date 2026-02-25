/**
 * 인증 API 추상화 레이어
 * Firebase Auth를 사용한 전화번호 인증
 */

import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type ConfirmationResult,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase/config";
import type { User } from "@/types";

let confirmationResult: ConfirmationResult | null = null;
let recaptchaVerifier: RecaptchaVerifier | null = null;

export async function sendVerificationCode(
  phoneNumber: string,
  recaptchaContainerId: string
): Promise<void> {
  const authInstance = getFirebaseAuth();

  // Always use RecaptchaVerifier. In local testing mode
  // (`appVerificationDisabledForTesting = true`), Firebase skips real reCAPTCHA checks
  // but still expects a RecaptchaVerifier instance.
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
  const oldContainer = document.getElementById(recaptchaContainerId);
  if (oldContainer?.parentNode) {
    const fresh = document.createElement("div");
    fresh.id = recaptchaContainerId;
    oldContainer.parentNode.replaceChild(fresh, oldContainer);
  }

  recaptchaVerifier = new RecaptchaVerifier(authInstance, recaptchaContainerId, {
    size: "invisible",
  });
  await recaptchaVerifier.render();

  confirmationResult = await signInWithPhoneNumber(
    authInstance,
    phoneNumber,
    recaptchaVerifier
  );
}

export async function verifyCode(code: string): Promise<User> {
  if (!confirmationResult) {
    throw new Error("인증번호를 먼저 요청해주세요.");
  }

  const result = await confirmationResult.confirm(code);
  const firebaseUser = result.user;

  const db = getFirebaseDb();
  const userDocRef = doc(db, "users", firebaseUser.uid);
  const userSnap = await getDoc(userDocRef);

  if (!userSnap.exists()) {
    const newUser: Omit<User, "id"> = {
      phoneHash: "", // Cloud Function에서 해시 처리
      name: "",
      profileImg: null,
      bio: null,
      pushToken: null,
      inviteCode: generateInviteCode(),
      createdAt: serverTimestamp() as never,
      updatedAt: serverTimestamp() as never,
    };
    await setDoc(userDocRef, newUser);
    return { id: firebaseUser.uid, ...newUser } as User;
  }

  return { id: userSnap.id, ...userSnap.data() } as User;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getFirebaseAuth());
}

export function onAuthChange(
  callback: (user: FirebaseUser | null) => void
): () => void {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export function getCurrentUserId(): string | null {
  return getFirebaseAuth().currentUser?.uid ?? null;
}

export async function getUserProfile(userId: string): Promise<User | null> {
  const db = getFirebaseDb();
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as User;
}

export async function updateUserProfile(
  userId: string,
  data: Partial<Pick<User, "name" | "bio" | "profileImg">>
): Promise<void> {
  const db = getFirebaseDb();
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, { ...data, updatedAt: serverTimestamp() });
}

function generateInviteCode(): string {
  const adjectives = ["PASTEL", "SUNNY", "WARM", "GENTLE", "HAPPY", "BRIGHT"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const num = Math.floor(Math.random() * 999)
    .toString()
    .padStart(3, "0");
  return `${adj}-${num}`;
}
