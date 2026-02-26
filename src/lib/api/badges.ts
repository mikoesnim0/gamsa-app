/**
 * 배지 API 추상화 레이어
 */

import {
  getDocs,
  addDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { badgesCol } from "@/lib/firebase/collections";
import { getBadgeDefinition } from "@/lib/badges/definitions";
import * as gratitude from "./gratitude";
import * as streak from "./streak";
import * as friends from "./friends";
import * as targets from "./targets";
import type { Badge, BadgeType, BadgeMetadata } from "@/types";

// ─── Read ───────────────────────────────────────────────

export async function getEarnedBadges(userId: string): Promise<Badge[]> {
  const snap = await getDocs(badgesCol(userId));
  return snap.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
  })) as Badge[];
}

export async function hasBadge(userId: string, type: BadgeType): Promise<boolean> {
  const q = query(badgesCol(userId), where("type", "==", type));
  const snap = await getDocs(q);
  return !snap.empty;
}

// ─── Award ──────────────────────────────────────────────

async function awardBadge(
  userId: string,
  type: BadgeType,
  metadata?: BadgeMetadata
): Promise<Badge | null> {
  const already = await hasBadge(userId, type);
  if (already) return null;

  const docRef = await addDoc(badgesCol(userId), {
    userId,
    type,
    earnedAt: serverTimestamp(),
    metadata: metadata ?? null,
  });

  return {
    id: docRef.id,
    userId,
    type,
    earnedAt: new Date() as never,
    metadata: metadata ?? null,
  };
}

// ─── Check & Award ──────────────────────────────────────

export interface BadgeCheckResult {
  newBadges: Badge[];
}

export async function checkAndAwardBadges(userId: string): Promise<BadgeCheckResult> {
  // 1. Already-earned badge types
  const earned = await getEarnedBadges(userId);
  const earnedTypes = new Set(earned.map((b) => b.type));

  // 2. Gather data
  const [streakData, entries, friendList] = await Promise.all([
    streak.getStreak(userId),
    gratitude.getEntries(userId),
    friends.getFriends(userId),
  ]);

  const totalEntries = entries.length;

  // Pre-compute metrics
  const uniqueEmotions = new Set<string>();
  const targetCounts: Record<string, number> = {};
  let photoCount = 0;
  let hasMorning = false;
  let hasNight = false;

  for (const entry of entries) {
    for (const tag of entry.emotionTags) uniqueEmotions.add(tag);
    if (entry.targetId) {
      targetCounts[entry.targetId] = (targetCounts[entry.targetId] ?? 0) + 1;
    }
    if (entry.imageUrl) photoCount++;

    const date = entry.createdAt?.toDate
      ? entry.createdAt.toDate()
      : new Date(entry.createdAt as unknown as string);
    const hour = date.getHours();
    if (hour < 6) hasMorning = true;
    if (hour >= 23) hasNight = true;
  }

  const uniqueTargetCount = new Set(Object.keys(targetCounts)).size;
  const maxTargetCount = Object.values(targetCounts).length > 0
    ? Math.max(...Object.values(targetCounts))
    : 0;
  const devotedTargetId = Object.entries(targetCounts).find(
    ([, count]) => count >= 20
  )?.[0];

  // 3. Define checks
  const checks: { type: BadgeType; condition: boolean; metadata?: BadgeMetadata }[] = [
    // Streak
    { type: "streak_7d", condition: streakData.currentStreak >= 7, metadata: { triggerValue: streakData.currentStreak } },
    { type: "streak_30d", condition: streakData.currentStreak >= 30, metadata: { triggerValue: streakData.currentStreak } },
    { type: "streak_100d", condition: streakData.currentStreak >= 100, metadata: { triggerValue: streakData.currentStreak } },
    { type: "streak_365d", condition: streakData.currentStreak >= 365, metadata: { triggerValue: streakData.currentStreak } },
    // Sent count
    { type: "sent_10", condition: totalEntries >= 10, metadata: { triggerValue: totalEntries } },
    { type: "sent_50", condition: totalEntries >= 50, metadata: { triggerValue: totalEntries } },
    { type: "sent_100", condition: totalEntries >= 100, metadata: { triggerValue: totalEntries } },
    // Emotion
    { type: "emotion_3", condition: uniqueEmotions.size >= 3, metadata: { triggerValue: uniqueEmotions.size } },
    { type: "emotion_all", condition: uniqueEmotions.size >= 9, metadata: { triggerValue: uniqueEmotions.size } },
    // Social
    { type: "friend_1", condition: friendList.length >= 1, metadata: { triggerValue: friendList.length } },
    { type: "friend_5", condition: friendList.length >= 5, metadata: { triggerValue: friendList.length } },
    { type: "target_5", condition: uniqueTargetCount >= 5, metadata: { triggerValue: uniqueTargetCount } },
    // Time
    { type: "morning_writer", condition: hasMorning },
    { type: "night_writer", condition: hasNight },
    // Special
    { type: "first_entry", condition: totalEntries >= 1, metadata: { triggerValue: 1 } },
    { type: "devoted_target", condition: maxTargetCount >= 20, metadata: { triggerValue: maxTargetCount, triggerTargetId: devotedTargetId } },
    { type: "photo_lover", condition: photoCount >= 5, metadata: { triggerValue: photoCount } },
  ];

  // 4. Award new badges
  const newBadges: Badge[] = [];
  for (const check of checks) {
    if (earnedTypes.has(check.type)) continue;
    if (!check.condition) continue;
    const badge = await awardBadge(userId, check.type, check.metadata);
    if (badge) newBadges.push(badge);
  }

  return { newBadges };
}

