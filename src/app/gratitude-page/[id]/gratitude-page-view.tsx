"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Lock, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";

// 임시 데이터
const mockPage = {
  senderName: "지민",
  targetName: "엄마",
  daysTracked: 127,
  entries: [
    { date: "2025.11.20", content: "항상 아침밥 챙겨주셔서 감사해요." },
    { date: "2025.12.05", content: "힘들 때 안아주셔서 고마워요." },
    { date: "2025.12.25", content: "크리스마스에 케이크 사주셔서 감사합니다." },
    { date: "2026.01.01", content: "새해 첫날도 밥상 차려주셔서 감사합니다." },
    { date: "2026.01.15", content: "아플 때 약 사다주셔서 고마워요." },
    { date: "2026.02.14", content: "발렌타인에도 챙겨주셔서 감사해요." },
    { date: "2026.02.24", content: "오늘도 맛있는 밥 해주셔서 감사해요." },
  ],
  letter:
    "엄마, 항상 말은 못했지만 정말 감사해요. 이 작은 페이지에 담긴 마음들이 전해졌으면 좋겠어요. 엄마가 있어서 제가 있어요. 사랑합니다.",
};

export default function GratitudePageView() {
  const params = useParams();
  const [verified, setVerified] = useState(false);
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  function handleSendCode() {
    setCodeSent(true);
  }

  function handleVerify() {
    // TODO: 실제 인증 로직
    setVerified(true);
  }

  // 인증 전: 본인 확인 화면
  if (!verified) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-secondary px-6">
        <div className="mx-auto w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20">
              <Lock className="h-8 w-8 text-primary" strokeWidth={1.5} />
            </div>
            <h1 className="font-serif text-2xl font-bold">
              감사 페이지가 도착했어요
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              <span className="font-bold text-foreground">
                {mockPage.senderName}
              </span>
              님이 당신에게 감사 페이지를 보냈습니다.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              본인 확인 후 열람할 수 있습니다.
            </p>
          </div>

          <Card>
            <CardContent className="space-y-4 p-6">
              <div>
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  전화번호
                </Label>
                <div className="mt-2 flex gap-2">
                  <Input
                    type="tel"
                    placeholder="010-1234-5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="rounded-xl"
                  />
                  <Button
                    className="shrink-0 rounded-xl bg-primary text-primary-foreground"
                    onClick={handleSendCode}
                    disabled={!phone.trim()}
                  >
                    인증
                  </Button>
                </div>
              </div>

              {codeSent && (
                <div>
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    인증번호
                  </Label>
                  <div className="mt-2 flex gap-2">
                    <Input
                      placeholder="6자리 입력"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="rounded-xl"
                    />
                    <Button
                      className="shrink-0 rounded-xl bg-primary text-primary-foreground"
                      onClick={handleVerify}
                      disabled={verificationCode.length < 6}
                    >
                      확인
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 인증 후: 감사 페이지 열람
  return (
    <div className="min-h-screen bg-secondary">
      <div className="mx-auto w-full max-w-md px-6 py-10">
        {/* Header */}
        <div className="text-center">
          <p className="font-serif text-sm font-bold italic text-primary">
            감사노트
          </p>
          <h1 className="mt-6 font-serif text-2xl font-bold leading-tight">
            {mockPage.senderName}님이 지난{" "}
            <span className="text-primary">{mockPage.daysTracked}일</span>간
            <br />
            당신에게 보낸 감사
          </h1>
        </div>

        <Separator className="my-8" />

        {/* Entries */}
        <div className="space-y-4">
          {mockPage.entries.map((entry, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <p className="text-[10px] font-bold text-primary">
                  {entry.date}
                </p>
                <p className="mt-2 font-serif leading-relaxed">
                  &ldquo;{entry.content}&rdquo;
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Letter */}
        <Separator className="my-8" />
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <Heart className="mb-3 h-5 w-5 text-primary" strokeWidth={1.5} />
            <p className="font-serif leading-relaxed">{mockPage.letter}</p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-10 text-center">
          <p className="font-serif text-sm italic text-muted-foreground">
            이 마음을 모으는 데 {mockPage.daysTracked}일이 걸렸습니다.
          </p>
          <Separator className="my-8" />
          <p className="text-sm text-muted-foreground">
            나도 감사를 기록하고 싶다면?
          </p>
          <Button
            className="mt-4 h-14 w-full rounded-2xl bg-primary text-base font-bold text-primary-foreground shadow-lg shadow-primary/40"
            asChild
          >
            <a href="/">감사노트 시작하기</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
