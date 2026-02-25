"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Heart, Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

type AuthStep = "idle" | "phone" | "code";

export default function WelcomePage() {
  const router = useRouter();
  const { firebaseUser, isNewUser, loading: authLoading } = useAuth();
  const [step, setStep] = useState<AuthStep>("idle");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && firebaseUser) {
      router.replace(isNewUser ? "/onboarding" : "/home");
    }
  }, [authLoading, firebaseUser, isNewUser, router]);

  function formatPhoneForFirebase(raw: string): string {
    const digits = raw.replace(/\D/g, "");
    if (digits.startsWith("010")) {
      return "+82" + digits.slice(1);
    }
    return digits.startsWith("+") ? raw : "+82" + digits;
  }

  async function handleSendCode() {
    if (!phone.trim()) {
      toast.error("전화번호를 입력해주세요.");
      return;
    }
    setSending(true);
    try {
      const formatted = formatPhoneForFirebase(phone);
      await api.auth.sendVerificationCode(formatted, "recaptcha-container");
      setStep("code");
      toast.success("인증번호가 발송되었습니다.");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/too-many-requests") {
        toast.error("요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
      } else if (code === "auth/invalid-phone-number") {
        toast.error("올바른 전화번호 형식이 아닙니다.");
      } else if (code === "auth/captcha-check-failed") {
        toast.error("reCAPTCHA 검증에 실패했습니다. 페이지를 새로고침 후 다시 시도해주세요.");
      } else {
        toast.error("인증번호 발송에 실패했습니다. 번호를 확인해주세요.");
      }
      console.error("sendVerificationCode error:", code, err);
    } finally {
      setSending(false);
    }
  }

  async function handleVerifyCode() {
    if (!code.trim()) {
      toast.error("인증번호를 입력해주세요.");
      return;
    }
    setVerifying(true);
    try {
      await api.auth.verifyCode(code);
      // onAuthChange will fire → useAuth updates → useEffect above redirects
    } catch (err) {
      toast.error("인증번호가 올바르지 않습니다.");
      console.error(err);
      setVerifying(false);
    }
  }

  function handleComingSoon() {
    toast.info("이 로그인 방법은 준비 중입니다.");
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-secondary">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col justify-center bg-secondary px-6 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col">
        {/* Illustration Area */}
        <div className="mb-10 flex flex-1 flex-col items-center justify-center gap-8">
          <div className="flex aspect-square w-full max-w-[320px] items-center justify-center overflow-hidden rounded-3xl bg-secondary shadow-sm">
            <div className="text-center">
              <div className="mb-4 flex items-center justify-center">
                <Heart className="h-16 w-16 text-primary" fill="currentColor" />
              </div>
              <p className="font-serif text-lg font-bold italic text-primary">
                감사노트
              </p>
            </div>
          </div>

          <div className="space-y-3 text-center">
            <h1 className="font-serif text-3xl font-bold leading-tight tracking-tight text-foreground">
              오늘, 마음을
              <br />
              전해볼까요?
            </h1>
            <p className="text-base font-medium leading-relaxed text-muted-foreground">
              소중한 사람에게 전하는 따뜻한 한마디,
              <br />
              지금 바로 시작해보세요.
            </p>
          </div>
        </div>

        {/* Action Area */}
        <div className="flex w-full flex-col gap-3 pb-8">
          {step === "idle" && (
            <>
              {/* Phone Login - Primary */}
              <Button
                className="h-14 w-full rounded-2xl bg-primary text-base font-bold text-primary-foreground shadow-lg shadow-primary/40"
                onClick={() => setStep("phone")}
              >
                <Phone className="mr-3 h-5 w-5" />
                전화번호로 시작하기
              </Button>

              {/* Kakao Login - Coming Soon */}
              <Button
                className="h-14 w-full rounded-2xl bg-[#FEE500] text-[#191919] shadow-sm hover:bg-[#FDD835]"
                onClick={handleComingSoon}
              >
                <MessageCircle className="mr-3 h-6 w-6" />
                <span className="text-base font-bold">
                  카카오로 시작하기
                </span>
              </Button>

              {/* Apple Login - Coming Soon */}
              <Button
                variant="outline"
                className="h-14 w-full rounded-2xl border-border bg-card shadow-sm"
                onClick={handleComingSoon}
              >
                <svg className="mr-3 h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.55 4.18-3.74 4.25z"/>
                </svg>
                <span className="text-base font-bold">Apple로 계속하기</span>
              </Button>
            </>
          )}

          {step === "phone" && (
            <div className="space-y-3">
              <Input
                type="tel"
                placeholder="010-1234-5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-14 rounded-2xl text-center text-lg"
                autoFocus
              />
              <Button
                className="h-14 w-full rounded-2xl bg-primary text-base font-bold text-primary-foreground shadow-lg shadow-primary/40"
                onClick={handleSendCode}
                disabled={sending}
              >
                {sending ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Phone className="mr-2 h-5 w-5" />
                )}
                인증번호 발송
              </Button>
              <Button
                variant="ghost"
                className="w-full text-sm text-muted-foreground"
                onClick={() => setStep("idle")}
              >
                뒤로
              </Button>
            </div>
          )}

          {step === "code" && (
            <div className="space-y-3">
              <p className="text-center text-sm text-muted-foreground">
                {phone}로 발송된 인증번호를 입력하세요
              </p>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="인증번호 6자리"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-14 rounded-2xl text-center text-lg tracking-widest"
                maxLength={6}
                autoFocus
              />
              <Button
                className="h-14 w-full rounded-2xl bg-primary text-base font-bold text-primary-foreground shadow-lg shadow-primary/40"
                onClick={handleVerifyCode}
                disabled={verifying}
              >
                {verifying ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : null}
                확인
              </Button>
              <Button
                variant="ghost"
                className="w-full text-sm text-muted-foreground"
                onClick={() => { setStep("phone"); setCode(""); }}
              >
                인증번호 다시 받기
              </Button>
            </div>
          )}
        </div>

        {/* reCAPTCHA container (invisible) */}
        <div id="recaptcha-container" />
      </div>
    </div>
  );
}
