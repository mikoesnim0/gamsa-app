"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Share2, Download, MoreHorizontal, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge as BadgeTag } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n-context";
import { getBadgeDefinition, getBadgeIcon } from "@/lib/badges/definitions";
import type { BadgeDetailData } from "@/lib/api/badges";
import type { BadgeType } from "@/types";

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

export default function BadgeDetailPage() {
  const { firebaseUser } = useAuth();
  const { t } = useI18n();
  const params = useParams();
  const id = params.id as string;
  const def = getBadgeDefinition(id);

  const [detailData, setDetailData] = useState<BadgeDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser || !def) {
      setLoading(false);
      return;
    }
    api.badges
      .getBadgeDetailData(firebaseUser.uid, def.type as BadgeType)
      .then(setDetailData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [firebaseUser, def]);

  function handleShare() {
    if (!def) return;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: `${t("common_brand")} — ${t(def.nameKey)}`,
        text: t(def.descKey),
        url: window.location.href,
      }).catch(() => {});
    } else {
      toast.success(t("entry_detail_toast_share_copied"));
    }
  }

  function handleDownloadPdf() {
    toast.info(t("badge_detail_pdf_soon"));
  }

  if (!def) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{t("badge_detail_not_found")}</p>
        <Link href="/badges">
          <Button variant="outline" className="rounded-xl">
            {t("badge_detail_back")}
          </Button>
        </Link>
      </div>
    );
  }

  const BadgeIcon = getBadgeIcon(def.iconName);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background/80 px-4 py-4 backdrop-blur-md">
        <Link href="/badges">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
          </Button>
        </Link>
        <h1 className="text-lg font-bold">{t("badge_detail_title")}</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <MoreHorizontal className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" strokeWidth={1.5} /> {t("badge_detail_share_sns")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownloadPdf}>
              <Download className="mr-2 h-4 w-4" strokeWidth={1.5} /> {t("badge_detail_save_pdf")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="space-y-6 px-4 pb-8">
        {/* Certificate */}
        <Card className="border-primary/20 bg-secondary">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <BadgeIcon className="h-16 w-16 text-primary" strokeWidth={1.5} />
            <div className="text-center">
              <h2 className="font-serif text-2xl font-bold">{t(def.nameKey)}</h2>
              <p className="mt-1 font-serif text-sm italic text-muted-foreground">
                {t(def.descKey)}
              </p>
            </div>
            {detailData?.earnedDate && (
              <div className="mt-2 rounded-full bg-primary/20 px-4 py-1">
                <p className="text-xs font-bold text-primary">
                  {t("badge_detail_earned_date", { date: detailData.earnedDate })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 3 Targets */}
        {detailData && detailData.topTargets.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                {t("badge_detail_top_targets")}
              </h3>
              <div className="space-y-3">
                {detailData.topTargets.map((target, i) => (
                  <div key={target.targetId} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="flex-1 font-medium">{target.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {target.count}{t("badge_count_suffix")}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Emotion Stats */}
        {detailData && detailData.emotionStats.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
                {t("badge_detail_emotion_stats")}
              </h3>
              <div className="flex flex-wrap justify-center gap-2">
                {detailData.emotionStats.map((stat, i) => (
                  <BadgeTag
                    key={stat.emotion}
                    variant="secondary"
                    className="rounded-full bg-primary/10 px-4 py-2 text-primary"
                    style={{ fontSize: `${Math.max(14 - i * 1.5, 10)}px` }}
                  >
                    #{t(EMOTION_KEYS[stat.emotion] ?? stat.emotion)}
                  </BadgeTag>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
