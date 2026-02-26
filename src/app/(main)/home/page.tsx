"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n-context";
import type { GratitudeEntry, Target } from "@/types";

const EMOTION_KEYS: Record<string, string> = {
  gratitude: "emotion_gratitude",
  comfort: "emotion_comfort",
  respect: "emotion_respect",
  love: "emotion_love",
  warmth: "emotion_warmth",
  joy: "emotion_joy",
  nostalgia: "emotion_nostalgia",
  trust: "emotion_trust",
  hope: "emotion_hope",
};

export default function HomePage() {
  const { firebaseUser } = useAuth();
  const { t } = useI18n();
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [hasUnread, setHasUnread] = useState(false);
  const [receivedCount, setReceivedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  function getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return t("time_just_now");
    if (diffMin < 60) return t("time_minutes_ago", { count: diffMin });
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return t("time_hours_ago", { count: diffHour });
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return t("time_days_ago", { count: diffDay });
    return date.toLocaleDateString("ko-KR");
  }

  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    Promise.all([
      api.gratitude.getRecentEntries(uid, 10),
      api.targets.getTargets(uid),
      api.gratitude.getTodayEntryCount(uid),
      api.notifications.getUnreadCount(uid),
      api.gratitude.getWeeklyReceivedCount(uid),
    ])
      .then(([recentEntries, targetList, count, unreadCount, weeklyReceived]) => {
        setEntries(recentEntries);
        setTargets(targetList);
        setTodayCount(count);
        setHasUnread(unreadCount > 0);
        setReceivedCount(weeklyReceived);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [firebaseUser]);

  const targetNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const tgt of targets) map[tgt.id] = tgt.name;
    return map;
  }, [targets]);

  const weeklyText = useMemo(() => {
    const total = entries.filter((e) => {
      const d = e.createdAt?.toDate ? e.createdAt.toDate() : new Date(e.createdAt as unknown as string);
      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setHours(0, 0, 0, 0);
      monday.setDate(monday.getDate() + mondayOffset);
      return d >= monday;
    }).length;
    if (total === 0) return t("home_no_weekly_activity");
    return t("home_weekly_summary_count", { count: total });
  }, [entries, t]);

  const weeklyBars = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() + mondayOffset);

    const counts = [0, 0, 0, 0, 0, 0, 0];
    for (const entry of entries) {
      const d = entry.createdAt?.toDate ? entry.createdAt.toDate() : new Date(entry.createdAt as unknown as string);
      if (d >= monday) {
        const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
        counts[idx]++;
      }
    }
    const max = Math.max(...counts, 1);
    return counts.map((c) => c / max);
  }, [entries]);

  const weeklyTopEmotion = useMemo(() => {
    const emotionCounts: Record<string, number> = {};
    for (const entry of entries) {
      for (const tag of entry.emotionTags) {
        emotionCounts[tag] = (emotionCounts[tag] || 0) + 1;
      }
    }
    const sorted = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return null;
    return t(EMOTION_KEYS[sorted[0][0]] ?? sorted[0][0]);
  }, [entries, t]);

  const recentLetters = useMemo(() => {
    return entries.slice(0, 5).map((entry) => {
      const d = entry.createdAt?.toDate ? entry.createdAt.toDate() : new Date(entry.createdAt as unknown as string);
      return {
        id: entry.id,
        name: entry.targetId ? (targetNames[entry.targetId] ?? t("common_unknown")) : t("common_to_self"),
        title: entry.title,
        content: entry.content,
        timeAgo: getRelativeTime(d),
        tags: entry.emotionTags.map((tag) => t(EMOTION_KEYS[tag] ?? tag)),
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, targetNames, t]);

  const letterCount = entries.length;
  const sentCount = todayCount;

  if (loading) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <main className="screen-safe-top min-h-screen bg-[#f8f6f6] text-[#1d2b44]">
      <div className="content-safe-bottom mx-auto w-full max-w-[620px] px-6 pt-6">

        {/* ── Header ── */}
        <header className="mb-7 flex items-center justify-between">
          <span className="h-10 w-10" />
          <h1 className="font-serif text-[34px] font-bold italic leading-none tracking-[-1px] text-[#f0b7c4]">
            Today
          </h1>
          <Link
            href="/notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-full"
          >
            <span className="material-symbols-outlined text-[34px] text-[#2f3f57]">
              notifications
            </span>
            {hasUnread && (
              <>
                <span className="absolute right-[6px] top-[4px] h-3.5 w-3.5 rounded-full bg-[#f0b7c4]/45 animate-ping" />
                <span className="absolute right-[8px] top-[6px] h-2.5 w-2.5 rounded-full bg-[#f0b7c4] animate-pulse" />
              </>
            )}
          </Link>
        </header>

        {/* ── Section 1: Today's Record ── */}
        <section className="mb-8 rounded-[54px] border border-[#ececec] bg-white p-8 shadow-[0_2px_0_rgba(0,0,0,0.03)]">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="font-serif text-[30px] font-bold leading-none tracking-[-0.8px] text-[#141f35]">
                {t("home_todays_record")}
              </h2>
              <p className="mt-2 text-[16px] text-[#5f7392]">
                {sentCount} {t("home_sent_count", { count: sentCount })} / {receivedCount} {t("home_received_count", { count: receivedCount })}
              </p>
            </div>
            <Link
              href="/write"
              className="mt-1 flex h-16 w-16 items-center justify-center rounded-full bg-[#f7efe6]"
            >
              <span className="material-symbols-outlined text-[28px] text-[#f0b7c4]">
                edit_note
              </span>
            </Link>
          </div>

          {/* Letter Count Gradient Card */}
          <Link
            href="/records"
            className="flex h-[150px] w-full items-center justify-center rounded-[38px]"
            style={{
              background: "linear-gradient(90deg, #d79284 0%, #e2c3ac 52%, #e5e8db 100%)",
            }}
          >
            <span className="font-serif text-[38px] font-bold italic leading-none text-[#efc4cc]">
              {letterCount} {t("home_letters_label")}
            </span>
          </Link>
        </section>

        {/* ── Section 2: Weekly Emotion Summary ── */}
        <section className="mb-9 rounded-[44px] bg-[#f7efe6] p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
              <span className="material-symbols-outlined text-[31px] text-[#eeb8c3]">
                sentiment_satisfied
              </span>
            </div>
            <p className="font-serif text-[21px] leading-[1.35] text-[#1d2b44]">
              {weeklyTopEmotion
                ? `${t("home_weekly_top_emotion")} "${weeklyTopEmotion}".`
                : t("home_no_received_this_week")}
            </p>
          </div>
        </section>

        {/* ── Section 3: Weekly Summary ── */}
        <section className="mb-9 rounded-[54px] border border-[#f0dce1] bg-[#f9f6f7] p-8">
          <div className="mb-5 flex items-center gap-4">
            <div className="flex items-center gap-1">
              <i className="h-7 w-2 rounded-full bg-[#f0b7c4]" />
              <i className="h-7 w-2 rounded-full bg-[#f0b7c4]" />
              <i className="h-7 w-2 rounded-full bg-[#f0b7c4]" />
            </div>
            <h3 className="font-serif text-[30px] font-bold leading-none tracking-[-0.8px] text-[#141f35]">
              {t("home_weekly_summary")}
            </h3>
          </div>
          <p className="text-[24px] leading-[1.45] text-[#334a69]">
            {weeklyText}
          </p>
          <div className="mt-6 grid grid-cols-5 gap-3">
            {weeklyBars.slice(0, 5).map((v, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full"
                style={{
                  backgroundColor:
                    v > 0
                      ? `rgba(240, 183, 196, ${0.35 + 0.65 * v})`
                      : "#ead8dd",
                }}
              />
            ))}
          </div>
        </section>

        {/* ── Section 4: Quick Access Grid ── */}
        <section className="mb-9 grid grid-cols-2 gap-3">
          {[
            { href: "/home/calendar", icon: "calendar_month", labelKey: "home_gratitude_calendar", subKey: "home_record_status" },
            { href: "/badges", icon: "military_tech", labelKey: "home_badges", subKey: "home_challenge_status" },
            { href: "/report", icon: "bar_chart", labelKey: "home_annual_report", sub: t("home_year_label", { year: new Date().getFullYear() }) },
            { href: "/gratitude-page/create", icon: "redeem", labelKey: "home_gratitude_page", subKey: "home_gift" },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <div className="rounded-[28px] border border-[#eceff3] bg-white p-4 shadow-[0_2px_0_rgba(0,0,0,0.03)] transition-colors hover:bg-[#f7efe6]/30">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f7efe6]">
                    <span className="material-symbols-outlined text-[20px] text-[#eeb8c3]">
                      {item.icon}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-[#141f35]">{t(item.labelKey)}</p>
                    <p className="text-[11px] text-[#8d99ac]">{item.sub ?? t(item.subKey!)}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </section>

        {/* ── Section 5: Recent Letters ── */}
        <section className="mb-8">
          <div className="mb-4 flex items-end justify-between">
            <h3 className="font-serif text-[30px] font-bold leading-none tracking-[-0.7px] text-[#141f35]">
              {t("home_recent_gratitude")}
            </h3>
            <Link
              href="/records"
              className="text-[17px] font-semibold text-[#f0b7c4]"
            >
              {t("home_view_all")}
            </Link>
          </div>

          <div className="space-y-5">
            {recentLetters.length === 0 ? (
              <div className="rounded-[26px] bg-[#f2f2f3] px-4 py-5 text-[15px] text-[#8d99ac]">
                {t("home_no_entries_yet")}
              </div>
            ) : (
              recentLetters.map((letter, idx) => (
                <Link
                  key={letter.id}
                  href={`/records/${letter.id}`}
                  className="block rounded-[54px] border border-[#eceff3] bg-white p-6 shadow-[0_2px_0_rgba(0,0,0,0.03)]"
                >
                  <div className="flex gap-5">
                    <div
                      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${
                        idx === 0 ? "bg-[#f7efe6]" : "bg-[#eff2f6]"
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-[34px] ${
                          idx === 0 ? "text-[#eeb8c3]" : "text-[#a9b6c8]"
                        }`}
                      >
                        person
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-start justify-between gap-3">
                        <h4 className="truncate font-serif text-[22px] font-bold leading-none tracking-[-0.5px] text-[#141f35]">
                          {letter.name}
                        </h4>
                        <span className="shrink-0 pt-1 text-[14px] text-[#98a8bf]">
                          {letter.timeAgo}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-[15px] leading-[1.45] text-[#5d7291]">
                        {letter.content}
                      </p>
                      {letter.tags.length > 0 && (
                        <div className="mt-3 flex gap-3">
                          {letter.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-[#f7efe6] px-4 py-1.5 font-serif text-[12px] font-bold uppercase tracking-[1.2px] text-[#7386a4]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* ── Insights Banner ── */}
        <div className="mb-6 flex items-center gap-3 rounded-full bg-[#f7efe6] px-5 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
            <span className="material-symbols-outlined text-[18px] text-[#eeb8c3]">
              sentiment_satisfied
            </span>
          </div>
          <p className="text-[13px] font-medium text-[#1d2b44]">
            {t("home_insight_banner")}
          </p>
        </div>
      </div>
    </main>
  );
}
