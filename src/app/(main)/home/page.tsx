"use client";

import { useState, useEffect, useMemo } from "react";
import { Bell, PenLine, CalendarDays, Award, BarChart3, Calendar, FileText, Smile, Loader2 } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { GratitudeEntry, Target } from "@/types";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

const EMOTION_LABELS: Record<string, string> = {
  gratitude: "감사",
  comfort: "위로",
  respect: "존경",
  love: "사랑",
  warmth: "따뜻함",
  joy: "기쁨",
  nostalgia: "그리움",
  trust: "신뢰",
  hope: "희망",
};

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return date.toLocaleDateString("ko-KR");
}

export default function HomePage() {
  const { firebaseUser } = useAuth();
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [hasUnread, setHasUnread] = useState(false);
  const [receivedCount, setReceivedCount] = useState(0);
  const [loading, setLoading] = useState(true);

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

  // Build target name lookup
  const targetNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of targets) map[t.id] = t.name;
    return map;
  }, [targets]);

  // Compute weekly data from recent entries
  const weeklyData = useMemo(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() + mondayOffset);

    const counts = [0, 0, 0, 0, 0, 0, 0]; // 월~일
    for (const entry of entries) {
      const d = entry.createdAt?.toDate ? entry.createdAt.toDate() : new Date(entry.createdAt as unknown as string);
      if (d >= monday) {
        const idx = d.getDay() === 0 ? 6 : d.getDay() - 1; // Mon=0, Sun=6
        counts[idx]++;
      }
    }
    return ["월", "화", "수", "목", "금", "토", "일"].map((day, i) => ({
      day,
      count: counts[i],
    }));
  }, [entries]);

  // Recent 5 for display
  const recentLetters = useMemo(() => {
    return entries.slice(0, 5).map((entry) => {
      const d = entry.createdAt?.toDate ? entry.createdAt.toDate() : new Date(entry.createdAt as unknown as string);
      return {
        id: entry.id,
        name: entry.targetId ? (targetNames[entry.targetId] ?? "알 수 없음") : "나에게",
        title: entry.title,
        content: entry.content,
        timeAgo: getRelativeTime(d),
        tags: entry.emotionTags.map((t) => EMOTION_LABELS[t] ?? t),
      };
    });
  }, [entries, targetNames]);

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

      <div className="space-y-3 px-4 pb-8">
        {/* Today's Record Card */}
        <div className="rounded-[28px] border border-primary/10 bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold">오늘의 기록</h2>
              <p className="text-sm text-muted-foreground">
                {todayCount} 보낸 감사 / 0 받은 감사
              </p>
            </div>
            <Link href="/write">
              <div className="rounded-full bg-secondary p-2">
                <PenLine className="h-5 w-5 text-primary" />
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-5 rounded-[20px] bg-secondary p-3">
            {/* Daily goal ring */}
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
              <p className="text-xs text-muted-foreground">오늘의 감사</p>
              {todayCount >= dailyGoal ? (
                <p className="text-[10px] text-primary">일일 목표 달성!</p>
              ) : (
                <p className="text-[10px] text-muted-foreground">
                  {dailyGoal - todayCount}개 더 작성하면 목표 달성!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Received Letters Summary — capsule card */}
        <Link href="/records?tab=received">
          <div className="flex items-center gap-4 rounded-full bg-secondary px-5 py-3.5 transition-colors hover:bg-secondary/80">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card shadow-sm">
              <Smile className="h-5 w-5 text-primary" />
            </div>
            <p className="text-[15px] font-medium leading-snug text-foreground">
              {receivedCount > 0
                ? `${receivedCount}개의 감사가 와있어요`
                : "이번 주는 받은 감사가 없어요"}
            </p>
          </div>
        </Link>

        {/* Weekly Summary Card — analytical square style */}
        <div className="rounded-xl border border-[#ece8ea] bg-[#f2f2f3] p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-[#efb8c2]" />
            <h2 className="text-base font-bold text-[#1f2a3d]">주간 요약</h2>
          </div>
          {weeklyData.reduce((a, b) => a + b.count, 0) > 0 ? (
            <div className="flex items-end gap-2">
              {weeklyData.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-[#efb8c2]">
                    {d.count > 0 ? d.count : ""}
                  </span>
                  <div
                    className="w-full transition-all"
                    style={{ height: `${Math.max(d.count * 14, 4)}px` }}
                  >
                    <div className={`h-full w-full rounded-sm ${d.count > 0 ? "bg-[#efb8c2]" : "bg-[#efb8c2]/20"}`} />
                  </div>
                  <span className="text-[10px] text-[#8d99ac]">{d.day}</span>
                </div>
              ))}
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm text-[#8d99ac]">이번 주 활동이 아직 없어요.</p>
              <div className="flex gap-2">
                {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
                  <div key={d} className="flex flex-1 flex-col items-center gap-1">
                    <div className="h-1 w-full rounded-sm bg-[#efb8c2]/20" />
                    <span className="text-[10px] text-[#8d99ac]">{d}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Quick Access Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { href: "/home/calendar", icon: Calendar, label: "감사 캘린더", sub: "기록 현황" },
            { href: "/badges", icon: Award, label: "배지", sub: "도전 현황" },
            { href: "/report", icon: BarChart3, label: "연간 리포트", sub: `${new Date().getFullYear()}년` },
            { href: "/gratitude-page/create", icon: FileText, label: "감사 페이지", sub: "선물하기" },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <div className="rounded-[20px] border border-border/50 bg-card p-3 shadow-sm transition-colors hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Letters */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-serif text-xl font-bold">최근 감사</h3>
            <Link href="/records" className="text-sm font-medium text-primary">
              전체 보기
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentLetters.length > 0 ? (
            <div className="space-y-2.5">
              {recentLetters.map((letter) => (
                <Link key={letter.id} href={`/records/${letter.id}`}>
                  <div className="rounded-[24px] border border-border/50 bg-card p-4 shadow-sm transition-colors hover:bg-muted/30">
                    <div className="flex gap-3">
                      <Avatar className="h-11 w-11 shrink-0 bg-secondary">
                        <AvatarFallback className="bg-secondary text-primary font-serif text-base">
                          {letter.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <p className="truncate font-bold">{letter.name}</p>
                          <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
                            {letter.timeAgo}
                          </span>
                        </div>
                        {letter.title && (
                          <p className="mt-0.5 truncate text-[13px] font-semibold text-foreground/80">
                            {letter.title}
                          </p>
                        )}
                        <p className="mt-0.5 line-clamp-1 text-[13px] text-muted-foreground">
                          &ldquo;{letter.content}&rdquo;
                        </p>
                        {letter.tags.length > 0 && (
                          <div className="mt-1.5 flex gap-1.5">
                            {letter.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary"
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
                아직 작성한 감사가 없습니다.
              </p>
              <Link href="/write">
                <Button variant="link" className="mt-1 text-primary">
                  첫 감사 쓰러 가기
                </Button>
              </Link>
            </div>
          )}
        </section>

        {/* Insights Banner — capsule */}
        <div className="flex items-center gap-3 rounded-full bg-secondary px-5 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card shadow-sm">
            <Smile className="h-4 w-4 text-primary" strokeWidth={1.5} />
          </div>
          <p className="text-[13px] font-medium text-foreground">
            매일 감사를 기록하면, 마음이 따뜻해져요.
          </p>
        </div>
      </div>
    </div>
  );
}
