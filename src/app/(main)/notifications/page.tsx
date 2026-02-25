"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Mail, Rocket, UserPlus, Heart, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import type { Notification, NotificationType } from "@/types";

function getNotificationIcon(type: NotificationType) {
  const iconMap: Record<NotificationType, { icon: typeof Mail; bgClass: string }> = {
    letter_received: { icon: Mail, bgClass: "bg-primary/20 text-primary" },
    delivery_scheduled: { icon: Rocket, bgClass: "bg-orange-100 text-orange-500" },
    friend_request: { icon: UserPlus, bgClass: "bg-primary/20 text-primary" },
    milestone: { icon: Heart, bgClass: "bg-primary/10 text-primary" },
    daily_reminder: { icon: Clock, bgClass: "bg-muted text-muted-foreground" },
    streak_warning: { icon: Clock, bgClass: "bg-orange-100 text-orange-500" },
    matching: { icon: UserPlus, bgClass: "bg-primary/20 text-primary" },
  };
  return iconMap[type] ?? iconMap.daily_reminder;
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return date.toLocaleDateString("ko-KR");
}

export default function NotificationsPage() {
  const { firebaseUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    api.notifications
      .getNotifications(firebaseUser.uid)
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [firebaseUser]);

  const unread = notifications.filter((n) => !n.isRead);
  const read = notifications.filter((n) => n.isRead);

  async function handleMarkAllRead() {
    if (!firebaseUser) return;
    try {
      await api.notifications.markAllAsRead(firebaseUser.uid);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("모든 알림을 읽음 처리했습니다.");
    } catch {
      toast.error("처리에 실패했습니다.");
    }
  }

  async function handleAccept(id: string) {
    if (!firebaseUser) return;
    try {
      await api.notifications.markAsRead(firebaseUser.uid, id);
      setNotifications((prev) =>
        prev.map((n) => n.id === id ? { ...n, isRead: true } : n)
      );
      toast.success("친구 요청을 수락했습니다!");
    } catch {
      toast.error("처리에 실패했습니다.");
    }
  }

  async function handleReject(id: string) {
    if (!firebaseUser) return;
    try {
      await api.notifications.markAsRead(firebaseUser.uid, id);
      setNotifications((prev) =>
        prev.map((n) => n.id === id ? { ...n, isRead: true } : n)
      );
      toast("친구 요청을 거절했습니다.");
    } catch {
      toast.error("처리에 실패했습니다.");
    }
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background/80 px-4 py-4 backdrop-blur-md">
        <Link href="/home">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold">알림</h1>
        <Button
          variant="ghost"
          className="text-sm font-medium text-primary"
          onClick={handleMarkAllRead}
          disabled={unread.length === 0}
        >
          모두 읽음
        </Button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4 px-4 pb-8">
          {/* Unread Notifications */}
          {unread.map((notification) => {
            const { icon: Icon, bgClass } = getNotificationIcon(notification.type);
            const timeAgo = notification.createdAt?.toDate
              ? getRelativeTime(notification.createdAt.toDate())
              : "";
            return (
              <Card
                key={notification.id}
                className="border-0 bg-secondary/50 shadow-sm"
              >
                <CardContent className="flex gap-4 p-4">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${bgClass}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-snug">
                      {notification.title}
                      <span className="ml-2 inline-block h-2 w-2 rounded-full bg-primary" />
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {timeAgo}
                    </p>
                    {notification.type === "friend_request" && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          className="rounded-full bg-primary px-6 text-primary-foreground"
                          onClick={() => handleAccept(notification.id)}
                        >
                          수락
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full px-6"
                          onClick={() => handleReject(notification.id)}
                        >
                          거절
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Read Notifications */}
          {read.length > 0 && (
            <>
              <p className="px-2 pt-4 text-xs font-bold uppercase tracking-widest text-primary">
                이전 알림
              </p>
              {read.map((notification) => {
                const { icon: Icon, bgClass } = getNotificationIcon(notification.type);
                const timeAgo = notification.createdAt?.toDate
                  ? getRelativeTime(notification.createdAt.toDate())
                  : "";
                return (
                  <Card key={notification.id} className="border-0 opacity-70 shadow-sm">
                    <CardContent className="flex gap-4 p-4">
                      <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${bgClass}`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium leading-snug">
                          {notification.title}
                        </p>
                        <div className="mt-1 flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {timeAgo}
                          </p>
                          {notification.type === "milestone" && (
                            <Link
                              href="/records"
                              className="text-xs font-medium text-primary"
                            >
                              리포트 보기 &gt;
                            </Link>
                          )}
                          {notification.type === "daily_reminder" && (
                            <Link
                              href="/write"
                              className="text-xs font-medium text-primary"
                            >
                              기록하기 &gt;
                            </Link>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}

          {notifications.length === 0 && (
            <div className="py-16 text-center text-muted-foreground">
              알림이 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
