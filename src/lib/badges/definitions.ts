/**
 * 배지 정의 — 카탈로그, 카테고리, 아이콘 매핑
 */

import {
  Sprout, Leaf, TreePine, Mountain, Send, Heart, Star,
  Palette, Sparkles, UserPlus, Users, Target, Sunrise,
  Moon, Gift, Crown, ImagePlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BadgeCategory, BadgeDefinition } from "@/types";

// ─── Category Display Order ─────────────────────────────

export const BADGE_CATEGORY_ORDER: { category: BadgeCategory; nameKey: string }[] = [
  { category: "streak", nameKey: "badge_cat_streak" },
  { category: "sent_count", nameKey: "badge_cat_sent" },
  { category: "emotion", nameKey: "badge_cat_emotion" },
  { category: "social", nameKey: "badge_cat_social" },
  { category: "time_of_day", nameKey: "badge_cat_time" },
  { category: "special", nameKey: "badge_cat_special" },
];

// ─── All 17 Badge Definitions ───────────────────────────

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // Streak
  { type: "streak_7d", category: "streak", nameKey: "badge_streak_7d_name", descKey: "badge_streak_7d_desc", iconName: "Sprout", target: 7, order: 1 },
  { type: "streak_30d", category: "streak", nameKey: "badge_streak_30d_name", descKey: "badge_streak_30d_desc", iconName: "Leaf", target: 30, order: 2 },
  { type: "streak_100d", category: "streak", nameKey: "badge_streak_100d_name", descKey: "badge_streak_100d_desc", iconName: "TreePine", target: 100, order: 3 },
  { type: "streak_365d", category: "streak", nameKey: "badge_streak_365d_name", descKey: "badge_streak_365d_desc", iconName: "Mountain", target: 365, order: 4 },
  // Sent count
  { type: "sent_10", category: "sent_count", nameKey: "badge_sent_10_name", descKey: "badge_sent_10_desc", iconName: "Send", target: 10, order: 1 },
  { type: "sent_50", category: "sent_count", nameKey: "badge_sent_50_name", descKey: "badge_sent_50_desc", iconName: "Heart", target: 50, order: 2 },
  { type: "sent_100", category: "sent_count", nameKey: "badge_sent_100_name", descKey: "badge_sent_100_desc", iconName: "Star", target: 100, order: 3 },
  // Emotion
  { type: "emotion_3", category: "emotion", nameKey: "badge_emotion_3_name", descKey: "badge_emotion_3_desc", iconName: "Palette", target: 3, order: 1 },
  { type: "emotion_all", category: "emotion", nameKey: "badge_emotion_all_name", descKey: "badge_emotion_all_desc", iconName: "Sparkles", target: 9, order: 2 },
  // Social
  { type: "friend_1", category: "social", nameKey: "badge_friend_1_name", descKey: "badge_friend_1_desc", iconName: "UserPlus", target: 1, order: 1 },
  { type: "friend_5", category: "social", nameKey: "badge_friend_5_name", descKey: "badge_friend_5_desc", iconName: "Users", target: 5, order: 2 },
  { type: "target_5", category: "social", nameKey: "badge_target_5_name", descKey: "badge_target_5_desc", iconName: "Target", target: 5, order: 3 },
  // Time of day
  { type: "morning_writer", category: "time_of_day", nameKey: "badge_morning_name", descKey: "badge_morning_desc", iconName: "Sunrise", target: null, order: 1 },
  { type: "night_writer", category: "time_of_day", nameKey: "badge_night_name", descKey: "badge_night_desc", iconName: "Moon", target: null, order: 2 },
  // Special
  { type: "first_entry", category: "special", nameKey: "badge_first_name", descKey: "badge_first_desc", iconName: "Gift", target: 1, order: 1 },
  { type: "devoted_target", category: "special", nameKey: "badge_devoted_name", descKey: "badge_devoted_desc", iconName: "Crown", target: 20, order: 2 },
  { type: "photo_lover", category: "special", nameKey: "badge_photo_name", descKey: "badge_photo_desc", iconName: "ImagePlus", target: 5, order: 3 },
];

// ─── Legacy type mapping (old "7d" → "streak_7d") ──────

const LEGACY_MAP: Record<string, string> = {
  "7d": "streak_7d",
  "30d": "streak_30d",
  "100d": "streak_100d",
  "365d": "streak_365d",
};

export function getBadgeDefinition(typeOrLegacy: string): BadgeDefinition | undefined {
  const normalized = LEGACY_MAP[typeOrLegacy] ?? typeOrLegacy;
  return BADGE_DEFINITIONS.find((d) => d.type === normalized);
}

export function getBadgesByCategory(category: BadgeCategory): BadgeDefinition[] {
  return BADGE_DEFINITIONS
    .filter((d) => d.category === category)
    .sort((a, b) => a.order - b.order);
}

// ─── Icon Mapping ───────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  Sprout, Leaf, TreePine, Mountain, Send, Heart, Star,
  Palette, Sparkles, UserPlus, Users, Target, Sunrise,
  Moon, Gift, Crown, ImagePlus,
};

export function getBadgeIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] ?? Star;
}
