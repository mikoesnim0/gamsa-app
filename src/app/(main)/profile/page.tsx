"use client";

import { useState, useEffect } from "react";
import {
  Pencil,
  Mail,
  Megaphone,
  Clock,
  Link2,
  Shield,
  LogOut,
  ChevronRight,
  User,
  Loader2,
  X,
  Camera,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { BlockedUser } from "@/types";

const REMINDER_TIMES = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

export default function ProfilePage() {
  const router = useRouter();
  const { firebaseUser, user, signOut } = useAuth();
  const [totalSent, setTotalSent] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [loading, setLoading] = useState(true);

  // Edit profile
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Notification settings
  const [newLetterOptIn, setNewLetterOptIn] = useState(true);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [deliveryOptIn, setDeliveryOptIn] = useState(false);
  const [dailyReminderTime, setDailyReminderTime] = useState("09:00");
  const [reminderDropdownOpen, setReminderDropdownOpen] = useState(false);

  // Block list
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [blockInput, setBlockInput] = useState("");
  const [blockLoading, setBlockLoading] = useState(false);

  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    Promise.all([
      api.gratitude.getEntries(uid),
      api.streak.getStreak(uid),
      api.auth.getNotificationSettings(uid),
    ])
      .then(([entries, streak, notifSettings]) => {
        setTotalSent(entries.length);
        setStreakDays(streak.currentStreak);
        setNewLetterOptIn(notifSettings.newLetterOptIn);
        setMarketingOptIn(notifSettings.marketingOptIn);
        setDeliveryOptIn(notifSettings.deliveryOptIn);
        setDailyReminderTime(notifSettings.dailyReminderTime);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [firebaseUser]);

  // Toggle notification settings with persistence
  async function updateNotif(key: string, value: boolean | string) {
    if (!firebaseUser) return;
    try {
      await api.auth.updateNotificationSettings(firebaseUser.uid, { [key]: value });
    } catch {
      toast.error("설정 저장에 실패했습니다.");
    }
  }

  async function handleLogout() {
    await signOut();
    toast.success("로그아웃되었습니다.");
    router.push("/");
  }

  function openEditProfile() {
    setEditName(user?.name ?? "");
    setEditBio(user?.bio ?? "");
    setEditAvatarPreview(user?.profileImg ?? null);
    setEditOpen(true);
  }

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setEditAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
    // TODO: Phase 2 — upload to Firebase Storage
  }

  async function handleSaveProfile() {
    if (!firebaseUser) return;
    setSaving(true);
    try {
      await api.auth.updateUserProfile(firebaseUser.uid, {
        name: editName.trim(),
        bio: editBio.trim() || null,
      });
      toast.success("프로필이 수정되었습니다.");
      setEditOpen(false);
      window.location.reload();
    } catch {
      toast.error("프로필 수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  // Block list
  async function openBlockList() {
    if (!firebaseUser) return;
    setBlockModalOpen(true);
    setBlockLoading(true);
    try {
      const users = await api.blocked.getBlockedUsers(firebaseUser.uid);
      setBlockedUsers(users);
    } catch {
      toast.error("차단 목록을 불러올 수 없습니다.");
    } finally {
      setBlockLoading(false);
    }
  }

  async function handleAddBlock() {
    if (!firebaseUser || !blockInput.trim()) return;
    try {
      await api.blocked.addBlockedUser(firebaseUser.uid, blockInput.trim());
      setBlockedUsers((prev) => [
        { id: blockInput.trim(), name: blockInput.trim(), createdAt: new Date() as never },
        ...prev,
      ]);
      setBlockInput("");
      toast.success("차단되었습니다.");
    } catch {
      toast.error("차단에 실패했습니다.");
    }
  }

  async function handleRemoveBlock(name: string) {
    if (!firebaseUser) return;
    try {
      await api.blocked.removeBlockedUser(firebaseUser.uid, name);
      setBlockedUsers((prev) => prev.filter((u) => u.name !== name));
      toast.success("차단이 해제되었습니다.");
    } catch {
      toast.error("차단 해제에 실패했습니다.");
    }
  }

  const displayName = user?.name || "사용자";
  const displayBio = user?.bio || "오늘도 고마움을 기록해요.";

  // Custom toggle component matching reference screenshots
  function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-10 rounded-full transition-colors",
          checked ? "bg-green-500" : "bg-slate-200"
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-4 w-4 rounded-full bg-white transition-all",
            checked ? "right-1" : "left-1"
          )}
        />
      </button>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Header — from reference: centered serif title + edit button */}
      <header className="sticky top-0 z-10 grid grid-cols-[40px_1fr_40px] items-center bg-background/80 px-4 py-4 backdrop-blur-md">
        <div />
        <h1 className="text-center font-serif text-[30px] font-bold leading-none text-[#1f2a3d]">내 프로필</h1>
        <button
          type="button"
          onClick={openEditProfile}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fef3f6]"
        >
          <Pencil className="h-4 w-4 text-[#efb8c2]" strokeWidth={1.5} />
        </button>
      </header>

      <div className="space-y-4 px-5 pb-8">
        {/* Avatar Section — from reference screenshot 003 */}
        <div className="flex flex-col items-center gap-2 py-3">
          <div className="relative">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-primary bg-secondary">
              {user?.profileImg ? (
                <Image src={user.profileImg} alt="avatar" width={112} height={112} className="h-full w-full object-cover" />
              ) : (
                <User className="h-12 w-12 text-primary/60" />
              )}
            </div>
            {/* Online dot */}
            <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-[3px] border-background bg-green-400" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-900">@{displayName}</h2>
            <p className="mt-1 italic text-slate-600">{displayBio}</p>
            <span className="mt-2 inline-flex items-center rounded-full bg-primary/30 px-3 py-1 text-xs font-medium text-slate-800">
              활동 중
            </span>
          </div>
        </div>

        {/* Stats Grid — 3 columns, exact from reference colors */}
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-[#9aa7ba]" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: totalSent, label: "보낸 감사" },
              { value: 0, label: "받은 감사" },
              { value: streakDays, label: "연속일" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center rounded-xl border border-primary/10 bg-white p-4 shadow-sm"
              >
                <span className="text-xl font-bold text-slate-900">{stat.value}</span>
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Notification Settings — from reference screenshots 003-004 */}
        <section>
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-[#9aa7ba]">알림</p>
          <div className="rounded-2xl border border-[#f1d6de] bg-gradient-to-br from-[#fffafb] to-[#fff7f9] p-2 space-y-1">
            {/* New letter */}
            <div className="flex w-full items-center justify-between rounded-xl border border-[#f6e8ec] bg-[#fffefe] px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-[#efb8c2]" strokeWidth={1.5} />
                <span className="text-sm font-medium text-[#334255]">새 편지 수신 동의</span>
              </div>
              <Toggle
                checked={newLetterOptIn}
                onChange={(v) => { setNewLetterOptIn(v); updateNotif("newLetterOptIn", v); }}
              />
            </div>

            {/* Marketing */}
            <div className="flex w-full items-center justify-between rounded-xl border border-[#f6e8ec] bg-[#fffefe] px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Megaphone className="h-5 w-5 text-[#efb8c2]" strokeWidth={1.5} />
                <span className="text-sm font-medium text-[#334255]">마케팅 수신 동의</span>
              </div>
              <Toggle
                checked={marketingOptIn}
                onChange={(v) => { setMarketingOptIn(v); updateNotif("marketingOptIn", v); }}
              />
            </div>

            {/* Delivery reminder */}
            <div className="flex w-full items-center justify-between rounded-xl border border-[#f6e8ec] bg-[#fffefe] px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-[#efb8c2]" strokeWidth={1.5} />
                <span className="text-sm font-medium text-[#334255]">전송 리마인더 동의</span>
              </div>
              <Toggle
                checked={deliveryOptIn}
                onChange={(v) => { setDeliveryOptIn(v); updateNotif("deliveryOptIn", v); }}
              />
            </div>

            {/* Daily reminder time */}
            <div className="relative">
              <button
                type="button"
                onClick={() => deliveryOptIn && setReminderDropdownOpen(!reminderDropdownOpen)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border border-[#f6e8ec] bg-[#fffefe] px-4 py-3.5",
                  !deliveryOptIn && "opacity-45 cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-[#efb8c2]" strokeWidth={1.5} />
                  <span className="text-sm font-medium text-[#334255]">매일 리마인더 시간</span>
                </div>
                <span className="rounded-full bg-[#fef3f6] px-3 py-1 text-sm text-[#7d8aa0]">{dailyReminderTime}</span>
              </button>

              {reminderDropdownOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-20"
                    onClick={() => setReminderDropdownOpen(false)}
                  />
                  <div className="absolute left-2 right-2 top-[64px] z-30 max-h-56 overflow-auto rounded-2xl border border-[#f1d6de] bg-white p-2 shadow-[0_10px_20px_rgba(66,41,49,0.15)]">
                    {REMINDER_TIMES.map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => {
                          setDailyReminderTime(time);
                          updateNotif("dailyReminderTime", time);
                          setReminderDropdownOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm",
                          dailyReminderTime === time ? "bg-[#fff3f6] text-[#2f3f57]" : "text-[#60718a]"
                        )}
                      >
                        {time}
                        {dailyReminderTime === time && (
                          <svg className="h-4 w-4 text-[#efb8c2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Security Section — from reference */}
        <section>
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-[#9aa7ba]">보안</p>
          <div className="rounded-2xl border border-[#f1d6de] bg-gradient-to-br from-[#fffafb] to-[#fff7f9] p-2 space-y-1">
            <button
              type="button"
              onClick={() => toast.info("계정 연동 기능은 준비 중입니다.")}
              className="flex w-full items-center justify-between rounded-xl border border-[#f6e8ec] bg-[#fffefe] px-4 py-3.5"
            >
              <div className="flex items-center gap-3">
                <Link2 className="h-5 w-5 text-[#efb8c2]" strokeWidth={1.5} />
                <span className="text-sm font-medium text-[#334255]">계정 연동</span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#a6b2c5]" />
            </button>

            <button
              type="button"
              onClick={openBlockList}
              className="flex w-full items-center justify-between rounded-xl border border-[#f6e8ec] bg-[#fffefe] px-4 py-3.5"
            >
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-[#efb8c2]" strokeWidth={1.5} />
                <span className="text-sm font-medium text-[#334255]">차단 목록</span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#a6b2c5]" />
            </button>

          </div>
        </section>

        {/* Logout — standalone at bottom */}
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-[#f1d6de] py-3 text-sm font-medium text-[#8d99ac] transition-colors hover:bg-[#fff3f6]"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.5} />
          로그아웃
        </button>
      </div>

      {/* Edit Profile Modal — from reference screenshot */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-[360px] rounded-[22px] bg-card p-5 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-serif text-xl font-bold">프로필 수정</h3>
              <button type="button" onClick={() => setEditOpen(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-4">
              {/* Profile Photo */}
              <div>
                <p className="mb-2 text-[13px] font-bold text-primary">프로필 사진</p>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-secondary">
                    {editAvatarPreview ? (
                      <Image src={editAvatarPreview} alt="avatar" width={64} height={64} className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-7 w-7 text-primary/60" />
                    )}
                  </div>
                  <label className="cursor-pointer rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80">
                    사진 업로드
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Nickname */}
              <div>
                <p className="mb-2 text-[13px] font-bold text-primary">닉네임</p>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={20}
                  placeholder="닉네임"
                  className="w-full rounded-xl bg-muted px-4 py-2.5 text-sm outline-none"
                />
              </div>

              {/* Status message */}
              <div>
                <p className="mb-2 text-[13px] font-bold text-primary">상태 메시지</p>
                <input
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  maxLength={60}
                  placeholder="오늘도 고마움을 기록해요."
                  className="w-full rounded-xl bg-muted px-4 py-2.5 text-sm outline-none"
                />
              </div>

              {/* Save button */}
              <button
                onClick={handleSaveProfile}
                disabled={saving || !editName.trim()}
                className="mt-1 w-full rounded-full bg-primary py-3 text-base font-bold disabled:opacity-50"
              >
                {saving && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block List Modal — #14 */}
      {blockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-[360px] rounded-2xl bg-card p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold">차단 목록</h3>
              <button type="button" onClick={() => setBlockModalOpen(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Add input */}
            <div className="mb-3 flex gap-2">
              <input
                value={blockInput}
                onChange={(e) => setBlockInput(e.target.value)}
                placeholder="사용자 이름"
                className="flex-1 rounded-xl bg-muted px-3 py-2 text-sm outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleAddBlock()}
              />
              <Button
                size="sm"
                onClick={handleAddBlock}
                disabled={!blockInput.trim()}
                className="rounded-xl"
              >
                추가
              </Button>
            </div>

            {/* List */}
            {blockLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : blockedUsers.length > 0 ? (
              <div className="max-h-56 space-y-2 overflow-auto">
                {blockedUsers.map((u) => (
                  <div
                    key={u.name}
                    className="flex items-center justify-between rounded-xl bg-muted px-3 py-2"
                  >
                    <span className="text-sm">{u.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBlock(u.name)}
                      className="text-sm font-medium text-rose-500"
                    >
                      제거
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                차단된 사용자가 없습니다.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
