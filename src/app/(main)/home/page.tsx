"use client";

import { useState, useEffect, useMemo } from "react";
import { Settings, Bell, PenLine, CalendarDays, Award, BarChart3, Calendar, FileText, Smile, Loader2 } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    Promise.all([
      api.gratitude.getRecentEntries(uid, 10),
      api.targets.getTargets(uid),
      api.gratitude.getTodayEntryCount(uid),
    ])
      .then(([recentEntries, targetList, count]) => {
        setEntries(recentEntries);
        setTargets(targetList);
        setTodayCount(count);
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
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background/80 px-6 py-4 backdrop-blur-md">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/20">
            <Settings className="h-5 w-5 text-muted-foreground" />
          </Button>
        </Link>
        <h1 className="font-serif text-2xl font-bold italic tracking-tight text-primary">
          감사노트
        </h1>
        <Link href="/notifications">
          <Button variant="ghost" size="icon" className="relative rounded-full hover:bg-primary/20">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-background bg-primary" />
          </Button>
        </Link>
      </header>

      <div className="space-y-6 px-4 pb-8">
        {/* Today's Record Card */}
        <Card className="border-primary/10 shadow-sm">
          <CardContent className="p-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold">오늘의 기록</h2>
                <p className="text-sm text-muted-foreground">
                  {todayCount}개 작성
                </p>
              </div>
              <Link href="/write">
                <div className="rounded-full bg-secondary p-2">
                  <PenLine className="h-5 w-5 text-primary" />
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-6 rounded-lg bg-secondary p-4">
              {/* Daily goal ring */}
              <div className="relative flex shrink-0 items-center justify-center">
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-primary/20" />
                  <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-primary" strokeLinecap="round" strokeDasharray={`${progress * 213.6} 213.6`} transform="rotate(-90 40 40)" />
                </svg>
                <span className="absolute text-lg font-bold text-primary">
                  {todayCount}/{dailyGoal}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-serif text-2xl font-bold text-foreground">{todayCount}</p>
                <p className="text-xs text-muted-foreground">오늘의 감사 편지</p>
                {todayCount >= dailyGoal ? (
                  <p className="text-[10px] text-primary">일일 목표 달성!</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">
                    {dailyGoal - todayCount}개 더 작성하면 목표 달성!
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Summary Card */}
        <Card className="border-primary/20 bg-primary/10">
          <CardContent className="p-5">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-bold">주간 요약</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  총 {weeklyData.reduce((a, b) => a + b.count, 0)}개
                </p>
              </div>
              {/* 7-day sparkline bar chart */}
              <div className="flex items-end gap-2">
                {weeklyData.map((d) => (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[9px] font-bold text-primary">
                      {d.count > 0 ? d.count : ""}
                    </span>
                    <div
                      className="w-full rounded-t transition-all"
                      style={{ height: `${Math.max(d.count * 16, 4)}px` }}
                    >
                      <div className={`h-full w-full rounded-t ${d.count > 0 ? "bg-primary" : "bg-primary/20"}`} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{d.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Access Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/home/calendar">
            <Card className="shadow-sm transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">감사 캘린더</p>
                  <p className="text-[10px] text-muted-foreground">기록 현황</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/badges">
            <Card className="shadow-sm transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <Award className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">배지</p>
                  <p className="text-[10px] text-muted-foreground">도전 현황</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/report">
            <Card className="shadow-sm transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">연간 리포트</p>
                  <p className="text-[10px] text-muted-foreground">{new Date().getFullYear()}년</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/gratitude-page/create">
            <Card className="shadow-sm transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">감사 페이지</p>
                  <p className="text-[10px] text-muted-foreground">선물하기</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Letters */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold">최근 편지</h3>
            <Link href="/records" className="text-sm font-medium text-primary">
              전체 보기
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentLetters.length > 0 ? (
            <div className="space-y-4">
              {recentLetters.map((letter) => (
                <Card key={letter.id} className="shadow-sm">
                  <CardContent className="flex gap-4 p-4">
                    <Avatar className="h-12 w-12 shrink-0 bg-secondary">
                      <AvatarFallback className="bg-secondary text-primary">
                        {letter.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="mb-1 flex items-start justify-between">
                        <h4 className="font-bold">{letter.name}</h4>
                        <span className="text-[10px] text-muted-foreground">
                          {letter.timeAgo}
                        </span>
                      </div>
                      <p className="mb-2 line-clamp-2 text-sm leading-snug text-muted-foreground">
                        &ldquo;{letter.content}&rdquo;
                      </p>
                      <div className="flex gap-2">
                        {letter.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="bg-primary/20 text-[10px] font-bold uppercase tracking-wider text-primary"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-0 bg-secondary shadow-none">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  아직 작성한 감사가 없습니다.
                </p>
                <Link href="/write">
                  <Button variant="link" className="mt-2 text-primary">
                    첫 감사 편지 쓰러 가기
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Insights Banner */}
        <Card className="border-0 bg-secondary shadow-none">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-full bg-card p-2 shadow-sm">
              <Smile className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">
              매일 감사를 기록하면, 마음이 따뜻해져요.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
