"use client";

import { ArrowLeft, Share2, Download, Sprout, Leaf, MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// 임시 데이터
const badgeDetails: Record<string, {
  title: string;
  icon: LucideIcon;
  days: number;
  earnedDate: string;
  topTargets: { name: string; count: number }[];
  topTags: string[];
}> = {
  "7d": {
    title: "일주일의 시작",
    icon: Sprout,
    days: 7,
    earnedDate: "2026년 1월 15일",
    topTargets: [
      { name: "엄마", count: 5 },
      { name: "민영", count: 3 },
      { name: "준혁", count: 2 },
    ],
    topTags: ["가족", "감사", "따뜻함", "일상", "건강"],
  },
  "30d": {
    title: "한 달의 습관",
    icon: Leaf,
    days: 30,
    earnedDate: "2026년 2월 7일",
    topTargets: [
      { name: "엄마", count: 18 },
      { name: "민영", count: 12 },
      { name: "회사 팀장님", count: 8 },
    ],
    topTags: ["가족", "직장", "감사", "사랑", "존경", "따뜻함"],
  },
};

export default function BadgeDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const badge = badgeDetails[id];

  function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: `감사노트 - ${badge?.title}`,
        text: `${badge?.days}일 연속 감사 기록 달성!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      toast.success("공유 링크가 복사되었습니다!");
    }
  }

  function handleDownloadPdf() {
    toast.info("PDF 저장 기능은 준비 중입니다.");
  }

  const BadgeIcon = badge?.icon;

  if (!badge) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">감사패를 찾을 수 없습니다.</p>
        <Link href="/badges">
          <Button variant="outline" className="rounded-xl">
            감사패 목록으로
          </Button>
        </Link>
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
        <h1 className="text-lg font-bold">감사패</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <MoreHorizontal className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" strokeWidth={1.5} /> SNS 공유
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownloadPdf}>
              <Download className="mr-2 h-4 w-4" strokeWidth={1.5} /> PDF 저장
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="space-y-6 px-4 pb-8">
        {/* Certificate */}
        <Card className="border-primary/20 bg-secondary">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            {BadgeIcon && <BadgeIcon className="h-16 w-16 text-primary" strokeWidth={1.5} />}
            <div className="text-center">
              <h2 className="font-serif text-2xl font-bold">{badge.title}</h2>
              <p className="mt-1 font-serif text-sm italic text-muted-foreground">
                {badge.days}일 연속 감사 기록 달성
              </p>
            </div>
            <div className="mt-2 rounded-full bg-primary/20 px-4 py-1">
              <p className="text-xs font-bold text-primary">
                {badge.earnedDate}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Top 3 대상 */}
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              가장 많이 감사한 사람 TOP 3
            </h3>
            <div className="space-y-3">
              {badge.topTargets.map((target, i) => (
                <div
                  key={target.name}
                  className="flex items-center gap-3"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="flex-1 font-medium">{target.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {target.count}회
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Word Cloud (태그) */}
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              자주 사용한 태그
            </h3>
            <div className="flex flex-wrap justify-center gap-2">
              {badge.topTags.map((tag, i) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="rounded-full bg-primary/10 px-4 py-2 text-primary"
                  style={{ fontSize: `${Math.max(14 - i * 1.5, 10)}px` }}
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
