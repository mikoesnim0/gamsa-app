"use client";

import { useState, useEffect, useMemo } from "react";
import { Bell, PenLine, CalendarDays, Award, BarChart3, Calendar, FileText, Smile, Loader2 } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

const DAY_KEYS = ["day_mon", "day_tue", "day_wed", "day_thu", "day_fri", "day_sat", "day_sun"];

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

  const weeklyData = useMemo(() => {
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
    return DAY_KEYS.map((key, i) => ({
      dayKey: key,
      count: counts[i],
    }));
  }, [entries]);

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

  const dailyGoal = 3;
  const progress = Math.min(todayCount / dailyGoal, 1);

  return (
    <div className="flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-10 grid grid-cols-[40px_1fr_40px] items-center bg-background/80 px-5 py-4 backdrop-blur-md">
        <div />
        <h1 className="text-center font-serif text-[30px] font-bold italic leading-none tracking-tight text-primary">
          Gratella
        </h1>
        <Link href="/notifications">
          <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-primary/20">
            <Bell className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            {hasUnread && (
              <>
                <span className="absolute right-[6px] top-[4px] h-3.5 w-3.5 rounded-full bg-primary/45 animate-ping" />
                <span className="absolute right-[8px] top-[6px] h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
              </>
            )}
          </Button>
        </Link>
      </header>

      <div className="space-y-5 px-4 pb-8">
        {/* Today's Record Card */}
        <div className="rounded-[28px] border border-primary/10 bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold">{t("home_todays_record")}</h2>
              <p className="text-sm text-muted-foreground">
                {t("home_sent_count", { count: todayCount })} / {t("home_received_count", { count: 0 })}
              </p>
            </div>
            <Link href="/write">
              <div className="rounded-full bg-secondary p-2">
                <PenLine className="h-5 w-5 text-primary" />
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-5 rounded-[20px] bg-secondary p-3">
            <div className="relative flex shrink-0 items-center justify-center">
              <svg width="70" height="70" viewBox="0 0 70 70">
                <circle cx="35" cy="35" r="29" fill="none" stroke="currentColor" strokeWidth="5" className="text-primary/20" />
                <circle cx="35" cy="35" r="29" fill="none" stroke="currentColor" strokeWidth="5" className="text-primary" strokeLinecap="round" strokeDasharray={`${progress * 182.2} 182.2`} transform="rotate(-90 35 35)" />
              </svg>
              <span className="absolute text-base font-bold text-primary">
                {todayCount}/{dailyGoal}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="font-serif text-2xl font-bold text-foreground">{todayCount}</p>
              <p className="text-xs text-muted-foreground">{t("home_todays_gratitude")}</p>
              {todayCount >= dailyGoal ? (
                <p className="text-[10px] text-primary">{t("home_daily_goal_achieved")}</p>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  {t("home_daily_goal_remaining", { remaining: dailyGoal - todayCount })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Received Letters Summary */}
        <Link href="/records?tab=received">
          <div className="flex items-center gap-4 rounded-full bg-secondary px-5 py-3.5 transition-colors hover:bg-secondary/80">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card shadow-sm">
              <Smile className="h-5 w-5 text-primary" />
            </div>
            <p className="text-[15px] font-medium leading-snug text-foreground">
              {receivedCount > 0
                ? t("home_received_message", { count: receivedCount })
                : t("home_no_received_this_week")}
            </p>
          </div>
        </Link>

        {/* Weekly Summary Card */}
        <div className="rounded-xl border border-[#ece8ea] bg-[#f2f2f3] p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-[#efb8c2]" />
            <h2 className="text-base font-bold text-[#1f2a3d]">{t("home_weekly_summary")}</h2>
          </div>
          {weeklyData.reduce((a, b) => a + b.count, 0) > 0 ? (
            <div className="flex items-end gap-2">
              {weeklyData.map((d) => (
                <div key={d.dayKey} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-[#efb8c2]">
                    {d.count > 0 ? d.count : ""}
                  </span>
                  <div
                    className="w-full transition-all"
                    style={{ height: `${Math.max(d.count * 14, 4)}px` }}
                  >
                    <div className={`h-full w-full rounded-sm ${d.count > 0 ? "bg-[#efb8c2]" : "bg-[#efb8c2]/20"}`} />
                  </div>
                  <span className="text-[10px] text-[#8d99ac]">{t(d.dayKey)}</span>
                </div>
              ))}
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm text-[#8d99ac]">{t("home_no_weekly_activity")}</p>
              <div className="flex gap-2">
                {DAY_KEYS.map((key) => (
                  <div key={key} className="flex flex-1 flex-col items-center gap-1">
                    <div className="h-1 w-full rounded-sm bg-[#efb8c2]/20" />
                    <span className="text-[10px] text-[#8d99ac]">{t(key)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Quick Access Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { href: "/home/calendar", icon: Calendar, labelKey: "home_gratitude_calendar", subKey: "home_record_status" },
            { href: "/badges", icon: Award, labelKey: "home_badges", subKey: "home_challenge_status" },
            { href: "/report", icon: BarChart3, labelKey: "home_annual_report", sub: t("home_year_label", { year: new Date().getFullYear() }) },
            { href: "/gratitude-page/create", icon: FileText, labelKey: "home_gratitude_page", subKey: "home_gift" },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <div className="rounded-[20px] border border-border/50 bg-card p-3 shadow-sm transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{t(item.labelKey)}</p>
                    <p className="text-[10px] text-muted-foreground">{item.sub ?? t(item.subKey!)}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Letters */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-serif text-xl font-bold">{t("home_recent_gratitude")}</h3>
            <Link href="/records" className="text-sm font-medium text-primary">
              {t("home_view_all")}
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentLetters.length > 0 ? (
            <div className="space-y-4">
              {recentLetters.map((letter, idx) => (
                <Link key={letter.id} href={`/records/${letter.id}`}>
                  <div className="rounded-[32px] border border-[#eceff3] bg-card p-5 shadow-[0_2px_0_rgba(0,0,0,0.03)] transition-colors hover:bg-muted/30">
                    <div className="flex gap-4">
                      <div className={cn(
                        "flex h-14 w-14 shrink-0 items-center justify-center rounded-full",
                        idx === 0 ? "bg-[#f7efe6]" : "bg-secondary"
                      )}>
                        <Avatar className="h-14 w-14">
                          <AvatarFallback className={cn(
                            "font-serif text-lg",
                            idx === 0
                              ? "bg-[#f7efe6] text-primary"
                              : "bg-secondary text-[#a9b6c8]"
                          )}>
                            {letter.name[0]}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="mb-1 flex items-start justify-between gap-3">
                          <h4 className="truncate font-serif text-xl font-bold leading-none">{letter.name}</h4>
                          <span className="pt-0.5 shrink-0 text-[13px] text-muted-foreground">
                            {letter.timeAgo}
                          </span>
                        </div>
                        {letter.title && (
                          <p className="mt-1 truncate text-[14px] font-semibold text-foreground/80">
                            {letter.title}
                          </p>
                        )}
                        <p className="mt-1 line-clamp-2 text-[14px] leading-[1.45] text-muted-foreground">
                          {letter.content}
                        </p>
                        {letter.tags.length > 0 && (
                          <div className="mt-2.5 flex gap-2">
                            {letter.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-[#f7efe6] px-3 py-1 font-serif text-[11px] font-bold uppercase tracking-wider text-[#7386a4]"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-[20px] bg-secondary py-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t("home_no_entries_yet")}
              </p>
              <Link href="/write">
                <Button variant="link" className="mt-1 text-primary">
                  {t("home_write_first")}
                </Button>
              </Link>
            </div>
          )}
        </section>

        {/* Insights Banner */}
        <div className="flex items-center gap-3 rounded-full bg-secondary px-5 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card shadow-sm">
            <Smile className="h-4 w-4 text-primary" strokeWidth={1.5} />
          </div>
          <p className="text-[13px] font-medium text-foreground">
            {t("home_insight_banner")}
          </p>
        </div>
      </div>
    </div>
  );
}
