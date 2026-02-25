"use client";

import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Share2, Calendar, Smile, Users, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { GratitudeEntry, Target } from "@/types";

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

type FilterType = "latest" | "emotion" | "friend";

export default function RecordsPage() {
  const { firebaseUser } = useAuth();
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>("latest");

  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    Promise.all([
      api.gratitude.getEntries(uid),
      api.targets.getTargets(uid),
    ])
      .then(([allEntries, targetList]) => {
        setEntries(allEntries);
        setTargets(targetList);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [firebaseUser]);

  const targetNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of targets) map[t.id] = t.name;
    return map;
  }, [targets]);

  // Compute emotion ratios
  const emotionRatios = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;
    for (const entry of entries) {
      for (const tag of entry.emotionTags) {
        counts[tag] = (counts[tag] ?? 0) + 1;
        total++;
      }
    }
    if (total === 0) return [];
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([emotion, count], i) => ({
        emotion: EMOTION_LABELS[emotion] ?? emotion,
        percentage: Math.round((count / total) * 100),
        color: i === 0 ? "bg-primary" : i === 1 ? "bg-primary/60" : "bg-muted",
      }));
  }, [entries]);

  const totalSent = entries.length;

  // Format entries for display
  const lettersList = useMemo(() => {
    return entries.map((entry) => {
      const d = entry.createdAt?.toDate
        ? entry.createdAt.toDate()
        : new Date(entry.createdAt as unknown as string);
      return {
        id: entry.id,
        name: entry.targetId ? (targetNames[entry.targetId] ?? "알 수 없음") : "나에게",
        preview: entry.content.slice(0, 40) + (entry.content.length > 40 ? "..." : ""),
        timeAgo: getRelativeTime(d),
        tag: entry.emotionTags[0] ? (EMOTION_LABELS[entry.emotionTags[0]] ?? entry.emotionTags[0]) : "",
      };
    });
  }, [entries, targetNames]);

  function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: "감사노트 기록",
        text: `총 ${totalSent}개의 감사를 전했어요!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      toast.success("공유 링크가 복사되었습니다!");
    }
  }

  const filters: { value: FilterType; label: string; icon: typeof Calendar }[] = [
    { value: "latest", label: "최신순", icon: Calendar },
    { value: "emotion", label: "감정별", icon: Smile },
    { value: "friend", label: "친구별", icon: Users },
  ];

  const positivePercent = emotionRatios.length > 0
    ? emotionRatios.reduce((a, b) => a + b.percentage, 0)
    : 0;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background/80 px-4 py-4 backdrop-blur-md">
        <Link href="/home">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold">기록 & 통계</h1>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={handleShare}>
          <Share2 className="h-5 w-5 text-muted-foreground" />
        </Button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="px-4 pb-8">
          <Tabs defaultValue="total" className="w-full">
            <TabsList className="mb-6 w-full">
              <TabsTrigger value="total" className="flex-1">전체</TabsTrigger>
              <TabsTrigger value="sent" className="flex-1">보낸</TabsTrigger>
              <TabsTrigger value="received" className="flex-1">받은</TabsTrigger>
            </TabsList>

            <TabsContent value="total" className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">보낸 감사</p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-3xl font-bold">{totalSent}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {emotionRatios[0] ? `Most: ${emotionRatios[0].emotion}` : ""}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">받은 감사</p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-3xl font-bold">0</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">&nbsp;</p>
                  </CardContent>
                </Card>
              </div>

              {/* Emotion Ratios */}
              {emotionRatios.length > 0 && (
                <Card>
                  <CardContent className="p-5">
                    <h3 className="mb-4 text-lg font-bold">감정 비율</h3>
                    <div className="flex items-center gap-6">
                      {/* Donut Chart */}
                      <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
                        <svg viewBox="0 0 36 36" className="h-28 w-28 -rotate-90">
                          <circle
                            cx="18" cy="18" r="15.915"
                            fill="none" stroke="currentColor" strokeWidth="3"
                            className="text-muted"
                          />
                          {emotionRatios[0] && (
                            <circle
                              cx="18" cy="18" r="15.915"
                              fill="none" stroke="currentColor" strokeWidth="3"
                              strokeDasharray={`${emotionRatios[0].percentage} ${100 - emotionRatios[0].percentage}`}
                              className="text-primary"
                            />
                          )}
                          {emotionRatios[1] && (
                            <circle
                              cx="18" cy="18" r="15.915"
                              fill="none" stroke="currentColor" strokeWidth="3"
                              strokeDasharray={`${emotionRatios[1].percentage} ${100 - emotionRatios[1].percentage}`}
                              strokeDashoffset={`-${emotionRatios[0]?.percentage ?? 0}`}
                              className="text-primary/60"
                            />
                          )}
                        </svg>
                        <div className="absolute text-center">
                          <span className="text-xl font-bold">{positivePercent}%</span>
                          <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                            긍정
                          </p>
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="space-y-3">
                        {emotionRatios.map((item) => (
                          <div key={item.emotion} className="flex items-center gap-3">
                            <div className={`h-3 w-3 rounded-full ${item.color}`} />
                            <span className="text-sm">{item.emotion}</span>
                            <span className="ml-auto text-sm font-bold">
                              {item.percentage}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Filter Chips */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {filters.map((filter) => (
                  <Badge
                    key={filter.value}
                    variant={activeFilter === filter.value ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer shrink-0 rounded-full transition-colors",
                      activeFilter === filter.value
                        ? "bg-primary text-primary-foreground"
                        : ""
                    )}
                    onClick={() => setActiveFilter(filter.value)}
                  >
                    <filter.icon className="mr-1 h-3 w-3" /> {filter.label}
                  </Badge>
                ))}
              </div>

              {/* Letters List */}
              <section>
                <h3 className="mb-4 text-lg font-bold">최근 편지</h3>
                {lettersList.length > 0 ? (
                  <div className="space-y-3">
                    {lettersList.map((letter) => (
                      <Card key={letter.id} className="shadow-sm">
                        <CardContent className="flex items-center gap-4 p-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-secondary text-primary">
                              {letter.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <p className="text-sm font-bold">
                                To: {letter.name}
                              </p>
                              <span className="text-[10px] text-muted-foreground">
                                {letter.timeAgo}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {letter.preview}
                            </p>
                            {letter.tag && (
                              <Badge
                                variant="secondary"
                                className="mt-1 bg-primary/10 text-[10px] text-primary"
                              >
                                {letter.tag}
                              </Badge>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    아직 작성한 기록이 없습니다.
                  </p>
                )}
              </section>
            </TabsContent>

            <TabsContent value="sent" className="space-y-3">
              {lettersList.length > 0 ? (
                lettersList.map((letter) => (
                  <Card key={letter.id} className="shadow-sm">
                    <CardContent className="flex items-center gap-4 p-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-secondary text-primary">
                          {letter.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-sm font-bold">To: {letter.name}</p>
                        <p className="text-xs text-muted-foreground">{letter.preview}</p>
                        {letter.tag && (
                          <Badge variant="secondary" className="mt-1 bg-primary/10 text-[10px] text-primary">
                            {letter.tag}
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{letter.timeAgo}</span>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  보낸 기록이 없습니다.
                </p>
              )}
            </TabsContent>

            <TabsContent value="received" className="space-y-3">
              <p className="py-8 text-center text-sm text-muted-foreground">
                받은 기록이 없습니다.
              </p>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
