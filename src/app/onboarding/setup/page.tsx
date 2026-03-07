"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

export default function OnboardingSetupPage() {
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const [name, setName] = useState("");
  const [hour, setHour] = useState(21);
  const [minute, setMinute] = useState(0);
  const [saving, setSaving] = useState(false);

  function adjustTime(field: "hour" | "minute", delta: number) {
    if (field === "hour") {
      setHour((prev) => (prev + delta + 24) % 24);
    } else {
      setMinute((prev) => (prev + delta + 60) % 60);
    }
  }

  async function handleComplete() {
    console.log("[onboarding] handleComplete called", { firebaseUser: firebaseUser?.uid, name, saving });
    if (!name.trim()) {
      console.log("[onboarding] blocked: name is empty");
      return;
    }
    console.log("[onboarding] setSaving(true)");
    setSaving(true);
    try {
      if (firebaseUser) {
        console.log("[onboarding] calling updateUserProfile...");
        await Promise.race([
          api.auth.updateUserProfile(firebaseUser.uid, { name: name.trim() }),
          new Promise<void>((resolve) => setTimeout(() => { console.log("[onboarding] updateUserProfile timeout (3s)"); resolve(); }, 3000)),
        ]);
        console.log("[onboarding] updateUserProfile done");
      } else {
        console.log("[onboarding] firebaseUser is null, skipping updateUserProfile");
      }
    } catch (err) {
      console.error("[onboarding] updateUserProfile failed", err);
    }
    console.log("[onboarding] router.push /home");
    router.push("/home");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <h1 className="font-serif text-2xl font-bold">프로필 설정</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          간단한 설정만 하면 바로 시작할 수 있어요.
        </p>

        <div className="mt-8 flex-1 space-y-8">
          {/* Profile Section */}
          <section className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="bg-secondary text-3xl text-primary">
                  {name ? name[0] : "?"}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                className="text-sm font-medium text-primary"
              >
                사진 추가
              </Button>
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                이름
              </Label>
              <Input
                placeholder="이름을 입력하세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 rounded-xl"
              />
            </div>
          </section>

          {/* Notification Time Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                매일 감사 알림 시간
              </Label>
            </div>
            <Card className="border-primary/20 bg-secondary/50">
              <CardContent className="flex items-center justify-center gap-4 py-6">
                {/* Hour */}
                <div className="flex flex-col items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => adjustTime("hour", 1)}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <span className="w-16 text-center text-4xl font-bold tabular-nums">
                    {hour.toString().padStart(2, "0")}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => adjustTime("hour", -1)}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
                <span className="text-4xl font-bold text-muted-foreground">
                  :
                </span>
                {/* Minute */}
                <div className="flex flex-col items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => adjustTime("minute", 10)}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <span className="w-16 text-center text-4xl font-bold tabular-nums">
                    {minute.toString().padStart(2, "0")}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => adjustTime("minute", -10)}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            <p className="text-center text-xs text-muted-foreground">
              매일 이 시간에 &ldquo;오늘의 감사 3가지를 기록해보세요&rdquo;
              알림을 보내드려요.
            </p>
          </section>
        </div>

        {/* Complete Button */}
        <div className="pb-8 pt-6">
          <Button
            className="h-14 w-full rounded-2xl bg-primary text-base font-bold text-primary-foreground shadow-lg shadow-primary/40"
            onClick={handleComplete}
            disabled={!name.trim() || saving}
          >
            {saving && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            감사노트 시작하기
          </Button>
        </div>
      </div>
    </div>
  );
}
