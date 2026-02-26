/**
 * Firebase 초기화 설정 (Lazy Initialization)
 * 실제 Firebase 프로젝트 생성 후 .env.local에 값을 설정하세요.
 * Firebase는 실제 API 호출 시점에 초기화됩니다.
 */

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getStorage as _getStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator, type Functions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "",
};

function getFirebaseApp(): FirebaseApp {
  if (getApps().length === 0) {
    return initializeApp(firebaseConfig);
  }
  return getApps()[0];
}

// Lazy getters — Firebase는 실제로 사용할 때만 초기화됨
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;
let _functions: Functions | null = null;

export function getApp(): FirebaseApp {
  if (!_app) _app = getFirebaseApp();
  return _app;
}

const useEmulator =
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true";

function isLocalDevHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return true;
  }
  if (hostname.endsWith(".local")) return true;

  // Private LAN ranges used during mobile/device testing in development.
  if (hostname.startsWith("10.") || hostname.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;

  return false;
}

export function getFirebaseAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(getApp());
    if (useEmulator) {
      connectAuthEmulator(_auth, "http://127.0.0.1:9099", { disableWarnings: true });
    }
    // localhost 개발 환경: reCAPTCHA 우회 (Firebase Console에 등록된 테스트 전화번호만 동작)
    // 프로덕션에서는 실제 reCAPTCHA Enterprise가 동작
    if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
      _auth.settings.appVerificationDisabledForTesting = true;
      if (process.env.NODE_ENV === "development") {
        console.info("[firebase-auth] phone app verification disabled for testing", {
          host: window.location.hostname,
          isLocalDevHost: isLocalDevHost(window.location.hostname),
        });
      }
    }
  }
  return _auth;
}

export function getFirebaseDb(): Firestore {
  if (!_db) {
    _db = getFirestore(getApp());
    if (useEmulator) {
      connectFirestoreEmulator(_db, "127.0.0.1", 8080);
    }
  }
  return _db;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!_storage) {
    _storage = _getStorage(getApp());
    if (useEmulator) {
      connectStorageEmulator(_storage, "127.0.0.1", 9199);
    }
  }
  return _storage;
}

export function getFirebaseFunctions(): Functions {
  if (!_functions) {
    _functions = getFunctions(getApp(), "asia-northeast3");
    if (useEmulator) {
      connectFunctionsEmulator(_functions, "127.0.0.1", 5001);
    }
  }
  return _functions;
}

// 편의를 위한 직접 export (기존 코드 호환)
export const app = new Proxy({} as FirebaseApp, {
  get(_, prop) { return Reflect.get(getApp(), prop); },
});
export const auth = new Proxy({} as Auth, {
  get(_, prop) { return Reflect.get(getFirebaseAuth(), prop); },
});
export const db = new Proxy({} as Firestore, {
  get(_, prop) { return Reflect.get(getFirebaseDb(), prop); },
});
export const storage = new Proxy({} as FirebaseStorage, {
  get(_, prop) { return Reflect.get(getFirebaseStorage(), prop); },
});
export const functions = new Proxy({} as Functions, {
  get(_, prop) { return Reflect.get(getFirebaseFunctions(), prop); },
});
