"use client";

import { ArrowLeft, Share2, Download, Send, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// 임시 데이터
const mockReport = {
  year: 2025,
  totalEntries: 847,
  totalTargets: 23,
  totalDays: 312,
  monthlyData: [45, 52, 68, 72, 85, 78, 63, 70, 82, 90, 75, 67],
  topTargets: [
    { name: "엄마", count: 156 },
    { name: "민영", count: 98 },
    { name: "준혁", count: 87 },
    { name: "회사 팀장님", count: 65 },
    { name: "아빠", count: 58 },
    { name: "동생", count: 52 },
    { name: "김 선생님", count: 45 },
    { name: "카페 직원", count: 38 },
    { name: "나자신", count: 35 },
    { name: "반려견 초코", count: 28 },
  ],
  tagDistribution: [
    { tag: "가족", percent: 30 },
    { tag: "친구", percent: 25 },
    { tag: "직장", percent: 18 },
    { tag: "나자신", percent: 12 },
    { tag: "낯선사람", percent: 8 },
    { tag: "기타", percent: 7 },
  ],
};

const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

export default function AnnualReportPage() {
  const maxMonthly = Math.max(...mockReport.monthlyData);

  function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: `감사노트 - ${mockReport.year}년 결산 리포트`,
        text: `${mockReport.year}년 한 해 동안 ${mockReport.totalEntries}개의 감사를 기록했어요!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      toast.success("공유 링크가 복사되었습니다!");
    }
  }

  function handleDownloadPdf() {
    toast.info("PDF 저장 기능은 준비 중입니다.");
  }

  function handlePurchase() {
    toast.info("결제 기능은 준비 중입니다.");
  }

  function handleSendCards() {
    toast.success("감사 카드가 전송되었습니다! (데모)");
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background/80 px-4 py-4 backdrop-blur-md">
        <Link href="/home">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold">1년 결산 리포트</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" /> 공유하기
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownloadPdf}>
              <Download className="mr-2 h-4 w-4" /> PDF 저장
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="space-y-6 px-4 pb-8">
        {/* Hero */}
        <Card className="border-0 bg-secondary shadow-none">
          <CardContent className="py-10 text-center">
            <p className="font-serif text-sm italic text-primary">감사노트</p>
            <h2 className="mt-4 font-serif text-3xl font-bold">
              {mockReport.year}년
              <br />
              나의 감사 이야기
            </h2>
            <div className="mt-6 flex justify-center gap-6">
              <div>
                <p className="text-2xl font-bold text-primary">
                  {mockReport.totalEntries}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  총 감사
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold">{mockReport.totalTargets}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  감사 대상
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold">{mockReport.totalDays}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  기록한 날
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              월별 감사 추이
            </h3>
            <div className="flex items-end gap-1.5">
              {mockReport.monthlyData.map((count, i) => {
                const isMax = count === maxMonthly;
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <span className={`text-[8px] font-bold ${isMax ? "text-primary" : "text-muted-foreground"}`}>
                      {count}
                    </span>
                    <div
                      className={`w-full rounded-t transition-all ${isMax ? "bg-primary" : "bg-primary/50"}`}
                      style={{
                        height: `${(count / maxMonthly) * 100}px`,
                      }}
                    />
                    <span className={`text-[8px] ${isMax ? "font-bold text-primary" : "text-muted-foreground"}`}>
                      {MONTHS[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* TOP 10 */}
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              가장 많이 감사한 사람 TOP 10
            </h3>
            <div className="space-y-3">
              {mockReport.topTargets.map((target, i) => (
                <div key={target.name} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-secondary text-xs font-bold text-primary">
                      {target.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm font-medium">
                    {target.name}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {target.count}회
                  </span>
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${(target.count / mockReport.topTargets[0].count) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tag Distribution */}
        <Card>
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
              태그별 분포
            </h3>
            <div className="space-y-3">
              {mockReport.tagDistribution.map((item) => (
                <div key={item.tag} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.tag}</span>
                    <span className="text-muted-foreground">
                      {item.percent}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Send Summaries */}
        <Card className="border-primary/20 bg-secondary/50">
          <CardContent className="p-5 text-center">
            <p className="text-sm font-medium">
              TOP 10 대상에게 감사 요약 카드를 전송할 수 있어요!
            </p>
            <Button
              className="mt-4 rounded-xl bg-primary text-primary-foreground"
              onClick={handleSendCards}
            >
              <Send className="mr-2 h-4 w-4" /> 감사 카드 보내기
            </Button>
          </CardContent>
        </Card>

        <Separator />

        {/* Price & Purchase */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">1년 결산 리포트</p>
          <p className="mt-1 text-3xl font-bold text-primary">4,990원</p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF 다운로드 + 감사 카드 10장 전송 포함
          </p>
        </div>

        <Button
          className="h-14 w-full rounded-2xl bg-primary text-base font-bold text-primary-foreground shadow-lg shadow-primary/40"
          onClick={handlePurchase}
        >
          4,990원 구매
        </Button>
      </div>
    </div>
  );
}
