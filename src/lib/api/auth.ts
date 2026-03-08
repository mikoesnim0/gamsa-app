/**
 * 인증 API 추상화 레이어
 * Firebase Auth: 전화번호 / Apple / KakaoTalk 인증
 */

import {
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithCustomToken,
  OAuthProvider,
  RecaptchaVerifier,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type ConfirmationResult,
  type User as FirebaseUser,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseAuth, getFirebaseDb, getFirebaseStorage, getFirebaseFunctions } from "@/lib/firebase/config";
import type { User } from "@/types";

let confirmationResult: ConfirmationResult | null = null;
let recaptchaVerifier: RecaptchaVerifier | null = null;

/** Firestore 호출에 타임아웃을 건다. 막히면 즉시 에러. */
function withTimeout<T>(promise: Promise<T>, ms = 3000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Firestore timeout after ${ms}ms`)), ms)
    ),
  ]);
}

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

/** Ensure a Firestore user document exists for the given Firebase user */
async function ensureUserDoc(firebaseUser: { uid: string; displayName?: string | null; photoURL?: string | null }): Promise<User> {
  const db = getFirebaseDb();
  const userDocRef = doc(db, "users", firebaseUser.uid);
  const userSnap = await withTimeout(getDoc(userDocRef));

  if (!userSnap.exists()) {
    const newUser: Omit<User, "id"> = {
      phoneHash: "",
      name: firebaseUser.displayName ?? "",
      profileImg: firebaseUser.photoURL ?? null,
      bio: null,
      pushToken: null,
      inviteCode: generateInviteCode(),
      createdAt: serverTimestamp() as never,
      updatedAt: serverTimestamp() as never,
    };
    await withTimeout(setDoc(userDocRef, newUser));
    return { id: firebaseUser.uid, ...newUser } as User;
  }

  return { id: userSnap.id, ...userSnap.data() } as User;
}

export async function verifyCode(code: string): Promise<User> {
  if (!confirmationResult) {
    throw new Error("인증번호를 먼저 요청해주세요.");
  }

  const result = await confirmationResult.confirm(code);
  return ensureUserDoc(result.user);
}

/** Apple Sign-In via Firebase OAuthProvider */
export async function signInWithApple(): Promise<User> {
  const authInstance = getFirebaseAuth();
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  provider.setCustomParameters({ locale: "ko" });

  const result = await signInWithPopup(authInstance, provider);
  return ensureUserDoc(result.user);
}

/** KakaoTalk Sign-In: redirect to Kakao authorize page */
export function startKakaoLogin(): void {
  // authorize 엔드포인트에는 REST API Key를 사용해야 합니다 (JS Key 아님)
  const restApiKey = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY;
  if (!restApiKey) throw new Error("NEXT_PUBLIC_KAKAO_REST_API_KEY is not set");

  const redirectUri = window.location.origin;
  const kakaoAuthUrl =
    `https://kauth.kakao.com/oauth/authorize?client_id=${restApiKey}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
  window.location.href = kakaoAuthUrl;
}

/** Complete Kakao login: exchange authorization code for Firebase custom token */
export async function completeKakaoLogin(code: string): Promise<User> {
  const redirectUri = window.location.origin;

  const fn = httpsCallable<
    { code: string; redirectUri: string },
    { customToken: string }
  >(getFirebaseFunctions(), "kakaoAuth");
  const { data } = await fn({ code, redirectUri });

  const authInstance = getFirebaseAuth();
  const credential = await signInWithCustomToken(authInstance, data.customToken);
  try {
    return await ensureUserDoc(credential.user);
  } catch (docErr) {
    console.warn("[kakaoAuth] ensureUserDoc failed (offline?), returning partial user", docErr);
    // Auth succeeded — return minimal user so the app can navigate
    return { id: credential.user.uid, name: credential.user.displayName ?? "", profileImg: credential.user.photoURL ?? null } as unknown as User;
  }
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
  const snap = await withTimeout(getDoc(userRef));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as User;
}

export async function updateUserProfile(
  userId: string,
  data: Partial<Pick<User, "name" | "bio" | "profileImg">>
): Promise<void> {
  const db = getFirebaseDb();
  const userRef = doc(db, "users", userId);
  await withTimeout(updateDoc(userRef, { ...data, updatedAt: serverTimestamp() }));
}

export async function updateNotificationSettings(
  userId: string,
  settings: {
    newLetterOptIn?: boolean;
    deliveryOptIn?: boolean;
    marketingOptIn?: boolean;
    dailyReminderTime?: string;
  }
): Promise<void> {
  const db = getFirebaseDb();
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, { ...settings, updatedAt: serverTimestamp() });
}

export async function getNotificationSettings(
  userId: string
): Promise<{
  newLetterOptIn: boolean;
  deliveryOptIn: boolean;
  marketingOptIn: boolean;
  dailyReminderTime: string;
}> {
  const db = getFirebaseDb();
  const userRef = doc(db, "users", userId);
  const snap = await getDoc(userRef);
  const data = snap.data();
  return {
    newLetterOptIn: data?.newLetterOptIn ?? true,
    deliveryOptIn: data?.deliveryOptIn ?? true,
    marketingOptIn: data?.marketingOptIn ?? false,
    dailyReminderTime: data?.dailyReminderTime ?? "09:00",
  };
}

/** Upload a profile image (data URL) and return the download URL */
export async function uploadProfileImage(
  userId: string,
  dataUrl: string
): Promise<string> {
  const storage = getFirebaseStorage();
  const storageRef = ref(storage, `users/${userId}/profile.jpg`);
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
  return getDownloadURL(storageRef);
}

/** Upload a gratitude entry image (data URL) and return the download URL */
export async function uploadEntryImage(
  userId: string,
  dataUrl: string
): Promise<string> {
  const storage = getFirebaseStorage();
  const filename = `${Date.now()}.jpg`;
  const storageRef = ref(storage, `users/${userId}/entries/${filename}`);
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
  return getDownloadURL(storageRef);
}

function generateInviteCode(): string {
  const adjectives = ["PASTEL", "SUNNY", "WARM", "GENTLE", "HAPPY", "BRIGHT"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const num = Math.floor(Math.random() * 999)
    .toString()
    .padStart(3, "0");
  return `${adj}-${num}`;
}