// ─── Badge Detail Data ──────────────────────────────────

export interface BadgeDetailData {
  topTargets: { targetId: string; name: string; count: number }[];
  emotionStats: { emotion: string; count: number }[];
  totalEntries: number;
  earnedDate: string;
}

export async function getBadgeDetailData(
  userId: string,
  badgeType: BadgeType
): Promise<BadgeDetailData> {
  const [entries, targetList, earnedBadges] = await Promise.all([
    gratitude.getEntries(userId),
    targets.getTargets(userId),
    getEarnedBadges(userId),
  ]);

  const badge = earnedBadges.find((b) => b.type === badgeType);
  const earnedDate = badge?.earnedAt?.toDate
    ? badge.earnedAt.toDate().toLocaleDateString("ko-KR", {
        year: "numeric", month: "long", day: "numeric",
      })
    : "";

  // Build lookup
  const targetNameMap: Record<string, string> = {};
  for (const tgt of targetList) targetNameMap[tgt.id] = tgt.name;

  // Compute stats
  const tCounts: Record<string, number> = {};
  const eCounts: Record<string, number> = {};

  for (const entry of entries) {
    if (entry.targetId) {
      tCounts[entry.targetId] = (tCounts[entry.targetId] ?? 0) + 1;
    }
    for (const tag of entry.emotionTags) {
      eCounts[tag] = (eCounts[tag] ?? 0) + 1;
    }
  }

  const topTargets = Object.entries(tCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([targetId, count]) => ({
      targetId,
      name: targetNameMap[targetId] ?? targetId,
      count,
    }));

  const emotionStats = Object.entries(eCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([emotion, count]) => ({ emotion, count }));

  return { topTargets, emotionStats, totalEntries: entries.length, earnedDate };
}

// ─── Progress Computation ───────────────────────────────

export interface BadgeProgress {
  streak: number;
  totalEntries: number;
  uniqueEmotions: number;
  friendCount: number;
  uniqueTargets: number;
  hasMorningEntry: boolean;
  hasNightEntry: boolean;
  maxTargetCount: number;
  photoCount: number;
}

export async function computeBadgeProgress(userId: string): Promise<BadgeProgress> {
  const [streakData, entries, friendList] = await Promise.all([
    streak.getStreak(userId),
    gratitude.getEntries(userId),
    friends.getFriends(userId),
  ]);

  const uniqueEmotions = new Set<string>();
  const targetCounts: Record<string, number> = {};
  let photoCount = 0;
  let hasMorningEntry = false;
  let hasNightEntry = false;

  for (const entry of entries) {
    for (const tag of entry.emotionTags) uniqueEmotions.add(tag);
    if (entry.targetId) {
      targetCounts[entry.targetId] = (targetCounts[entry.targetId] ?? 0) + 1;
    }
    if (entry.imageUrl) photoCount++;

    const date = entry.createdAt?.toDate
      ? entry.createdAt.toDate()
      : new Date(entry.createdAt as unknown as string);
    const hour = date.getHours();
    if (hour < 6) hasMorningEntry = true;
    if (hour >= 23) hasNightEntry = true;
  }

  return {
    streak: streakData.currentStreak,
    totalEntries: entries.length,
    uniqueEmotions: uniqueEmotions.size,
    friendCount: friendList.length,
    uniqueTargets: new Set(Object.keys(targetCounts)).size,
    hasMorningEntry,
    hasNightEntry,
    maxTargetCount: Object.values(targetCounts).length > 0
      ? Math.max(...Object.values(targetCounts))
      : 0,
    photoCount,
  };
}

/** Get current progress value for a specific badge type */
export function getProgressForBadge(
  badgeType: BadgeType,
  progress: BadgeProgress
): number {
  const def = getBadgeDefinition(badgeType);
  if (!def) return 0;

  switch (badgeType) {
    case "streak_7d":
    case "streak_30d":
    case "streak_100d":
    case "streak_365d":
      return progress.streak;
    case "sent_10":
    case "sent_50":
    case "sent_100":
    case "first_entry":
      return progress.totalEntries;
    case "emotion_3":
    case "emotion_all":
      return progress.uniqueEmotions;
    case "friend_1":
    case "friend_5":
      return progress.friendCount;
    case "target_5":
      return progress.uniqueTargets;
    case "morning_writer":
      return progress.hasMorningEntry ? 1 : 0;
    case "night_writer":
      return progress.hasNightEntry ? 1 : 0;
    case "devoted_target":
      return progress.maxTargetCount;
    case "photo_lover":
      return progress.photoCount;
    default:
      return 0;
  }
}
