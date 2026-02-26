"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Heart, Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n-context";

type AuthStep = "idle" | "phone" | "code";

export default function WelcomePage() {
  const router = useRouter();
  const { firebaseUser, isNewUser, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [step, setStep] = useState<AuthStep>("idle");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

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
      toast.error(t("welcome_error_no_phone"));
      return;
    }
    setSending(true);
    try {
      const formatted = formatPhoneForFirebase(phone);
      await api.auth.sendVerificationCode(formatted, "recaptcha-container");
      setStep("code");
      toast.success(t("welcome_toast_code_sent"));
    } catch (err: unknown) {
      const errCode = (err as { code?: string }).code;
      if (errCode === "auth/too-many-requests") {
        toast.error(t("welcome_error_too_many"));
      } else if (errCode === "auth/invalid-phone-number") {
        toast.error(t("welcome_error_invalid_phone"));
      } else if (errCode === "auth/captcha-check-failed") {
        toast.error(t("welcome_error_captcha"));
      } else {
        toast.error(t("welcome_error_send_failed"));
      }
      console.error("sendVerificationCode error:", errCode, err);
    } finally {
      setSending(false);
    }
  }

  async function handleVerifyCode() {
    if (!code.trim()) {
      toast.error(t("welcome_error_no_code"));
      return;
    }
    setVerifying(true);
    try {
      await api.auth.verifyCode(code);
    } catch (err) {
      toast.error(t("welcome_error_invalid_code"));
      console.error(err);
      setVerifying(false);
    }
  }

  const [socialLoading, setSocialLoading] = useState<"kakao" | "apple" | null>(null);

  async function handleKakaoLogin() {
    setSocialLoading("kakao");
    try {
      await api.auth.signInWithKakao();
    } catch (err) {
      console.error("Kakao login error:", err);
      toast.error(t("welcome_error_social_login"));
    } finally {
      setSocialLoading(null);
    }
  }

  async function handleAppleLogin() {
    setSocialLoading("apple");
    try {
      await api.auth.signInWithApple();
    } catch (err) {
      console.error("Apple login error:", err);
      toast.error(t("welcome_error_social_login"));
    } finally {
      setSocialLoading(null);
    }
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
        <div className="mb-10 flex flex-1 flex-col items-center justify-center gap-8">
          <div className="flex aspect-square w-full max-w-[320px] items-center justify-center overflow-hidden rounded-3xl bg-secondary shadow-sm">
            <div className="text-center">
              <div className="mb-4 flex items-center justify-center">
                <Heart className="h-16 w-16 text-primary" fill="currentColor" />
              </div>
              <p className="font-serif text-lg font-bold italic text-primary">
                {t("common_brand")}
              </p>
            </div>
          </div>

          <div className="space-y-3 text-center">
            <h1 className="font-serif text-3xl font-bold leading-tight tracking-tight text-foreground whitespace-pre-line">
              {t("welcome_headline")}
            </h1>
            <p className="text-base font-medium leading-relaxed text-muted-foreground whitespace-pre-line">
              {t("welcome_subtitle")}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 pb-8">
          {step === "idle" && (
            <>
              <Button
                className="h-14 w-full rounded-2xl bg-primary text-base font-bold text-primary-foreground shadow-lg shadow-primary/40"
                onClick={() => setStep("phone")}
              >
                <Phone className="mr-3 h-5 w-5" />
                {t("welcome_login_phone")}
              </Button>

              <Button
                className="h-14 w-full rounded-2xl bg-[#FEE500] text-[#191919] shadow-sm hover:bg-[#FDD835]"
                onClick={handleKakaoLogin}
                disabled={socialLoading !== null}
              >
                {socialLoading === "kakao" ? (
                  <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                ) : (
                  <MessageCircle className="mr-3 h-6 w-6" />
                )}
                <span className="text-base font-bold">
                  {t("welcome_login_kakao")}
                </span>
              </Button>

              <Button
                variant="outline"
                className="h-14 w-full rounded-2xl border-border bg-card shadow-sm"
                onClick={handleAppleLogin}
                disabled={socialLoading !== null}
              >
                {socialLoading === "apple" ? (
                  <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                ) : (
                  <svg className="mr-3 h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.32 2.32-1.55 4.18-3.74 4.25z"/>
                  </svg>
                )}
                <span className="text-base font-bold">{t("welcome_login_apple")}</span>
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
                {t("welcome_send_code")}
              </Button>
              <Button
                variant="ghost"
                className="w-full text-sm text-muted-foreground"
                onClick={() => setStep("idle")}
              >
                {t("common_back")}
              </Button>
            </div>
          )}

          {step === "code" && (
            <div className="space-y-3">
              <p className="text-center text-sm text-muted-foreground">
                {t("welcome_enter_code", { phone })}
              </p>
              <Input
                type="text"
                inputMode="numeric"
                placeholder={t("welcome_code_placeholder")}
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
                {t("common_confirm")}
              </Button>
              <Button
                variant="ghost"
                className="w-full text-sm text-muted-foreground"
                onClick={() => { setStep("phone"); setCode(""); }}
              >
                {t("welcome_resend_code")}
              </Button>
            </div>
          )}
        </div>

        <div id="recaptcha-container" />
      </div>
    </div>
  );
}
