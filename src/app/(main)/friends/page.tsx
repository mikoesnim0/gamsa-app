"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Copy, Share2, X, Check, QrCode, Loader2, Phone, MessageCircle, Download, BookUser, UserPlus } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, hashPhone } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n-context";
import { pickContacts, isContactsSupported } from "@/lib/contacts";
import type { Friend } from "@/types";
import type { PhoneMatchResult } from "@/lib/api/friends";

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export default function FriendsPage() {
  const { firebaseUser, user } = useAuth();
  const { t } = useI18n();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrSaving, setQrSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [friendCodeInput, setFriendCodeInput] = useState("");
  const [addingFriend, setAddingFriend] = useState(false);
  const [contactSearching, setContactSearching] = useState(false);
  const [contactMatches, setContactMatches] = useState<PhoneMatchResult[]>([]);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [sendingRequestTo, setSendingRequestTo] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"friends" | "requests">("friends");

  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    Promise.all([
      api.friends.getFriends(uid),
      api.friends.getPendingRequests(uid),
    ])
      .then(([friendList, pendingList]) => {
        setFriends(friendList);
        setPendingRequests(pendingList);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [firebaseUser]);

  const inviteCode = user?.inviteCode ?? "---";

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.trim().toLowerCase();
    return friends.filter((f) => {
      const name = f.friendProfile?.name ?? f.friendUserId;
      return name.toLowerCase().includes(q);
    });
  }, [friends, searchQuery]);

  const isInviteCode = /^[A-Z0-9]{3,8}-\d{2,4}$/i.test(searchQuery.trim());

  function handleCopyCode() {
    navigator.clipboard.writeText(inviteCode).then(() => {
      toast.success(t("friends_toast_code_copied"));
    }).catch(() => {
      toast.success(`${t("friends_invite_code")}: ${inviteCode}`);
    });
  }

  async function handleSendFriendRequest() {
    if (!firebaseUser) return;
    const code = isInviteCode ? searchQuery.trim() : friendCodeInput.trim();
    if (!code) return;
    setAddingFriend(true);
    try {
      await api.friends.sendFriendRequestByCode(firebaseUser.uid, code);
      toast.success(t("friends_toast_request_sent"));
      setSearchQuery("");
      setFriendCodeInput("");
    } catch {
      toast.error(t("friends_error_request"));
    } finally {
      setAddingFriend(false);
    }
  }

  async function handleAcceptRequest(id: string) {
    if (!firebaseUser) return;
    try {
      await api.friends.acceptFriendRequest(firebaseUser.uid, id);
      setPendingRequests((prev) => prev.filter((r) => r.id !== id));
      toast.success(t("friends_toast_accepted"));
      const updatedFriends = await api.friends.getFriends(firebaseUser.uid);
      setFriends(updatedFriends);

      // Check & award badges (friend-related)
      try {
        const { newBadges } = await api.badges.checkAndAwardBadges(firebaseUser.uid);
        for (const badge of newBadges) {
          const def = (await import("@/lib/badges/definitions")).getBadgeDefinition(badge.type);
          if (def) toast.success(t("badge_toast_earned", { name: t(def.nameKey) }));
        }
      } catch { /* badge check is non-blocking */ }
    } catch {
      toast.error(t("friends_error_process"));
    }
  }

  async function handleRejectRequest(id: string) {
    if (!firebaseUser) return;
    try {
      await api.friends.rejectFriendRequest(firebaseUser.uid, id);
      setPendingRequests((prev) => prev.filter((r) => r.id !== id));
      toast(t("friends_toast_rejected"));
    } catch {
      toast.error(t("friends_error_process"));
    }
  }

  const handleFindFromContacts = useCallback(async () => {
    if (!firebaseUser) return;
    setContactSearching(true);
    try {
      const contacts = await pickContacts({ multiple: true });
      if (!contacts || contacts.length === 0) {
        toast.info(t("friends_info_no_contacts"));
        setContactSearching(false);
        return;
      }

      const allPhones: string[] = [];
      for (const c of contacts) {
        for (const phone of c.phones) {
          allPhones.push(phone);
        }
      }

      const hashes = await Promise.all(allPhones.map((p) => hashPhone(p)));
      const uniqueHashes = [...new Set(hashes)];

      const matches = await api.friends.findUsersByPhoneHashes(
        firebaseUser.uid,
        uniqueHashes
      );

      setContactMatches(matches);
      setContactModalOpen(true);

      if (matches.length === 0) {
        toast.info(t("friends_info_no_matches"));
      }
    } catch {
      toast.error(t("friends_error_load_contacts"));
    } finally {
      setContactSearching(false);
    }
  }, [firebaseUser, t]);

  async function handleSendRequestFromContact(targetUserId: string) {
    if (!firebaseUser) return;
    setSendingRequestTo(targetUserId);
    try {
      await api.friends.sendFriendRequest(firebaseUser.uid, targetUserId);
      toast.success(t("friends_toast_request_sent"));
      setContactMatches((prev) => prev.filter((m) => m.userId !== targetUserId));
    } catch {
      toast.error(t("friends_error_send_request"));
    } finally {
      setSendingRequestTo(null);
    }
  }

  const saveQrPicture = useCallback(async () => {
    setQrSaving(true);
    try {
      const inviteLink = `https://gamsa-app.vercel.app/invite/${encodeURIComponent(inviteCode)}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(inviteLink)}`;

      const res = await fetch(qrUrl, { cache: "no-store" });
      if (!res.ok) throw new Error("QR fetch failed");
      const qrBlob = await res.blob();
      const qrUrlLocal = URL.createObjectURL(qrBlob);
      const qrImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = qrUrlLocal;
      });

      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1440;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No canvas context");

      ctx.fillStyle = "#f4ebe1";
      ctx.fillRect(0, 0, 1080, 1440);

      ctx.shadowColor = "rgba(70, 50, 35, 0.15)";
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 8;
      roundedRectPath(ctx, 30, 30, 1020, 1380, 60);
      ctx.fillStyle = "#f7ede1";
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      ctx.textAlign = "center";
      ctx.fillStyle = "#5d4a46";
      ctx.font = "700 84px 'Noto Serif', serif";
      ctx.fillText("Gratella", 540, 220);

      ctx.fillStyle = "#9a827a";
      ctx.font = "500 40px 'Noto Sans', sans-serif";
      ctx.fillText(t("friends_invite_card_subtitle"), 540, 292);

      ctx.fillStyle = "#efb8c2";
      roundedRectPath(ctx, 490, 325, 100, 8, 6);
      ctx.fill();

      roundedRectPath(ctx, 272, 388, 536, 536, 46);
      ctx.fillStyle = "#f2f2f2";
      ctx.fill();

      ctx.shadowColor = "rgba(0,0,0,0.18)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 8;
      roundedRectPath(ctx, 365, 482, 350, 350, 14);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      ctx.drawImage(qrImg, 431, 545, 218, 218);
      URL.revokeObjectURL(qrUrlLocal);

      ctx.fillStyle = "#6f5a54";
      ctx.font = "500 50px 'Noto Sans', sans-serif";
      ctx.fillText(t("friends_invite_card_scan1"), 540, 1020);
      ctx.fillText(t("friends_invite_card_scan2"), 540, 1090);

      ctx.fillStyle = "#5d4a46";
      ctx.font = "700 36px 'Noto Serif', serif";
      ctx.fillText(inviteCode, 540, 1170);

      ["#efb8c2", "#f4d3db", "#f1dee3"].forEach((dot, idx) => {
        ctx.beginPath();
        ctx.fillStyle = dot;
        ctx.arc(515 + idx * 28, 1260, 6, 0, Math.PI * 2);
        ctx.fill();
      });

      const outBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png")
      );
      if (!outBlob) throw new Error("Canvas toBlob failed");
      const outUrl = URL.createObjectURL(outBlob);
      const a = document.createElement("a");
      a.href = outUrl;
      a.download = `invite-card-${(user?.name ?? "guest").toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(outUrl);
      toast.success(t("friends_toast_card_saved"));
    } catch {
      toast.error(t("friends_error_save_image"));
    } finally {
      setQrSaving(false);
    }
  }, [inviteCode, user?.name, t]);

  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 grid grid-cols-[40px_1fr_40px] items-center bg-background/80 px-4 py-4 backdrop-blur-md">
        <div />
        <h1 className="text-center font-serif text-[30px] font-bold leading-none">{t("friends_title")}</h1>
        <button
          type="button"
          onClick={() => setQrOpen(true)}
          className="flex h-10 w-10 items-center justify-center"
        >
          <QrCode className="h-5 w-5 text-primary" strokeWidth={1.5} />
        </button>
      </header>

      <div className="mx-auto w-full max-w-[390px] px-4 pb-8">
        <div className="mb-4 flex text-center text-[15px] font-semibold text-muted-foreground">
          <button
            type="button"
            onClick={() => setActiveTab("friends")}
            className={cn("w-1/2 pb-2 border-b-2", activeTab === "friends" ? "text-foreground border-primary" : "border-transparent")}
          >
            {t("friends_tab_friends")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("requests")}
            className={cn("w-1/2 pb-2 border-b-2", activeTab === "requests" ? "text-foreground border-primary" : "border-transparent")}
          >
            {t("friends_tab_requests")}
            {pendingRequests.length > 0 && (
              <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "friends" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-full bg-muted px-4 py-3">
              <Search className="h-5 w-5 text-primary" strokeWidth={1.5} />
              <input
                placeholder={t("friends_placeholder_search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border-0 bg-transparent text-[17px] text-foreground outline-none ring-0 placeholder:text-muted-foreground"
              />
            </div>

            {isInviteCode && (
              <button
                type="button"
                onClick={handleSendFriendRequest}
                disabled={addingFriend}
                className="w-full rounded-full bg-primary px-4 py-2.5 text-[14px] font-semibold text-foreground"
              >
                {addingFriend ? <Loader2 className="inline mr-2 h-4 w-4 animate-spin" /> : null}
                {t("friends_send_request")}
              </button>
            )}

            <div className="rounded-[30px] bg-secondary px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
                    <Share2 className="h-5 w-5 text-primary-foreground" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("friends_invite_code")}</p>
                    <p className="font-serif text-[28px] font-bold leading-none">{inviteCode}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="rounded-full bg-muted px-5 py-2 text-[16px] font-bold text-primary"
                >
                  {t("common_copy")}
                </button>
              </div>
            </div>

            {isContactsSupported() && (
              <button
                type="button"
                onClick={handleFindFromContacts}
                disabled={contactSearching}
                className="flex w-full items-center gap-3 rounded-[30px] bg-muted px-4 py-4"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#efb8c2]">
                  {contactSearching ? (
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  ) : (
                    <BookUser className="h-5 w-5 text-white" strokeWidth={1.5} />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-[15px] font-bold text-foreground">{t("friends_find_contacts")}</p>
                  <p className="text-[12px] text-muted-foreground">{t("friends_find_contacts_desc")}</p>
                </div>
              </button>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredFriends.length > 0 ? (
              <div className="space-y-3">
                {filteredFriends.map((friend) => {
                  const name = friend.friendProfile?.name ?? friend.friendUserId;
                  const bio = friend.friendProfile?.bio ?? "";
                  const hasPhone = friend.friendProfile?.hasPhone ?? false;
                  const hasKakao = friend.friendProfile?.hasKakao ?? false;
                  return (
                    <article key={friend.id} className="rounded-[24px] bg-muted px-3 py-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-14 w-14">
                          <AvatarFallback className="bg-primary/20 text-primary font-serif text-xl">
                            {name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-serif text-[20px] font-bold leading-none">{name}</p>
                            <Phone className={cn("h-3.5 w-3.5", hasPhone ? "text-[#efb8c2]" : "text-muted-foreground/30")} strokeWidth={1.5} />
                            <MessageCircle className={cn("h-3.5 w-3.5", hasKakao ? "text-[#FAE100]" : "text-muted-foreground/30")} strokeWidth={1.5} />
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">@{friend.friendUserId.slice(0, 8)}</p>
                          {bio && <p className="mt-0.5 truncate text-[12px] text-muted-foreground/80">{bio}</p>}
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button type="button" className="rounded-full bg-card px-3 py-2 text-center text-[13px] font-semibold text-muted-foreground">
                          {t("friends_action_like")}
                        </button>
                        <Link
                          href={`/write?target=${encodeURIComponent(name)}`}
                          className="rounded-full bg-primary px-3 py-2 text-center text-[13px] font-semibold text-foreground"
                        >
                          {t("friends_action_write")}
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : searchQuery.trim() ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("friends_search_no_results", { query: searchQuery.trim() })}
              </p>
            ) : (
              <div className="rounded-[20px] bg-muted px-3 py-4 text-center">
                <p className="text-sm text-muted-foreground">{t("friends_empty")}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "requests" && (
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : pendingRequests.length > 0 ? (
              pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between rounded-[20px] bg-muted px-3 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/20 text-primary font-serif">
                        {(request.friendProfile?.name ?? request.friendUserId)[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-serif text-[16px] font-bold">
                        {request.friendProfile?.name ?? request.friendUserId}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleRejectRequest(request.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-muted-foreground/20"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAcceptRequest(request.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-primary"
                    >
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {t("friends_requests_empty")}
              </div>
            )}
          </div>
        )}
      </div>

      {/* QR Modal */}
      {qrOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-[360px] rounded-[26px] bg-card p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-[#1f2a3d]">{t("friends_qr_title")}</h3>
              <button type="button" onClick={() => setQrOpen(false)}>
                <X className="h-5 w-5 text-[#8d99ac]" />
              </button>
            </div>
            <div className="flex flex-col items-center gap-4">
              <div className="mx-auto rounded-[12px] bg-white p-4 shadow-sm">
                <QRCodeSVG
                  value={`https://gamsa-app.vercel.app/invite/${encodeURIComponent(inviteCode)}`}
                  size={240}
                  level="M"
                  fgColor="#211113"
                  bgColor="#ffffff"
                />
              </div>
              <p className="text-center text-sm text-[#8d99ac]">{t("friends_qr_desc")}</p>
              <div className="flex items-center gap-2">
                <span className="font-serif text-[22px] font-bold text-[#1f2a3d]">{inviteCode}</span>
                <button type="button" onClick={handleCopyCode} className="rounded-full bg-[#f2f2f3] px-4 py-1.5 text-[14px] font-bold text-[#efb8c2]">
                  {t("common_copy")}
                </button>
              </div>
              <button
                type="button"
                onClick={saveQrPicture}
                disabled={qrSaving}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#efb8c2] py-3 text-[15px] font-bold text-white disabled:opacity-60"
              >
                {qrSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" strokeWidth={2} />}
                {t("friends_qr_save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Matches Modal */}
      {contactModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 sm:items-center">
          <div className="w-full max-w-[400px] rounded-t-[26px] bg-card p-5 shadow-xl sm:rounded-[26px]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-[#1f2a3d]">{t("friends_contacts_title")}</h3>
              <button type="button" onClick={() => setContactModalOpen(false)}>
                <X className="h-5 w-5 text-[#8d99ac]" />
              </button>
            </div>

            {contactMatches.length > 0 ? (
              <div className="max-h-[50vh] space-y-2 overflow-y-auto">
                {contactMatches.map((match) => (
                  <div key={match.userId} className="flex items-center justify-between rounded-[20px] bg-muted px-3 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/20 text-primary font-serif">{match.name[0]}</AvatarFallback>
                      </Avatar>
                      <p className="font-serif text-[16px] font-bold">{match.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSendRequestFromContact(match.userId)}
                      disabled={sendingRequestTo === match.userId}
                      className="flex items-center gap-1 rounded-full bg-[#efb8c2] px-4 py-2 text-[13px] font-bold text-white disabled:opacity-60"
                    >
                      {sendingRequestTo === match.userId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" strokeWidth={2} />}
                      {t("common_add")}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-sm text-[#8d99ac]">{t("friends_contacts_no_matches")}</p>
                <p className="mt-2 text-[12px] text-[#8d99ac]">{t("friends_contacts_invite_hint")}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
