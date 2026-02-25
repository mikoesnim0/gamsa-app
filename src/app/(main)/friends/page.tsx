"use client";

import { useState, useEffect } from "react";
import { Search, Copy, Calendar, ArrowLeftRight, ChevronRight, X, Check, QrCode, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Friend } from "@/types";

export default function FriendsPage() {
  const { firebaseUser, user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

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

  function handleCopyCode() {
    navigator.clipboard.writeText(inviteCode).then(() => {
      toast.success("초대 코드가 복사되었습니다!");
    }).catch(() => {
      toast.success(`초대 코드: ${inviteCode}`);
    });
  }

  function handleQrCode() {
    toast.info("QR 코드 기능은 준비 중입니다.");
  }

  function handleAddFriend() {
    toast.info("친구 추가 기능은 준비 중입니다.");
  }

  async function handleAcceptRequest(id: string) {
    if (!firebaseUser) return;
    try {
      await api.friends.acceptFriendRequest(firebaseUser.uid, id);
      setPendingRequests((prev) => prev.filter((r) => r.id !== id));
      toast.success("친구 요청을 수락했습니다!");
    } catch {
      toast.error("요청 처리에 실패했습니다.");
    }
  }

  async function handleRejectRequest(id: string) {
    if (!firebaseUser) return;
    try {
      await api.friends.rejectFriendRequest(firebaseUser.uid, id);
      setPendingRequests((prev) => prev.filter((r) => r.id !== id));
      toast("친구 요청을 거절했습니다.");
    } catch {
      toast.error("요청 처리에 실패했습니다.");
    }
  }

  function formatDate(ts: { toDate?: () => Date }): string {
    const d = ts?.toDate ? ts.toDate() : new Date(ts as unknown as string);
    return d.toLocaleDateString("ko-KR");
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background/80 px-4 py-4 backdrop-blur-md">
        <Button variant="ghost" size="icon" className="rounded-full" onClick={handleQrCode}>
          <QrCode className="h-5 w-5 text-primary" />
        </Button>
        <h1 className="text-lg font-bold">커뮤니티</h1>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={handleAddFriend}>
          <UserPlus className="h-5 w-5 text-primary" />
        </Button>
      </header>

      <div className="px-4 pb-8">
        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="mb-4 w-full">
            <TabsTrigger value="friends" className="flex-1">친구</TabsTrigger>
            <TabsTrigger value="requests" className="flex-1">
              요청
              {pendingRequests.length > 0 && (
                <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {pendingRequests.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="친구 찾기..."
                className="rounded-xl pl-10"
              />
            </div>

            {/* Invite Code */}
            <Card className="border-primary/20 bg-secondary/50">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                  <ArrowLeftRight className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    나의 초대 코드
                  </p>
                  <p className="text-lg font-bold tracking-wider">{inviteCode}</p>
                </div>
                <Button
                  variant="ghost"
                  className="text-sm font-medium text-primary"
                  onClick={handleCopyCode}
                >
                  <Copy className="mr-1 h-4 w-4" /> Copy
                </Button>
              </CardContent>
            </Card>

            {/* Friends List */}
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : friends.length > 0 ? (
              <div className="space-y-1">
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center gap-4 rounded-xl p-3 hover:bg-muted"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-secondary text-primary">
                        {friend.friendProfile?.name?.[0] ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-bold">{friend.friendProfile?.name ?? friend.friendUserId}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {formatDate(friend.createdAt)}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-primary/50" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                아직 친구가 없습니다. 초대 코드를 공유해보세요!
              </p>
            )}

            {/* Pending (shown at bottom) */}
            {pendingRequests.length > 0 && (
              <>
                <p className="pt-4 text-xs font-bold uppercase tracking-widest text-primary">
                  대기 중 ({pendingRequests.length})
                </p>
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center gap-4 rounded-xl bg-muted/50 p-3"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-secondary text-primary">
                        {request.friendProfile?.name?.[0] ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-bold">{request.friendProfile?.name ?? request.friendUserId}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(request.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full border border-border"
                        onClick={() => handleRejectRequest(request.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        className="h-9 w-9 rounded-full bg-primary text-primary-foreground"
                        onClick={() => handleAcceptRequest(request.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : pendingRequests.length > 0 ? (
              pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-4 rounded-xl bg-muted/50 p-3"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-secondary text-primary">
                      {request.friendProfile?.name?.[0] ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-bold">{request.friendProfile?.name ?? request.friendUserId}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(request.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full border border-border"
                      onClick={() => handleRejectRequest(request.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      className="h-9 w-9 rounded-full bg-primary text-primary-foreground"
                      onClick={() => handleAcceptRequest(request.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                받은 친구 요청이 없습니다.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
