"use client";

import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Flame, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { GratitudeEntry } from "@/types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function getIntensity(count: number): string {
  if (count === 0) return "bg-muted";
  if (count === 1) return "bg-primary/30";
  if (count === 2) return "bg-primary/60";
  return "bg-primary";
}

export default function CalendarPage() {
  const { firebaseUser } = useAuth();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    Promise.all([
      api.gratitude.getEntries(uid),
      api.streak.getStreak(uid),
    ])
      .then(([allEntries, streakData]) => {
        setEntries(allEntries);
        setStreak(streakData.currentStreak);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [firebaseUser]);

  // Build date → count map
  const entriesByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const entry of entries) {
      const d = entry.createdAt?.toDate
        ? entry.createdAt.toDate()
        : new Date(entry.createdAt as unknown as string);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [entries]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);

    return days;
  }, [viewYear, viewMonth]);

  function goToPrevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  // Calculate stats for the viewed month
  const monthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
  const monthEntries = Object.entries(entriesByDate).filter(([key]) => key.startsWith(monthKey));
  const totalEntries = monthEntries.reduce((a, [, b]) => a + b, 0);
  const activeDays = monthEntries.length;

  if (loading) {
    return (
      <div className="flex flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-4 bg-background/80 px-4 py-4 backdrop-blur-md">
          <Link href="/home">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold">감사 캘린더</h1>
        </header>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-4 bg-background/80 px-4 py-4 backdrop-blur-md">
        <Link href="/home">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold">감사 캘린더</h1>
      </header>

      <div className="space-y-6 px-4 pb-8">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="flex flex-col items-center py-3">
              <span className="text-2xl font-bold text-primary">{streak}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                연속일
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center py-3">
              <span className="text-2xl font-bold">{totalEntries}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                총 감사
              </span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center py-3">
              <span className="text-2xl font-bold">{activeDays}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                활동일
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={goToPrevMonth}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="font-serif text-lg font-bold">
            {viewYear}년 {viewMonth + 1}월
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={goToNextMonth}
            disabled={isCurrentMonth}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <Card>
          <CardContent className="p-4">
            {/* Weekday headers */}
            <div className="mb-2 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-[10px] font-bold text-muted-foreground"
                >
                  {day}
                </div>
              ))}
            </div>
            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                if (day === null) {
                  return <div key={`empty-${i}`} className="aspect-square" />;
                }
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const count = entriesByDate[dateStr] ?? 0;
                const isToday = day === today.getDate() && isCurrentMonth;

                return (
                  <div
                    key={day}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-lg text-xs font-medium transition-colors",
                      getIntensity(count),
                      count > 0 ? "text-primary-foreground" : "text-muted-foreground",
                      isToday && "ring-2 ring-primary ring-offset-1"
                    )}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <span>적음</span>
          <div className="flex gap-1">
            <div className="h-4 w-4 rounded bg-muted" />
            <div className="h-4 w-4 rounded bg-primary/30" />
            <div className="h-4 w-4 rounded bg-primary/60" />
            <div className="h-4 w-4 rounded bg-primary" />
          </div>
          <span>많음</span>
        </div>

        {/* Streak Message */}
        <Card className="border-0 bg-secondary shadow-none">
          <CardContent className="p-4 text-center">
            {streak > 0 ? (
              <>
                <p className="flex items-center justify-center gap-1 text-sm font-medium">
                  <Flame className="h-4 w-4 text-primary" />
                  <span className="font-bold text-primary">{streak}일</span> 연속
                  감사 중!
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  내일이면 {streak + 1}일! 꾸준히 기록해보세요.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                오늘부터 감사 기록을 시작해보세요!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
