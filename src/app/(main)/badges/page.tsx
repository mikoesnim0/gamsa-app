"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Lock, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n-context";
import {
  BADGE_CATEGORY_ORDER,
  getBadgesByCategory,
  getBadgeIcon,
  BADGE_DEFINITIONS,
} from "@/lib/badges/definitions";
import { getProgressForBadge } from "@/lib/api/badges";
import type { BadgeProgress } from "@/lib/api/badges";
import type { Badge, BadgeType } from "@/types";

export default function BadgesPage() {
  const { firebaseUser } = useAuth();
  const { t } = useI18n();
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [progress, setProgress] = useState<BadgeProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    Promise.all([
      api.badges.getEarnedBadges(uid),
      api.badges.computeBadgeProgress(uid),
    ])
      .then(([badges, prog]) => {
        setEarnedBadges(badges);
        setProgress(prog);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [firebaseUser]);

  const earnedTypes = new Set(earnedBadges.map((b) => b.type));
  const earnedCount = earnedTypes.size;
  const totalCount = BADGE_DEFINITIONS.length;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="screen-safe-top sticky top-0 z-10 flex items-center gap-4 bg-background/80 px-4 py-4 backdrop-blur-md">
        <Link href="/home">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold">{t("badge_page_title")}</h1>
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
              {t("badge_earned_count", { earned: earnedCount, total: totalCount })}
            </p>
          </div>

          {/* Category Sections */}
          {BADGE_CATEGORY_ORDER.map((cat) => {
            const badges = getBadgesByCategory(cat.category);
            if (badges.length === 0) return null;

            return (
              <section key={cat.category}>
                <h2 className="mb-3 text-[13px] font-bold uppercase tracking-widest text-[#7587a1]">
                  {t(cat.nameKey)}
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {badges.map((def) => {
                    const earned = earnedTypes.has(def.type);
                    const BadgeIcon = getBadgeIcon(def.iconName);
                    const currentProgress = progress
                      ? getProgressForBadge(def.type as BadgeType, progress)
                      : 0;
                    const target = def.target;
                    const pct = target && target > 0
                      ? Math.min(100, Math.round((currentProgress / target) * 100))
                      : 0;

                    return (
                      <Link
                        key={def.type}
                        href={earned ? `/badges/${def.type}` : "#"}
                        className={cn(!earned && "pointer-events-none")}
                      >
                        <Card
                          className={cn(
                            "transition-all hover:shadow-md",
                            earned
                              ? "border-primary/20 bg-secondary/50"
                              : "opacity-50"
                          )}
                        >
                          <CardContent className="flex flex-col items-center gap-2.5 py-5">
                            <div
                              className={cn(
                                "flex h-14 w-14 items-center justify-center rounded-2xl",
                                earned ? "bg-primary/20" : "bg-muted"
                              )}
                            >
                              {earned ? (
                                <BadgeIcon className="h-7 w-7 text-primary" />
                              ) : (
                                <Lock className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-bold">{t(def.nameKey)}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {t(def.descKey)}
                              </p>
                            </div>
                            {earned && (
                              <p className="text-[10px] font-medium text-primary">
                                {t("badge_achieved")}
                              </p>
                            )}
                            {!earned && target !== null && (
                              <div className="w-full space-y-1">
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                  <div
                                    className="h-full rounded-full bg-primary/40"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <p className="text-center text-[10px] text-muted-foreground">
                                  {t("badge_progress", { current: currentProgress, target })}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
