"use client";

import { useState } from "react";
import { ArrowLeft, Plus, Phone, MessageCircle, User, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export default function TargetRegistrationPage() {
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [kakaoId, setKakaoId] = useState("");
  const [method, setMethod] = useState<"phone" | "kakao" | "name">("phone");
  const [saving, setSaving] = useState(false);

  async function handleRegister() {
    if (!firebaseUser || !name.trim()) return;
    setSaving(true);
    try {
      await api.targets.createTarget(firebaseUser.uid, {
        name: name.trim(),
        phone: method === "phone" && phone.trim() ? phone.trim() : null,
        kakaoId: method === "kakao" && kakaoId.trim() ? kakaoId.trim() : null,
      });
      toast.success("감사 대상이 등록되었습니다.");
      router.back();
    } catch (err) {
      toast.error("등록에 실패했습니다.");
      console.error(err);
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="screen-safe-top sticky top-0 z-10 flex items-center gap-4 bg-background/80 px-4 py-4 backdrop-blur-md">
        <Link href="/write">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold">감사 대상 등록</h1>
      </header>

      <div className="space-y-6 px-6 pb-8">
        <p className="text-sm text-muted-foreground">
          감사한 사람을 등록하면, 감사가 차곡차곡 쌓여요.
        </p>

        {/* Name (always required) */}
        <section>
          <Label className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            이름 (필수)
          </Label>
          <Input
            placeholder="감사한 분의 이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl"
          />
        </section>

        {/* Connection Method */}
        <section>
          <Label className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            연결 방법 (선택)
          </Label>
          <Tabs
            value={method}
            onValueChange={(v) => setMethod(v as typeof method)}
          >
            <TabsList className="w-full">
              <TabsTrigger value="phone" className="flex-1 gap-1">
                <Phone className="h-3 w-3" /> 전화번호
              </TabsTrigger>
              <TabsTrigger value="kakao" className="flex-1 gap-1">
                <MessageCircle className="h-3 w-3" /> 카카오톡
              </TabsTrigger>
              <TabsTrigger value="name" className="flex-1 gap-1">
                <User className="h-3 w-3" /> 이름만
              </TabsTrigger>
            </TabsList>

            <TabsContent value="phone" className="mt-4">
              <Input
                type="tel"
                placeholder="010-1234-5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-xl"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                전화번호는 암호화(SHA-256) 처리되어 저장됩니다.
                상대방이 앱에 가입하면 자동으로 연결돼요.
              </p>
            </TabsContent>

            <TabsContent value="kakao" className="mt-4">
              <Input
                placeholder="카카오톡 ID"
                value={kakaoId}
                onChange={(e) => setKakaoId(e.target.value)}
                className="rounded-xl"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                향후 카카오톡 연동 시 자동으로 매칭됩니다.
              </p>
            </TabsContent>

            <TabsContent value="name" className="mt-4">
              <Card className="border-0 bg-secondary/50 shadow-none">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    이름만으로도 등록 가능해요! 나중에 전화번호를 추가하면
                    상대방이 가입했을 때 자동 연결됩니다.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>

        {/* Register Button */}
        <Button
          className="h-14 w-full rounded-2xl bg-primary text-base font-bold text-primary-foreground shadow-lg shadow-primary/40"
          disabled={!name.trim() || saving}
          onClick={handleRegister}
        >
          {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Plus className="mr-2 h-5 w-5" />}
          대상 등록하기
        </Button>
      </div>
    </div>
  );
}
