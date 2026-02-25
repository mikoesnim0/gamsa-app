"use client";

import { useState } from "react";
import { ArrowLeft, Eye, CreditCard } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

// 임시 데이터: 대상에게 쓴 감사 기록 미리보기
const mockTarget = { name: "엄마", daysTracked: 127, entryCount: 85 };
const mockEntries = [
  { date: "2026.02.24", content: "오늘도 맛있는 밥 해주셔서 감사해요." },
  { date: "2026.02.22", content: "아플 때 걱정해주셔서 고마워요." },
  { date: "2026.02.18", content: "항상 응원해주셔서 감사합니다." },
  { date: "2026.02.15", content: "주말에 같이 산책해서 좋았어요." },
];

export default function CreateGratitudePagePage() {
  const router = useRouter();
  const [letter, setLetter] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  function handlePurchase() {
    // TODO: 결제 연동
    router.push("/gratitude-page/preview-123");
  }

  if (showPreview) {
    return (
      <div className="flex min-h-screen flex-col bg-secondary">
        {/* Preview Header */}
        <header className="sticky top-0 z-10 flex items-center gap-4 bg-secondary/80 px-4 py-4 backdrop-blur-md">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setShowPreview(false)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">미리보기</h1>
        </header>

        <div className="mx-auto w-full max-w-md space-y-4 px-6 pb-8">
          <div className="text-center">
            <p className="font-serif text-lg font-bold italic text-primary">
              감사노트
            </p>
            <h2 className="mt-4 font-serif text-xl font-bold">
              {mockTarget.name}님에게 보내는 감사
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              지난 {mockTarget.daysTracked}일간의 마음
            </p>
          </div>

          <Separator className="my-6" />

          {mockEntries.map((entry) => (
            <Card key={entry.date} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <p className="text-[10px] font-medium text-primary">
                  {entry.date}
                </p>
                <p className="mt-1 font-serif text-sm leading-relaxed">
                  &ldquo;{entry.content}&rdquo;
                </p>
              </CardContent>
            </Card>
          ))}

          {letter && (
            <>
              <Separator className="my-6" />
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                    직접 쓴 편지
                  </p>
                  <p className="mt-2 font-serif text-sm leading-relaxed">
                    {letter}
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          <p className="pt-4 text-center font-serif text-sm italic text-muted-foreground">
            이 마음을 모으는 데 {mockTarget.daysTracked}일이 걸렸습니다.
          </p>
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
        <h1 className="text-lg font-bold">감사 페이지 만들기</h1>
      </header>

      <div className="space-y-6 px-6 pb-32">
        {/* Target Info */}
        <Card className="border-primary/20 bg-secondary/50">
          <CardContent className="flex items-center gap-4 p-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-primary/20 text-lg text-primary">
                {mockTarget.name[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold">{mockTarget.name}</p>
              <p className="text-sm text-muted-foreground">
                {mockTarget.daysTracked}일간 {mockTarget.entryCount}개의 감사
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Entry Preview */}
        <section>
          <Label className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            포함될 감사 기록 ({mockEntries.length}개 중 공개 설정된 것)
          </Label>
          <div className="space-y-2">
            {mockEntries.slice(0, 3).map((entry) => (
              <div
                key={entry.date}
                className="rounded-xl bg-muted/50 p-3 text-sm"
              >
                <span className="text-[10px] text-primary">{entry.date}</span>
                <p className="text-muted-foreground">{entry.content}</p>
              </div>
            ))}
            {mockEntries.length > 3 && (
              <p className="text-center text-xs text-muted-foreground">
                +{mockEntries.length - 3}개 더...
              </p>
            )}
          </div>
        </section>

        {/* Letter */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              추가 편지 (선택)
            </Label>
            <span className="text-xs text-muted-foreground">
              {letter.length} / 1000
            </span>
          </div>
          <Textarea
            placeholder="마음을 담은 편지를 덧붙여보세요..."
            maxLength={1000}
            rows={5}
            value={letter}
            onChange={(e) => setLetter(e.target.value)}
            className="resize-none rounded-xl"
          />
        </section>

        {/* Price Info */}
        <Card className="border-0 bg-secondary shadow-none">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              감사 페이지 제작비
            </p>
            <p className="mt-1 text-3xl font-bold text-primary">990원</p>
            <p className="mt-1 text-xs text-muted-foreground">
              카카오톡으로 링크가 전송됩니다. 본인 인증 후 열람 가능.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background px-6 py-4 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-md gap-3">
          <Button
            variant="outline"
            className="h-14 flex-1 rounded-2xl"
            onClick={() => setShowPreview(true)}
          >
            <Eye className="mr-2 h-5 w-5" /> 미리보기
          </Button>
          <Button
            className="h-14 flex-1 rounded-2xl bg-primary text-base font-bold text-primary-foreground shadow-lg shadow-primary/40"
            onClick={handlePurchase}
          >
            <CreditCard className="mr-2 h-5 w-5" /> 990원 결제
          </Button>
        </div>
      </div>
    </div>
  );
}
