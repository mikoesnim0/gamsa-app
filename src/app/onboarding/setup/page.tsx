"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronUp, ChevronDown, Loader2, X, User } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = new window.Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return canvas.toDataURL("image/jpeg", 0.9);
}

export default function OnboardingSetupPage() {
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const [name, setName] = useState("");
  const [hour, setHour] = useState(21);
  const [minute, setMinute] = useState(0);
  const [saving, setSaving] = useState(false);

  // Photo
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Crop
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleCropConfirm() {
    if (!cropSrc || !croppedAreaPixels) return;
    try {
      const cropped = await getCroppedImg(cropSrc, croppedAreaPixels);
      setAvatarPreview(cropped);
    } catch {
      toast.error("사진 편집에 실패했습니다.");
    }
    setCropOpen(false);
    setCropSrc(null);
  }

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
        let profileImg: string | undefined;
        if (avatarPreview && avatarPreview.startsWith("data:")) {
          console.log("[onboarding] uploading profile image...");
          try {
            profileImg = await api.auth.uploadProfileImage(firebaseUser.uid, avatarPreview);
            console.log("[onboarding] image uploaded:", profileImg);
          } catch (uploadErr) {
            console.warn("[onboarding] image upload failed, skipping", uploadErr);
          }
        }
        await api.auth.updateUserProfile(firebaseUser.uid, { name: name.trim(), ...(profileImg ? { profileImg } : {}) });
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
    <>
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
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-primary bg-secondary"
              >
                {avatarPreview ? (
                  <Image src={avatarPreview} alt="avatar" width={96} height={96} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-primary/60" />
                )}
                <span className="absolute bottom-1 right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary text-white text-xs">+</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="ghost"
                className="text-sm font-medium text-primary"
                onClick={() => fileInputRef.current?.click()}
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

    {/* Crop Modal */}
    {cropOpen && cropSrc && (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 px-4">
        <div className="w-full max-w-[360px] rounded-[22px] bg-card p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold">사진 편집</h3>
            <button type="button" onClick={() => { setCropOpen(false); setCropSrc(null); }}>
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
          <div className="relative mx-auto h-64 w-full overflow-hidden rounded-xl bg-black">
            <Cropper
              image={cropSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs text-muted-foreground">작게</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-1 flex-1 appearance-none rounded-full bg-secondary accent-primary"
            />
            <span className="text-xs text-muted-foreground">크게</span>
          </div>
          <button
            type="button"
            onClick={handleCropConfirm}
            className="mt-3 w-full rounded-full bg-primary py-3 text-base font-bold text-primary-foreground"
          >
            확인
          </button>
        </div>
      </div>
    )}
    </>
  );
}
