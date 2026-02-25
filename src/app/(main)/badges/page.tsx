"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Lock, Sprout, Leaf, TreePine, Mountain, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

interface BadgeInfo {
  id: string;
  type: string;
  title: string;
  description: string;
  icon: LucideIcon;
  earned: boolean;
  progress?: number;
  target?: number;
}

const BADGE_DEFINITIONS: {
  id: string;
  type: string;
  title: string;
  description: string;
  icon: LucideIcon;
  target: number;
}[] = [
  { id: "7d", type: "7d", title: "일주일의 시작", description: "7일 연속 감사 기록", icon: Sprout, target: 7 },
  { id: "30d", type: "30d", title: "한 달의 습관", description: "30일 연속 감사 기록", icon: Leaf, target: 30 },
  { id: "100d", type: "100d", title: "백일의 감사", description: "100일 연속 감사 기록", icon: TreePine, target: 100 },
  { id: "365d", type: "365d", title: "감사의 사계절", description: "365일 연속 감사 기록", icon: Mountain, target: 365 },
];

export default function BadgesPage() {
  const { firebaseUser } = useAuth();
  const [currentStreak, setCurrentStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    api.streak
      .getStreak(firebaseUser.uid)
      .then((s) => setCurrentStreak(s.currentStreak))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [firebaseUser]);

  const badges: BadgeInfo[] = BADGE_DEFINITIONS.map((def) => ({
    ...def,
    earned: currentStreak >= def.target,
    progress: currentStreak,
  }));

  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-4 bg-background/80 px-4 py-4 backdrop-blur-md">
        <Link href="/home">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold">감사패 모음</h1>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6 px-4 pb-8">
          {/* Summary */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              획득한 감사패{" "}
              <span className="font-bold text-primary">{earnedCount}</span> /{" "}
              {badges.length}
            </p>
          </div>

          {/* Badge Grid */}
          <div className="grid grid-cols-2 gap-4">
            {badges.map((badge) => {
              const BadgeIcon = badge.icon;
              return (
                <Link
                  key={badge.id}
                  href={badge.earned ? `/badges/${badge.id}` : "#"}
                >
                  <Card
                    className={cn(
                      "transition-all hover:shadow-md",
                      badge.earned
                        ? "border-primary/20 bg-secondary/50"
                        : "opacity-50"
                    )}
                  >
                    <CardContent className="flex flex-col items-center gap-3 py-6">
                      <div
                        className={cn(
                          "flex h-16 w-16 items-center justify-center rounded-2xl",
                          badge.earned
                            ? "bg-primary/20"
                            : "bg-muted"
                        )}
                      >
                        {badge.earned ? (
                          <BadgeIcon className="h-8 w-8 text-primary" />
                        ) : (
                          <Lock className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold">{badge.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {badge.description}
                        </p>
                      </div>
                      {badge.earned && (
                        <p className="text-[10px] font-medium text-primary">
                          달성!
                        </p>
                      )}
                      {!badge.earned && badge.progress !== undefined && (
                        <div className="w-full space-y-1">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary/40"
                              style={{
                                width: `${(badge.progress / (badge.target ?? 1)) * 100}%`,
                              }}
                            />
                          </div>
                          <p className="text-center text-[10px] text-muted-foreground">
                            {badge.progress} / {badge.target}일
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
