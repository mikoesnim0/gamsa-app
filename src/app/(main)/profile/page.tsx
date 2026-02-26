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
  Check,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n-context";
import { LANGUAGE_OPTIONS } from "@/lib/i18n";
import type { BlockedUser } from "@/types";

const REMINDER_TIMES = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

export default function ProfilePage() {
  const router = useRouter();
  const { firebaseUser, user, signOut } = useAuth();
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
    reader.onload = () => setEditAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
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
      window.location.reload();
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
      <header className="screen-safe-top sticky top-0 z-10 grid grid-cols-[40px_1fr_40px] items-center bg-background/80 px-4 py-4 backdrop-blur-md">
        <div />
        <h1 className="text-center font-serif text-[30px] font-bold leading-none text-[#1f2a3d]">{t("profile_title")}</h1>
        <button
          type="button"
          onClick={openEditProfile}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fef3f6]"
        >
          <Pencil className="h-4 w-4 text-[#efb8c2]" strokeWidth={1.5} />
        </button>
      </header>

      <div className="space-y-4 px-5 pb-8">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-2 py-3">
          <div className="relative">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-primary bg-secondary">
              {user?.profileImg ? (
                <Image src={user.profileImg} alt="avatar" width={112} height={112} className="h-full w-full object-cover" />
              ) : (
                <User className="h-12 w-12 text-primary/60" />
              )}
            </div>
            <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-[3px] border-background bg-green-400" />
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
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-[#9aa7ba]" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: totalSent, labelKey: "profile_stats_sent" },
              { value: 0, labelKey: "profile_stats_received" },
              { value: streakDays, labelKey: "profile_stats_streak" },
            ].map((stat) => (
              <div
                key={stat.labelKey}
                className="flex flex-col items-center rounded-xl border border-primary/10 bg-white p-4 shadow-sm"
              >
                <span className="text-xl font-bold text-slate-900">{stat.value}</span>
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {t(stat.labelKey)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Notification Settings */}
        <section>
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">{t("profile_section_notifications")}</p>
          <div className="rounded-2xl border border-primary/10 bg-white p-2 space-y-1">
            <div className="flex w-full items-center justify-between rounded-xl border border-primary/5 bg-white px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-[#efb8c2]" strokeWidth={1.5} />
                <span className="text-sm font-medium text-[#334255]">{t("profile_notif_new_letter")}</span>
              </div>
              <Toggle
                checked={newLetterOptIn}
                onChange={(v) => { setNewLetterOptIn(v); updateNotif("newLetterOptIn", v); }}
              />
            </div>

            <div className="flex w-full items-center justify-between rounded-xl border border-primary/5 bg-white px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Megaphone className="h-5 w-5 text-[#efb8c2]" strokeWidth={1.5} />
                <span className="text-sm font-medium text-[#334255]">{t("profile_notif_marketing")}</span>
              </div>
              <Toggle
                checked={marketingOptIn}
                onChange={(v) => { setMarketingOptIn(v); updateNotif("marketingOptIn", v); }}
              />
            </div>

            <div className="flex w-full items-center justify-between rounded-xl border border-primary/5 bg-white px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-[#efb8c2]" strokeWidth={1.5} />
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
                  "flex w-full items-center justify-between rounded-xl border border-primary/5 bg-white px-4 py-3.5",
                  !deliveryOptIn && "opacity-45 cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-[#efb8c2]" strokeWidth={1.5} />
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
                  <div className="absolute left-2 right-2 top-[64px] z-30 max-h-56 overflow-auto rounded-2xl border border-primary/10 bg-white p-2 shadow-[0_10px_20px_rgba(66,41,49,0.12)]">
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
                          <Check className="h-4 w-4 text-[#efb8c2]" />
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
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">{t("profile_section_security")}</p>
          <div className="rounded-2xl border border-primary/10 bg-white p-2 space-y-1">
            <button
              type="button"
              onClick={() => toast.info(t("profile_info_link_soon"))}
              className="flex w-full items-center justify-between rounded-xl border border-primary/5 bg-white px-4 py-3.5"
            >
              <div className="flex items-center gap-3">
                <Link2 className="h-5 w-5 text-[#efb8c2]" strokeWidth={1.5} />
                <span className="text-sm font-medium text-[#334255]">{t("profile_security_link")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#a6b2c5]" />
            </button>

            <button
              type="button"
              onClick={openBlockList}
              className="flex w-full items-center justify-between rounded-xl border border-primary/5 bg-white px-4 py-3.5"
            >
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-[#efb8c2]" strokeWidth={1.5} />
                <span className="text-sm font-medium text-[#334255]">{t("profile_security_block")}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#a6b2c5]" />
            </button>
          </div>
        </section>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-primary/10 py-3 text-sm font-medium text-slate-400 transition-colors hover:bg-[#fff3f6]"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.5} />
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
