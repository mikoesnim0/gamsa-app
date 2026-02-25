"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, Search, Clock, LockKeyhole, SendHorizonal, UserPlus, ImagePlus, X, Loader2, ChevronRight, Contact } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmotionIcon } from "@/components/ui/emotion-icon";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { EmotionTag, DeliveryOption, Target } from "@/types";

const CROP_VIEW_SIZE = 280;

const EMOTION_OPTIONS: { value: EmotionTag; label: string }[] = [
  { value: "gratitude", label: "고마움" },
  { value: "comfort", label: "위로" },
  { value: "respect", label: "존경" },
  { value: "love", label: "사랑" },
  { value: "warmth", label: "따뜻함" },
  { value: "joy", label: "기쁨" },
  { value: "trust", label: "신뢰" },
  { value: "hope", label: "희망" },
];

const DELIVERY_OPTIONS: { value: DeliveryOption; label: string; icon: typeof SendHorizonal; rightIcon: typeof ChevronRight }[] = [
  { value: "send_now", label: "바로 전송", icon: SendHorizonal, rightIcon: ChevronRight },
  { value: "schedule", label: "예약 전달", icon: Clock, rightIcon: Clock },
  { value: "private_vault", label: "비공개 보관", icon: LockKeyhole, rightIcon: LockKeyhole },
];

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export default function WritePage() {
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const [targets, setTargets] = useState<Target[]>([]);
  const [targetsLoading, setTargetsLoading] = useState(true);
  const [selectedEmotions, setSelectedEmotions] = useState<EmotionTag[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingTarget, setCreatingTarget] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [delivery, setDelivery] = useState<DeliveryOption>("send_now");
  const [sending, setSending] = useState(false);

  // Image crop state
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageName, setImageName] = useState<string>("");
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSource, setCropSource] = useState<string>("");
  const [cropMeta, setCropMeta] = useState<{ w: number; h: number } | null>(null);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const dragRef = useRef<{ dragging: boolean; x: number; y: number }>({ dragging: false, x: 0, y: 0 });

  // Schedule picker state
  const [schedulePickerOpen, setSchedulePickerOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [scheduleParts, setScheduleParts] = useState(() => {
    const dt = new Date();
    dt.setHours(dt.getHours() + 1, 0, 0, 0);
    return {
      year: dt.getFullYear(),
      month: dt.getMonth() + 1,
      day: dt.getDate(),
      hour: dt.getHours(),
      minute: 0,
    };
  });

  useEffect(() => {
    if (!firebaseUser) return;
    api.targets
      .getTargets(firebaseUser.uid)
      .then(setTargets)
      .catch(() => toast.error("대상 목록을 불러올 수 없습니다."))
      .finally(() => setTargetsLoading(false));
  }, [firebaseUser]);

  const filteredTargets = useMemo(() => {
    const list = searchQuery.trim()
      ? targets.filter((t) =>
          t.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
        )
      : targets;
    return list.slice(0, 3); // Max 3 suggestions
  }, [searchQuery, targets]);

  const exactMatch = targets.some(
    (t) => t.name.toLowerCase() === searchQuery.trim().toLowerCase()
  );

  async function handleInlineCreateTarget() {
    if (!firebaseUser || !searchQuery.trim()) return;
    setCreatingTarget(true);
    try {
      const newTarget = await api.targets.createTarget(firebaseUser.uid, {
        name: searchQuery.trim(),
        phone: null,
        kakaoId: null,
      });
      setTargets((prev) => [...prev, newTarget]);
      setSelectedTarget(newTarget.id);
      setSearchQuery("");
      toast.success(`"${newTarget.name}" 대상이 등록되었습니다.`);
    } catch {
      toast.error("대상 등록에 실패했습니다.");
    } finally {
      setCreatingTarget(false);
    }
  }

  async function handleImportContact() {
    try {
      if ("contacts" in navigator && (navigator as unknown as { contacts: { select: (props: string[], opts: { multiple: boolean }) => Promise<Array<{ name: string[]; tel: string[] }>> } }).contacts) {
        const contacts = await (navigator as unknown as { contacts: { select: (props: string[], opts: { multiple: boolean }) => Promise<Array<{ name: string[]; tel: string[] }>> } }).contacts.select(["name", "tel"], { multiple: false });
        if (contacts.length > 0) {
          const contact = contacts[0];
          const name = contact.name?.[0] ?? "";
          const phone = contact.tel?.[0] ?? null;
          if (name && firebaseUser) {
            setCreatingTarget(true);
            const newTarget = await api.targets.createTarget(firebaseUser.uid, {
              name,
              phone,
              kakaoId: null,
            });
            setTargets((prev) => [...prev, newTarget]);
            setSelectedTarget(newTarget.id);
            setSearchQuery("");
            toast.success(`"${name}" 연락처에서 등록되었습니다.`);
            setCreatingTarget(false);
          }
        }
      } else {
        toast.info("연락처 가져오기는 모바일 앱에서 사용할 수 있습니다.");
      }
    } catch {
      toast.error("연락처를 가져올 수 없습니다.");
      setCreatingTarget(false);
    }
  }

  function toggleEmotion(emotion: EmotionTag) {
    setSelectedEmotions((prev) =>
      prev.includes(emotion)
        ? prev.filter((e) => e !== emotion)
        : [...prev, emotion]
    );
  }

  // --- Image crop helpers ---
  const previewBaseScale = cropMeta ? Math.max(CROP_VIEW_SIZE / cropMeta.w, CROP_VIEW_SIZE / cropMeta.h) : 1;
  const previewW = cropMeta ? cropMeta.w * previewBaseScale : CROP_VIEW_SIZE;
  const previewH = cropMeta ? cropMeta.h * previewBaseScale : CROP_VIEW_SIZE;

  const getClamp = (nextZoom: number) => {
    if (!cropMeta) return { maxX: 0, maxY: 0 };
    const base = Math.max(CROP_VIEW_SIZE / cropMeta.w, CROP_VIEW_SIZE / cropMeta.h);
    const displayW = cropMeta.w * base * nextZoom;
    const displayH = cropMeta.h * base * nextZoom;
    return {
      maxX: Math.max(0, (displayW - CROP_VIEW_SIZE) / 2),
      maxY: Math.max(0, (displayH - CROP_VIEW_SIZE) / 2),
    };
  };

  const constrainOffset = (x: number, y: number, nextZoom = zoom) => {
    const lim = getClamp(nextZoom);
    return {
      x: clamp(x, -lim.maxX, lim.maxX),
      y: clamp(y, -lim.maxY, lim.maxY),
    };
  };

  const buildCroppedSquare = async (): Promise<string> => {
    if (!cropSource || !cropMeta) return "";
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = cropSource;
    });
    const outSize = 1024;
    const canvas = document.createElement("canvas");
    canvas.width = outSize;
    canvas.height = outSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    const base = Math.max(CROP_VIEW_SIZE / cropMeta.w, CROP_VIEW_SIZE / cropMeta.h);
    const scaled = base * zoom;
    const displayW = cropMeta.w * scaled;
    const displayH = cropMeta.h * scaled;
    const left = (CROP_VIEW_SIZE - displayW) / 2 + cropX;
    const top = (CROP_VIEW_SIZE - displayH) / 2 + cropY;

    const sx = clamp((0 - left) / scaled, 0, cropMeta.w);
    const sy = clamp((0 - top) / scaled, 0, cropMeta.h);
    const sw = clamp(CROP_VIEW_SIZE / scaled, 1, cropMeta.w - sx);
    const sh = clamp(CROP_VIEW_SIZE / scaled, 1, cropMeta.h - sy);

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outSize, outSize);
    return canvas.toDataURL("image/jpeg", 0.92);
  };

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) return;
      const img = new Image();
      img.onload = () => {
        setCropMeta({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
        setCropX(0);
        setCropY(0);
        setZoom(1);
        setCropSource(result);
        setImageName(file.name);
        setCropOpen(true);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
    e.currentTarget.value = "";
  }

  // --- Schedule picker helpers ---
  const yearOptions = useMemo(() => {
    const nowY = new Date().getFullYear();
    return [nowY, nowY + 1];
  }, []);

  const scheduleSummary = useMemo(() => {
    if (!scheduleAt) return "전달 날짜/시간을 선택하세요";
    const dt = new Date(scheduleAt);
    return dt.toLocaleString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [scheduleAt]);

  function openSchedulePicker() {
    const dt = scheduleAt ? new Date(scheduleAt) : new Date();
    if (!scheduleAt) dt.setHours(dt.getHours() + 1, 0, 0, 0);
    setScheduleParts({
      year: dt.getFullYear(),
      month: dt.getMonth() + 1,
      day: dt.getDate(),
      hour: dt.getHours(),
      minute: Math.floor(dt.getMinutes() / 5) * 5,
    });
    setSchedulePickerOpen(true);
  }

  function applySchedulePicker() {
    const maxDay = daysInMonth(scheduleParts.year, scheduleParts.month);
    const next = { ...scheduleParts, day: clamp(scheduleParts.day, 1, maxDay) };
    setScheduleParts(next);
    const d = new Date(next.year, next.month - 1, next.day, next.hour, next.minute);
    setScheduleAt(d.toISOString());
    setSchedulePickerOpen(false);
  }

  async function handleSend() {
    if (!firebaseUser) return;
    if (!selectedTarget) {
      toast.error("감사를 전할 대상을 선택해주세요.");
      return;
    }
    if (!message.trim()) {
      toast.error("편지 내용을 작성해주세요.");
      return;
    }
    setSending(true);
    try {
      await api.gratitude.createEntry(firebaseUser.uid, {
        content: message.trim(),
        title: title.trim() || null,
        targetId: selectedTarget,
        emotionTags: selectedEmotions,
        imageUrl: imageUrl || null,
        isPublic: delivery !== "private_vault",
      });
      await api.streak.checkAndUpdateStreak(firebaseUser.uid);
      toast.success("감사가 성공적으로 전달되었습니다!");
      router.push("/home");
    } catch (err) {
      toast.error("전송에 실패했습니다.");
      console.error(err);
      setSending(false);
    }
  }

  const selectedTargetName = selectedTarget
    ? targets.find((t) => t.id === selectedTarget)?.name
    : null;

  return (
    <div className="flex flex-col">
      {/* Header — from reference: centered serif title */}
      <header className="sticky top-0 z-10 grid grid-cols-[40px_1fr_40px] items-center bg-background/80 px-4 py-4 backdrop-blur-md">
        <Link href="/home">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
          </Button>
        </Link>
        <h1 className="text-center font-serif text-[26px] font-bold leading-none text-[#1f2a3d]">Write Letter</h1>
        <div />
      </header>

      <div className="space-y-6 px-4 pb-8">
        {/* Section: Target — "소중한 사람에게" */}
        <section className="space-y-2">
          <p className="text-[13px] font-bold tracking-wide text-[#7587a1]">소중한 사람에게</p>

          {/* Selected target display */}
          {selectedTargetName && (
            <div className="flex items-center justify-between rounded-[16px] bg-[#f3f1f2] px-3 py-2.5">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/20 text-primary">{selectedTargetName[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-serif text-[16px] font-bold leading-none">{selectedTargetName}</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedTarget(null)} className="text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Search bar — from reference: rounded-full bg-muted */}
          {!selectedTarget && (
            <>
              <div className="flex items-center gap-2 rounded-full bg-[#f3f1f2] px-4 py-3">
                <Search className="h-5 w-5 text-[#c3c9d4]" strokeWidth={1.5} />
                <input
                  placeholder="친구를 검색하세요..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border-0 bg-transparent text-[16px] text-foreground outline-none ring-0 placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                {targetsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {filteredTargets.map((target) => (
                      <button
                        key={target.id}
                        type="button"
                        onClick={() => {
                          setSelectedTarget(target.id);
                          setSearchQuery("");
                        }}
                        className="flex w-full items-center justify-between rounded-[16px] bg-[#f3f1f2] px-3 py-2.5 text-left transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/20 text-primary">{target.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-serif text-[16px] font-bold leading-none">{target.name}</p>
                          </div>
                        </div>
                        <div className={cn(
                          "h-[18px] w-[18px] rounded-full border-2",
                          selectedTarget === target.id ? "border-primary bg-primary" : "border-muted-foreground"
                        )} />
                      </button>
                    ))}

                    {searchQuery.trim() && !exactMatch && (
                      <button
                        type="button"
                        onClick={handleInlineCreateTarget}
                        disabled={creatingTarget}
                        className="flex w-full items-center gap-3 rounded-[16px] border-2 border-dashed border-primary/30 px-3 py-2.5 text-left transition-colors hover:bg-primary/5"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          {creatingTarget ? (
                            <Loader2 className="h-4 w-4 animate-spin text-primary" strokeWidth={1.5} />
                          ) : (
                            <UserPlus className="h-4 w-4 text-primary" strokeWidth={1.5} />
                          )}
                        </div>
                        <p className="text-[14px] font-semibold text-primary">
                          &quot;{searchQuery.trim()}&quot; 새로 등록하기
                        </p>
                      </button>
                    )}

                    {/* Import from contacts */}
                    <button
                      type="button"
                      onClick={handleImportContact}
                      className="flex w-full items-center gap-3 rounded-[16px] bg-muted/50 px-3 py-2.5 text-left transition-colors hover:bg-muted"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                        <Contact className="h-4 w-4 text-primary" strokeWidth={1.5} />
                      </div>
                      <p className="text-[14px] font-medium text-muted-foreground">연락처에서 가져오기</p>
                    </button>

                    {!searchQuery.trim() && filteredTargets.length === 0 && (
                      <p className="py-2 text-center text-[14px] text-muted-foreground">
                        이름을 입력하여 대상을 검색하거나 등록하세요.
                      </p>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </section>

        {/* Section: Emotion Tags — "지금 감정은 어떤가요?" */}
        <section className="space-y-2">
          <p className="text-[13px] font-bold tracking-wide text-[#7587a1]">지금 감정은 어떤가요?</p>
          <div className="flex flex-wrap gap-2">
            {EMOTION_OPTIONS.map((option) => {
              const isSelected = selectedEmotions.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleEmotion(option.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-semibold transition-colors",
                    isSelected
                      ? "bg-[#efb8c2] text-[#3b475d]"
                      : "bg-[#ede8eb] text-[#6f7f97] hover:bg-[#e5e0e3]"
                  )}
                >
                  <EmotionIcon emotion={option.value} className="h-4 w-4" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Section: Title — "편지 제목" */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold tracking-wide text-[#7587a1]">편지 제목</p>
            <span className="text-[11px] text-[#bdc4d1]">{title.length} / 40</span>
          </div>
          <input
            placeholder="감사를 전할 제목을 입력하세요..."
            maxLength={40}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-full border-0 bg-[#f3f1f2] px-4 py-3 text-[16px] text-[#5e6b7f] outline-none ring-0 placeholder:text-[#8f9cb0]"
          />
        </section>

        {/* Section: Message — "메시지" */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold tracking-wide text-[#7587a1]">메시지</p>
            <span className="text-[11px] text-[#bdc4d1]">{message.length} / 500</span>
          </div>
          <textarea
            placeholder="마음을 담아 메시지를 작성해보세요..."
            maxLength={500}
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[170px] w-full resize-none rounded-[34px] border-0 bg-[#f3f1f2] px-4 py-3 text-[16px] text-[#5e6b7f] outline-none ring-0 placeholder:text-[#8f9cb0]"
          />
        </section>

        {/* Section: Photo — "사진 첨부" */}
        <section className="space-y-2">
          <p className="text-[13px] font-bold tracking-wide text-[#7587a1]">사진 첨부</p>
          <label className="flex cursor-pointer items-center gap-3 rounded-[22px] bg-[#f3f1f2] px-4 py-3 text-[14px] text-[#6f7f97] transition-colors hover:bg-[#ede8eb]">
            <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
            <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
            {imageName ? `선택됨: ${imageName}` : "이미지 선택"}
          </label>
          {imageUrl && (
            <div className="relative mt-2 overflow-hidden rounded-[20px] bg-muted">
              <img src={imageUrl} alt="Preview" className="aspect-square w-full object-cover" />
              <button
                type="button"
                onClick={() => { setImageUrl(""); setImageName(""); }}
                className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>

        {/* Section: Delivery — "전달 방법" */}
        <section className="space-y-2">
          <p className="text-[13px] font-bold tracking-wide text-[#7587a1]">전달 방법</p>
          <div className="space-y-2">
            {DELIVERY_OPTIONS.map((option) => {
              const isSelected = delivery === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDelivery(option.value)}
                  className="flex w-full items-center justify-between rounded-full bg-[#f3f1f2] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "flex h-[18px] w-[18px] items-center justify-center rounded-full border-2",
                      isSelected ? "border-[#efb8c2]" : "border-[#d2d8e2]"
                    )}>
                      {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-[#efb8c2]" />}
                    </span>
                    <span className="font-serif text-[18px] font-semibold text-[#364255]">{option.label}</span>
                  </div>
                  <option.rightIcon className={cn("h-5 w-5", isSelected ? "text-[#efb8c2]" : "text-[#93a3bb]")} strokeWidth={1.5} />
                </button>
              );
            })}
          </div>
        </section>

        {/* Schedule Picker Button */}
        {delivery === "schedule" && (
          <section>
            <button
              type="button"
              onClick={openSchedulePicker}
              className="flex w-full items-center justify-between rounded-full bg-[#f3f1f2] px-4 py-3 text-left"
            >
              <span className={cn("text-[14px]", scheduleAt ? "text-foreground" : "text-muted-foreground")}>
                {scheduleSummary}
              </span>
              <Clock className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
            </button>
          </section>
        )}

        {/* Send Button — inline, scrolls with content, from reference style */}
        <section className="pb-[calc(80px+env(safe-area-inset-bottom))]">
          <button
            className="mt-2 w-full rounded-full bg-[#efb8c2] py-3 font-serif text-[22px] font-bold text-[#1f2a3d] active:scale-[0.98] transition-transform disabled:opacity-50"
            onClick={handleSend}
            disabled={sending}
          >
            {sending && <Loader2 className="mr-2 inline h-5 w-5 animate-spin" strokeWidth={1.5} />}
            감사 전하기
          </button>
        </section>
      </div>

      {/* Crop Modal */}
      {cropOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
          <div className="w-full max-w-[380px] rounded-[24px] bg-card p-4">
            <h3 className="mb-3 text-center font-serif text-lg font-bold">사진 자르기</h3>
            <div
              className="relative mx-auto overflow-hidden rounded-[16px] bg-muted"
              style={{ width: CROP_VIEW_SIZE, height: CROP_VIEW_SIZE, touchAction: "none" }}
              onPointerDown={(e) => {
                dragRef.current = { dragging: true, x: e.clientX, y: e.clientY };
              }}
              onPointerMove={(e) => {
                if (!dragRef.current.dragging) return;
                const dx = e.clientX - dragRef.current.x;
                const dy = e.clientY - dragRef.current.y;
                dragRef.current = { dragging: true, x: e.clientX, y: e.clientY };
                const next = constrainOffset(cropX + dx, cropY + dy);
                setCropX(next.x);
                setCropY(next.y);
              }}
              onPointerUp={() => { dragRef.current.dragging = false; }}
              onPointerCancel={() => { dragRef.current.dragging = false; }}
              onPointerLeave={() => { dragRef.current.dragging = false; }}
            >
              {cropSource && (
                <img
                  src={cropSource}
                  alt="Crop source"
                  draggable={false}
                  className="pointer-events-none absolute left-1/2 top-1/2 select-none"
                  style={{
                    width: previewW,
                    height: previewH,
                    maxWidth: "none",
                    transform: `translate(calc(-50% + ${cropX}px), calc(-50% + ${cropY}px)) scale(${zoom})`,
                    transformOrigin: "center center",
                  }}
                />
              )}
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">확대/축소</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => {
                  const nextZoom = Number(e.target.value);
                  const next = constrainOffset(cropX, cropY, nextZoom);
                  setZoom(nextZoom);
                  setCropX(next.x);
                  setCropY(next.y);
                }}
                className="w-full accent-primary"
              />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCropOpen(false);
                  setCropSource("");
                  setCropMeta(null);
                  setZoom(1);
                  setCropX(0);
                  setCropY(0);
                }}
              >
                취소
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setZoom(1);
                  setCropX(0);
                  setCropY(0);
                }}
              >
                초기화
              </Button>
              <Button
                onClick={async () => {
                  const cropped = await buildCroppedSquare();
                  if (cropped) setImageUrl(cropped);
                  setCropOpen(false);
                }}
              >
                적용
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Picker Bottom Sheet */}
      {schedulePickerOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/35">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="닫기"
            onClick={() => setSchedulePickerOpen(false)}
          />
          <div className="relative mx-auto w-full max-w-md rounded-t-[28px] bg-card px-5 pb-6 pt-4">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />
            <h3 className="mb-4 text-center font-serif text-lg font-bold">전달 날짜/시간 선택</h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Year */}
              <div className="rounded-[14px] bg-muted p-3">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">연도</p>
                <div className="max-h-32 space-y-1 overflow-auto">
                  {yearOptions.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() =>
                        setScheduleParts((prev) => {
                          const maxDay = daysInMonth(y, prev.month);
                          return { ...prev, year: y, day: Math.min(prev.day, maxDay) };
                        })
                      }
                      className={cn(
                        "w-full rounded-[14px] px-2 py-1.5 text-left text-sm",
                        scheduleParts.year === y ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      )}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              {/* Month */}
              <div className="rounded-[14px] bg-muted p-3">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">월</p>
                <div className="max-h-32 space-y-1 overflow-auto">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() =>
                        setScheduleParts((prev) => {
                          const maxDay = daysInMonth(prev.year, m);
                          return { ...prev, month: m, day: Math.min(prev.day, maxDay) };
                        })
                      }
                      className={cn(
                        "w-full rounded-[14px] px-2 py-1.5 text-left text-sm",
                        scheduleParts.month === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      )}
                    >
                      {m}월
                    </button>
                  ))}
                </div>
              </div>

              {/* Day */}
              <div className="rounded-[14px] bg-muted p-3">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">일</p>
                <div className="max-h-32 space-y-1 overflow-auto">
                  {Array.from(
                    { length: daysInMonth(scheduleParts.year, scheduleParts.month) },
                    (_, i) => i + 1
                  ).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setScheduleParts((prev) => ({ ...prev, day: d }))}
                      className={cn(
                        "w-full rounded-[14px] px-2 py-1.5 text-left text-sm",
                        scheduleParts.day === d ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      )}
                    >
                      {d}일
                    </button>
                  ))}
                </div>
              </div>

              {/* Time */}
              <div className="rounded-[14px] bg-muted p-3">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">시간</p>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={scheduleParts.hour}
                    onChange={(e) => setScheduleParts((prev) => ({ ...prev, hour: Number(e.target.value) }))}
                    className="rounded-[14px] border-0 bg-card px-2 py-2 text-sm outline-none"
                  >
                    {Array.from({ length: 24 }, (_, h) => h).map((h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}시
                      </option>
                    ))}
                  </select>
                  <select
                    value={scheduleParts.minute}
                    onChange={(e) => setScheduleParts((prev) => ({ ...prev, minute: Number(e.target.value) }))}
                    className="rounded-[14px] border-0 bg-card px-2 py-2 text-sm outline-none"
                  >
                    {Array.from({ length: 60 }, (_, m) => m)
                      .filter((m) => m % 5 === 0)
                      .map((m) => (
                        <option key={m} value={m}>
                          {String(m).padStart(2, "0")}분
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="outline" className="rounded-full" onClick={() => setSchedulePickerOpen(false)}>
                취소
              </Button>
              <Button className="rounded-full" onClick={applySchedulePicker}>
                적용
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
