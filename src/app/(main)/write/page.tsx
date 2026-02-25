"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Search, Clock, Lock, Send, UserPlus, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { EmotionTag, DeliveryOption, Target } from "@/types";

const EMOTION_OPTIONS: { value: EmotionTag; label: string }[] = [
  { value: "gratitude", label: "감사" },
  { value: "comfort", label: "위로" },
  { value: "respect", label: "존경" },
  { value: "love", label: "사랑" },
  { value: "warmth", label: "따뜻함" },
];

const DELIVERY_OPTIONS: { value: DeliveryOption; label: string; icon: typeof Send }[] = [
  { value: "send_now", label: "바로 전송", icon: Send },
  { value: "schedule", label: "예약 전달", icon: Clock },
  { value: "private_vault", label: "비공개 보관", icon: Lock },
];

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

  useEffect(() => {
    if (!firebaseUser) return;
    api.targets
      .getTargets(firebaseUser.uid)
      .then(setTargets)
      .catch(() => toast.error("대상 목록을 불러올 수 없습니다."))
      .finally(() => setTargetsLoading(false));
  }, [firebaseUser]);

  const filteredTargets = searchQuery.trim()
    ? targets.filter((t) =>
        t.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : targets;

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

  function toggleEmotion(emotion: EmotionTag) {
    setSelectedEmotions((prev) =>
      prev.includes(emotion)
        ? prev.filter((e) => e !== emotion)
        : [...prev, emotion]
    );
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

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-4 bg-background/80 px-4 py-4 backdrop-blur-md">
        <Link href="/home">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="flex-1 text-lg font-bold">감사 편지 쓰기</h1>
      </header>

      <div className="space-y-6 px-6 pb-32">
        {/* To Someone Special */}
        <section>
          <Label className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            소중한 사람에게
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="이름을 입력하세요..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl pl-10"
            />
          </div>
          <div className="mt-3 space-y-2">
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
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors",
                      selectedTarget === target.id
                        ? "bg-primary/10 ring-1 ring-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-secondary text-primary">
                        {target.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{target.name}</p>
                    </div>
                    {selectedTarget === target.id && (
                      <div className="h-3 w-3 rounded-full bg-primary" />
                    )}
                  </button>
                ))}

                {/* 검색어가 있고 정확히 같은 이름이 없으면 새 대상 등록 버튼 표시 */}
                {searchQuery.trim() && !exactMatch && (
                  <button
                    type="button"
                    onClick={handleInlineCreateTarget}
                    disabled={creatingTarget}
                    className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-primary/30 p-2 text-left transition-colors hover:bg-primary/10"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      {creatingTarget ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <UserPlus className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-primary">
                      &quot;{searchQuery.trim()}&quot; 새로 등록하기
                    </p>
                  </button>
                )}

                {/* 검색어 없고 대상도 없을 때 안내 */}
                {!searchQuery.trim() && filteredTargets.length === 0 && (
                  <p className="py-2 text-center text-sm text-muted-foreground">
                    이름을 입력하여 대상을 검색하거나 등록하세요.
                  </p>
                )}
              </>
            )}
          </div>
        </section>

        {/* Emotion Tags */}
        <section>
          <Label className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            어떤 마음인가요?
          </Label>
          <div className="flex flex-wrap gap-2">
            {EMOTION_OPTIONS.map((option) => {
              const isSelected = selectedEmotions.includes(option.value);
              return (
                <Badge
                  key={option.value}
                  variant={isSelected ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer rounded-full px-4 py-2 text-sm transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "hover:bg-primary/10"
                  )}
                  onClick={() => toggleEmotion(option.value)}
                >
                  {option.label}
                </Badge>
              );
            })}
          </div>
        </section>

        {/* Letter Title */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              편지 제목
            </Label>
            <span className="text-xs text-muted-foreground">
              {title.length} / 40
            </span>
          </div>
          <Input
            placeholder="작은 감사의 메모..."
            maxLength={40}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-xl"
          />
        </section>

        {/* Message */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              편지 내용
            </Label>
            <span className="text-xs text-muted-foreground">
              {message.length} / 500
            </span>
          </div>
          <Textarea
            placeholder="감사한 마음을 적어보세요..."
            maxLength={500}
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="resize-none rounded-xl"
          />
        </section>

        {/* Delivery Options */}
        <section>
          <Label className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            전달 방법
          </Label>
          <RadioGroup
            value={delivery}
            onValueChange={(val) => setDelivery(val as DeliveryOption)}
            className="space-y-3"
          >
            {DELIVERY_OPTIONS.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-border p-4 hover:bg-muted"
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value={option.value} />
                  <span className="text-sm font-medium">{option.label}</span>
                </div>
                <option.icon className="h-5 w-5 text-muted-foreground" />
              </label>
            ))}
          </RadioGroup>
        </section>
      </div>

      {/* Sticky Send Button */}
      <div className="fixed bottom-20 left-0 right-0 z-40 px-6">
        <div className="mx-auto max-w-md">
          <Button
            className="h-14 w-full rounded-2xl bg-primary text-lg font-bold text-primary-foreground shadow-lg shadow-primary/40"
            onClick={handleSend}
            disabled={sending}
          >
            {sending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            감사 전하기
          </Button>
        </div>
      </div>
    </div>
  );
}
