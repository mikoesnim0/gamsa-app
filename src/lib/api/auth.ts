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
  const userSnap = await getDoc(userDocRef);

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
    await setDoc(userDocRef, newUser);
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

/** KakaoTalk Sign-In: Kakao JS SDK → Cloud Function → Custom Token */
export async function signInWithKakao(): Promise<User> {
  // 1. Kakao SDK login — get access token
  const kakaoToken = await getKakaoAccessToken();

  // 2. Send to Cloud Function to exchange for Firebase custom token
  const fn = httpsCallable<{ accessToken: string }, { customToken: string }>(
    getFirebaseFunctions(),
    "kakaoAuth"
  );
  const { data } = await fn({ accessToken: kakaoToken });

  // 3. Sign in with custom token
  const authInstance = getFirebaseAuth();
  const credential = await signInWithCustomToken(authInstance, data.customToken);
  return ensureUserDoc(credential.user);
}

/** Load Kakao JS SDK and get access token via popup */
function getKakaoAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!kakaoKey) {
      reject(new Error("NEXT_PUBLIC_KAKAO_JS_KEY is not set"));
      return;
    }

    function doLogin() {
      const { Kakao } = window as unknown as { Kakao: KakaoSDK };
      if (!Kakao.isInitialized()) {
        Kakao.init(kakaoKey!);
      }
      Kakao.Auth.login({
        success: (authObj: { access_token: string }) => resolve(authObj.access_token),
        fail: (err: unknown) => reject(err),
      });
    }

    // Load SDK script if not already loaded
    const w = window as unknown as { Kakao?: KakaoSDK };
    if (w.Kakao) {
      doLogin();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://developers.kakao.com/sdk/js/kakao.min.js";
    script.onload = doLogin;
    script.onerror = () => reject(new Error("Failed to load Kakao SDK"));
    document.head.appendChild(script);
  });
}

interface KakaoSDK {
  isInitialized(): boolean;
  init(key: string): void;
  Auth: {
    login(opts: {
      success: (authObj: { access_token: string }) => void;
      fail: (err: unknown) => void;
    }): void;
  };
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

function generateInviteCode(): string {
  const adjectives = ["PASTEL", "SUNNY", "WARM", "GENTLE", "HAPPY", "BRIGHT"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const num = Math.floor(Math.random() * 999)
    .toString()
    .padStart(3, "0");
  return `${adj}-${num}`;
}
