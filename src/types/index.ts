/**
 * 감사노트 — 공유 타입 정의
 * 프론트엔드(Next.js)와 Firebase(Cloud Functions)가 공유하는 타입입니다.
 * Phase 2(FastAPI 전환) 시에도 이 타입이 API 계약의 기준이 됩니다.
 */

import type { Timestamp } from "firebase/firestore";

// ─── User ───────────────────────────────────────────────

export interface User {
  id: string;
  phoneHash: string;
  name: string;
  profileImg: string | null;
  bio: string | null;
  pushToken: string | null;
  inviteCode: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserProfile {
  id: string;
  name: string;
  profileImg: string | null;
  bio: string | null;
  inviteCode: string;
  stats: UserStats;
}

export interface UserStats {
  totalSent: number;
  totalReceived: number;
  streakDays: number;
}

// ─── Gratitude Entry ────────────────────────────────────

export type EmotionTag =
  | "gratitude"
  | "comfort"
  | "respect"
  | "love"
  | "warmth"
  | "joy"
  | "nostalgia"
  | "trust"
  | "hope";

export interface GratitudeEntry {
  id: string;
  userId: string;
  content: string;
  title: string | null;
  targetId: string | null;
  emotionTags: EmotionTag[];
  imageUrl: string | null;
  isPublic: boolean;
  createdAt: Timestamp;
}

export interface GratitudeEntryCreate {
  content: string;
  title: string | null;
  targetId: string | null;
  emotionTags: EmotionTag[];
  imageUrl?: string | null;
  isPublic: boolean;
}

// ─── Target (감사 대상) ──────────────────────────────────

export interface Target {
  id: string;
  userId: string;
  name: string;
  phoneHash: string | null;
  kakaoId: string | null;
  linkedUserId: string | null;
  profileImg: string | null;
  createdAt: Timestamp;
}

export interface TargetCreate {
  name: string;
  phone: string | null;
  kakaoId: string | null;
}

// ─── Streak ─────────────────────────────────────────────

export interface Streak {
  id: string;
  userId: string;
  currentStreak: number;
  maxStreak: number;
  freezeUsedThisWeek: boolean;
  lastEntryDate: Timestamp;
}

// ─── Badge (감사패) ─────────────────────────────────────

export type BadgeType = "7d" | "30d" | "100d" | "365d";

export interface Badge {
  id: string;
  userId: string;
  type: BadgeType;
  earnedAt: Timestamp;
}

// ─── Gratitude Page (990원 상품) ─────────────────────────

export interface GratitudePage {
  id: string;
  creatorId: string;
  targetId: string;
  letter: string;
  pageUrl: string;
  isViewed: boolean;
  purchasedAt: Timestamp;
  entries: GratitudeEntry[];
}

// ─── Notification ───────────────────────────────────────

export type NotificationType =
  | "daily_reminder"
  | "streak_warning"
  | "milestone"
  | "matching"
  | "letter_received"
  | "friend_request"
  | "delivery_scheduled";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  isRead: boolean;
  actionUrl: string | null;
  createdAt: Timestamp;
}

// ─── Friend ─────────────────────────────────────────────

export type FriendStatus = "active" | "pending_sent" | "pending_received";

export interface Friend {
  id: string;
  userId: string;
  friendUserId: string;
  status: FriendStatus;
  createdAt: Timestamp;
  friendProfile?: UserProfile;
}

// ─── Statistics ─────────────────────────────────────────

export interface EmotionRatio {
  emotion: EmotionTag;
  percentage: number;
  count: number;
}

export interface WeeklySummary {
  totalSent: number;
  totalReceived: number;
  mostActiveDay: string;
  emotionRatios: EmotionRatio[];
}

export interface RecordStats {
  totalSent: number;
  totalReceived: number;
  sentGrowthPercent: number;
  receivedGrowthPercent: number;
  mostSentEmotion: EmotionTag;
  mostReceivedEmotion: EmotionTag;
  emotionRatios: EmotionRatio[];
  positivePercent: number;
}

// ─── Notification Settings ─────────────────────────────

export interface NotificationSettings {
  newLetterOptIn: boolean;
  deliveryOptIn: boolean;
  marketingOptIn: boolean;
  dailyReminderTime: string; // "HH:mm" format, e.g. "09:00"
}

// ─── Blocked User ──────────────────────────────────────

export interface BlockedUser {
  id: string;
  name: string;
  createdAt: Timestamp;
}

// ─── Delivery Options ───────────────────────────────────

// ─── Shared Letter (공유 편지) ──────────────────────────

export interface SharedLetter {
  id: string;
  entryId: string;
  authorId: string;
  authorName: string;
  targetName: string;
  content: string;
  title: string | null;
  emotionTags: EmotionTag[];
  imageUrl: string | null;
  originalCreatedAt: Timestamp;
  sharedAt: Timestamp;
}

export type DeliveryOption = "send_now" | "schedule" | "private_vault";

export interface DeliverySettings {
  option: DeliveryOption;
  scheduledDate: Timestamp | null;
}
