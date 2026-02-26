"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Pencil,
  User,
  Loader2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { MainPageHeader } from "@/components/layout/main-page-header";
import { Button } from "@/components/ui/button";
import { PageLoadingState } from "@/components/ui/page-state";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n-context";
import { LANGUAGE_OPTIONS } from "@/lib/i18n";
import type { BlockedUser } from "@/types";

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
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );
  return canvas.toDataURL("image/jpeg", 0.9);
}

const REMINDER_TIMES = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

export default function ProfilePage() {
  const router = useRouter();
  const { firebaseUser, user, signOut, refreshUser } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [totalSent, setTotalSent] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [loading, setLoading] = useState(true);

  // Edit profile
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Crop modal
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  // Notification settings
  const [newLetterOptIn, setNewLetterOptIn] = useState(true);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [deliveryOptIn, setDeliveryOptIn] = useState(false);
  const [dailyReminderTime, setDailyReminderTime] = useState("09:00");
  const [reminderDropdownOpen, setReminderDropdownOpen] = useState(false);

  // Language dropdown
  const [langMenuOpen, setLangMenuOpen] = useState(false);

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
      toast.error(t("profile_error_save"));
    }
  }

  async function handleLogout() {
    await signOut();
    toast.success(t("profile_toast_logout"));
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
      setEditAvatarPreview(cropped);
    } catch {
      toast.error("Failed to crop image");
    }
    setCropOpen(false);
    setCropSrc(null);
  }

  async function handleSaveProfile() {
    if (!firebaseUser) return;
    setSaving(true);
    try {
      let profileImg: string | undefined;
      // Upload new avatar if changed (data URL starts with "data:")
      if (editAvatarPreview && editAvatarPreview.startsWith("data:")) {
        profileImg = await api.auth.uploadProfileImage(firebaseUser.uid, editAvatarPreview);
      }
      await api.auth.updateUserProfile(firebaseUser.uid, {
        name: editName.trim(),
        bio: editBio.trim() || null,
        ...(profileImg ? { profileImg } : {}),
      });
      toast.success(t("profile_toast_updated"));
      setEditOpen(false);
      await refreshUser();
    } catch {
      toast.error(t("profile_error_update"));
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
      toast.error(t("profile_error_load_block"));
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
      toast.success(t("profile_toast_blocked"));
    } catch {
      toast.error(t("profile_error_block"));
    }
  }

  async function handleRemoveBlock(name: string) {
    if (!firebaseUser) return;
    try {
      await api.blocked.removeBlockedUser(firebaseUser.uid, name);
      setBlockedUsers((prev) => prev.filter((u) => u.name !== name));
      toast.success(t("profile_toast_unblocked"));
    } catch {
      toast.error(t("profile_error_unblock"));
    }
  }

  const displayName = user?.name || t("profile_default_name");
  const displayBio = user?.bio || t("profile_default_bio");
  const currentLangNative = LANGUAGE_OPTIONS.find((o) => o.code === lang)?.native ?? "한국어";

  // Custom toggle component matching reference screenshots
  function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-10 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-slate-200"
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
      {/* Header */}
      <MainPageHeader
        title={t("profile_title")}
        right={(
          <button
            type="button"
            onClick={openEditProfile}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fef3f6]"
          >
            <Pencil className="h-4 w-4 text-[#efb8c2]" strokeWidth={1.5} />
          </button>
        )}
      />

      <div className="space-y-4 px-5 pb-8">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-2 py-3">
          <div className="relative">
            <button type="button" onClick={openEditProfile} className="cursor-pointer">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-primary bg-secondary">
                {user?.profileImg ? (
                  <Image src={user.profileImg} alt="avatar" width={112} height={112} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-primary/60" />
                )}
              </div>
              <span className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-background bg-[#efb8c2]">
                <span className="material-symbols-outlined text-[16px] text-white">photo_camera</span>
              </span>
            </button>
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-900">@{displayName}</h2>
            <p className="mt-1 italic text-slate-600">{displayBio}</p>
            <span className="mt-2 inline-flex items-center rounded-full bg-primary/30 px-3 py-1 text-xs font-medium text-slate-800">
              {t("profile_status_active")}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <PageLoadingState className="py-4" />
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: totalSent, labelKey: "profile_stats_sent" },
              { value: 0, labelKey: "profile_stats_received" },
              { value: streakDays, labelKey: "profile_stats_streak" },
            ].map((stat) => (
              <div
                key={stat.labelKey}
                className="flex flex-col items-center rounded-[20px] border border-[#f1d6de] bg-white px-3 py-5 shadow-sm"
              >
                <span className="font-serif text-[26px] font-bold text-[#1f2a3d] leading-none">{stat.value}</span>
                <span className="mt-2 text-[11px] font-semibold text-[#9aa7ba]">
                  {t(stat.labelKey)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Notification Settings */}
        <section>
          <p className="mb-3 px-1 text-sm font-bold uppercase tracking-widest text-[#9aa7ba]">{t("profile_section_notifications")}</p>
          <div className="rounded-2xl border border-[#f1d6de] bg-gradient-to-br from-[#fffafb] to-[#fff7f9] p-2 space-y-1">
            <div className="flex w-full items-center justify-between rounded-xl border border-[#f6e8ec] bg-[#fffefe] px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px] text-[#efb8c2]">mail</span>
                <span className="text-sm font-medium text-[#334255]">{t("profile_notif_new_letter")}</span>
              </div>
              <Toggle
                checked={newLetterOptIn}
                onChange={(v) => { setNewLetterOptIn(v); updateNotif("newLetterOptIn", v); }}
              />
            </div>

            <div className="flex w-full items-center justify-between rounded-xl border border-[#f6e8ec] bg-[#fffefe] px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px] text-[#efb8c2]">campaign</span>
                <span className="text-sm font-medium text-[#334255]">{t("profile_notif_marketing")}</span>
              </div>
              <Toggle
                checked={marketingOptIn}
                onChange={(v) => { setMarketingOptIn(v); updateNotif("marketingOptIn", v); }}
              />
            </div>

            <div className="flex w-full items-center justify-between rounded-xl border border-[#f6e8ec] bg-[#fffefe] px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px] text-[#efb8c2]">schedule</span>
                <span className="text-sm font-medium text-[#334255]">{t("profile_notif_delivery")}</span>
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
                  <span className="material-symbols-outlined text-[18px] text-[#efb8c2]">alarm</span>
                  <span className="text-sm font-medium text-[#334255]">{t("profile_notif_reminder_time")}</span>
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
                          <span className="material-symbols-outlined text-[16px] text-[#efb8c2]">check</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Settings Section — Language */}
        <section>
          <p className="mb-3 px-1 text-sm font-bold uppercase tracking-widest text-[#9aa7ba]">{t("profile_language")}</p>
          <div className="relative rounded-2xl border border-[#f1d6de] bg-gradient-to-br from-[#fffafb] to-[#fff7f9] p-2">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-[#efb8c2]">
                translate
              </span>
              <button
                type="button"
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex w-full items-center justify-between rounded-xl border border-[#f6e8ec] bg-[#fffefe] py-3.5 pl-10 pr-9 text-left text-sm font-semibold text-[#2f3f57]"
              >
                <span>{currentLangNative}</span>
              </button>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-[#a0afc4]">
                {langMenuOpen ? "expand_less" : "expand_more"}
              </span>
            </div>

            {langMenuOpen && (
              <>
                <button
                  type="button"
                  aria-label="close language menu"
                  className="fixed inset-0 z-20 bg-transparent"
                  onClick={() => setLangMenuOpen(false)}
                />
                <div className="absolute left-2 right-2 top-[64px] z-30 rounded-2xl border border-[#f1d6de] bg-white p-2 shadow-[0_10px_20px_rgba(66,41,49,0.15)]">
                  {LANGUAGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => {
                        setLang(opt.code);
                        setLangMenuOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px]",
                        lang === opt.code ? "bg-[#fff3f6] text-[#2f3f57]" : "text-[#60718a]"
                      )}
                    >
                      <span>{opt.native}</span>
                      {lang === opt.code && (
                        <span className="material-symbols-outlined text-[16px] text-[#efb8c2]">
                          check
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Security Section */}
        <section>
          <p className="mb-3 px-1 text-sm font-bold uppercase tracking-widest text-[#9aa7ba]">{t("profile_section_security")}</p>
          <div className="rounded-2xl border border-[#f1d6de] bg-gradient-to-br from-[#fffafb] to-[#fff7f9] p-2 space-y-1">
            <button
              type="button"
              onClick={() => toast.info(t("profile_info_link_soon"))}
              className="flex w-full items-center justify-between rounded-xl border border-[#f6e8ec] bg-[#fffefe] px-4 py-3.5"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px] text-[#efb8c2]">link</span>
                <span className="text-sm font-medium text-[#334255]">{t("profile_security_link")}</span>
              </div>
              <span className="material-symbols-outlined text-[18px] text-[#a0afc4]">chevron_right</span>
            </button>

            <button
              type="button"
              onClick={openBlockList}
              className="flex w-full items-center justify-between rounded-xl border border-[#f6e8ec] bg-[#fffefe] px-4 py-3.5"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[18px] text-[#efb8c2]">shield</span>
                <span className="text-sm font-medium text-[#334255]">{t("profile_security_block")}</span>
              </div>
              <span className="material-symbols-outlined text-[18px] text-[#a0afc4]">chevron_right</span>
            </button>
          </div>
        </section>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#f1d6de] bg-gradient-to-br from-[#fffafb] to-[#fff7f9] py-3.5 text-sm font-medium text-[#7d8aa0] transition-colors hover:bg-[#fff3f6]"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          {t("profile_logout")}
        </button>
      </div>

      {/* Edit Profile Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-[360px] rounded-[22px] bg-card p-5 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-serif text-xl font-bold">{t("profile_edit_title")}</h3>
              <button type="button" onClick={() => setEditOpen(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-[13px] font-bold text-primary">{t("profile_edit_photo")}</p>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-secondary">
                    {editAvatarPreview ? (
                      <Image src={editAvatarPreview} alt="avatar" width={64} height={64} className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-7 w-7 text-primary/60" />
                    )}
                  </div>
                  <label className="cursor-pointer rounded-full bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80">
                    {t("profile_edit_upload")}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[13px] font-bold text-primary">{t("profile_edit_nickname")}</p>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={20}
                  placeholder={t("profile_edit_nickname_ph")}
                  className="w-full rounded-xl bg-muted px-4 py-2.5 text-sm outline-none"
                />
              </div>

              <div>
                <p className="mb-2 text-[13px] font-bold text-primary">{t("profile_edit_status")}</p>
                <input
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  maxLength={60}
                  placeholder={t("profile_edit_status_ph")}
                  className="w-full rounded-xl bg-muted px-4 py-2.5 text-sm outline-none"
                />
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving || !editName.trim()}
                className="mt-1 w-full rounded-full bg-primary py-3 text-base font-bold disabled:opacity-50"
              >
                {saving && <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />}
                {t("common_save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      {cropOpen && cropSrc && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-[360px] rounded-[22px] bg-card p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold">{t("profile_crop_title")}</h3>
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
              <span className="material-symbols-outlined text-[18px] text-[#9aa7ba]">photo_size_select_small</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="h-1 flex-1 appearance-none rounded-full bg-[#f1d6de] accent-[#efb8c2]"
              />
              <span className="material-symbols-outlined text-[18px] text-[#9aa7ba]">photo_size_select_large</span>
            </div>
            <button
              type="button"
              onClick={handleCropConfirm}
              className="mt-3 w-full rounded-full bg-primary py-3 text-base font-bold"
            >
              {t("common_confirm")}
            </button>
          </div>
        </div>
      )}

      {/* Block List Modal */}
      {blockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-[360px] rounded-2xl bg-card p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold">{t("profile_block_title")}</h3>
              <button type="button" onClick={() => setBlockModalOpen(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="mb-3 flex gap-2">
              <input
                value={blockInput}
                onChange={(e) => setBlockInput(e.target.value)}
                placeholder={t("profile_block_ph")}
                className="flex-1 rounded-xl bg-muted px-3 py-2 text-sm outline-none"
                onKeyDown={(e) => e.key === "Enter" && handleAddBlock()}
              />
              <Button
                size="sm"
                onClick={handleAddBlock}
                disabled={!blockInput.trim()}
                className="rounded-xl"
              >
                {t("common_add")}
              </Button>
            </div>

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
                      {t("profile_block_remove")}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t("profile_block_empty")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
