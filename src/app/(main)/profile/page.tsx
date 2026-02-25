"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Pencil,
  Mail,
  Clock,
  UserPlus,
  Lock,
  Shield,
  FileDown,
  Cloud,
  LogOut,
  ChevronRight,
  User,
  Award,
  BarChart3,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

interface SettingItemProps {
  icon: typeof Mail;
  label: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
}

function SettingItem({ icon: Icon, label, trailing, onClick }: SettingItemProps) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className="flex w-full items-center justify-between py-4 text-left"
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-primary/70" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {trailing}
    </Wrapper>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { firebaseUser, user, signOut } = useAuth();
  const [totalSent, setTotalSent] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    Promise.all([
      api.gratitude.getEntries(uid),
      api.streak.getStreak(uid),
    ])
      .then(([entries, streak]) => {
        setTotalSent(entries.length);
        setStreakDays(streak.currentStreak);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [firebaseUser]);

  async function handleLogout() {
    await signOut();
    toast.success("로그아웃되었습니다.");
    router.push("/");
  }

  function handleExportPdf() {
    toast.info("PDF 내보내기 기능은 준비 중입니다.");
  }

  function handleCloudBackup() {
    toast.info("클라우드 백업 기능은 준비 중입니다.");
  }

  function handleComingSoon() {
    toast.info("이 기능은 준비 중입니다.");
  }

  function openEditProfile() {
    setEditName(user?.name ?? "");
    setEditBio(user?.bio ?? "");
    setEditOpen(true);
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
      // Reload to reflect changes
      window.location.reload();
    } catch {
      toast.error("프로필 수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const displayName = user?.name || "사용자";
  const displayBio = user?.bio || "매일 감사를 기록하는 중";

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-background/80 px-4 py-4 backdrop-blur-md">
        <Link href="/home">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Settings className="h-5 w-5 text-muted-foreground" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold">프로필</h1>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={openEditProfile}
        >
          <Pencil className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
        </Button>
      </header>

      <div className="space-y-6 px-4 pb-8">
        {/* Profile Card */}
        <div className="flex flex-col items-center gap-4 py-4">
          <Avatar className="h-24 w-24">
            <AvatarFallback className="bg-secondary text-primary">
              <User className="h-10 w-10" />
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h2 className="font-serif text-xl font-bold">{displayName}</h2>
            <p className="mt-1 font-serif text-sm italic text-muted-foreground">
              {displayBio}
            </p>
          </div>
        </div>

        {/* Stats Row */}
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: totalSent, label: "보낸", href: "/records" },
              { value: 0, label: "받은", href: "/records" },
              { value: streakDays, label: "연속일", href: "/home/calendar" },
            ].map((stat) => (
              <Link key={stat.label} href={stat.href}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="flex flex-col items-center py-4">
                    <span className="text-2xl font-bold">{stat.value}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {stat.label}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Notifications Section */}
        <section className="px-2">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            알림 설정
          </p>
          <SettingItem
            icon={Mail}
            label="새 편지"
            trailing={<Switch defaultChecked />}
          />
          <Separator />
          <SettingItem
            icon={Clock}
            label="전달 예약"
            trailing={<Switch />}
          />
          <Separator />
          <SettingItem
            icon={UserPlus}
            label="친구 요청"
            trailing={<Switch defaultChecked />}
          />
        </section>

        {/* Security Section */}
        <section className="px-2">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            보안
          </p>
          <SettingItem
            icon={Lock}
            label="비밀번호"
            trailing={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
            onClick={handleComingSoon}
          />
          <Separator />
          <SettingItem
            icon={Shield}
            label="차단 목록"
            trailing={<ChevronRight className="h-4 w-4 text-muted-foreground" />}
            onClick={handleComingSoon}
          />
        </section>

        {/* Data & Privacy Section */}
        <section className="px-2">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            데이터 & 개인정보
          </p>
          <SettingItem
            icon={FileDown}
            label="PDF로 내보내기"
            trailing={<FileDown className="h-4 w-4 text-muted-foreground" />}
            onClick={handleExportPdf}
          />
          <Separator />
          <SettingItem
            icon={Cloud}
            label="클라우드 백업"
            trailing={<Cloud className="h-4 w-4 text-muted-foreground" />}
            onClick={handleCloudBackup}
          />
        </section>

        {/* Quick Links */}
        <section className="px-2">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            바로가기
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/badges">
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-2 p-3">
                  <Award className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">감사패</span>
                </CardContent>
              </Card>
            </Link>
            <Link href="/report">
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex items-center gap-2 p-3">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">연간 리포트</span>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>

        {/* Logout */}
        <div className="flex justify-center pt-4">
          <Button
            variant="ghost"
            className="text-sm font-bold text-primary hover:text-primary/80"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" strokeWidth={1.5} />
            로그아웃
          </Button>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center">프로필 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                이름
              </Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="mt-2 rounded-xl"
                maxLength={20}
                placeholder="이름"
              />
            </div>
            <div>
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                소개
              </Label>
              <Textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                className="mt-2 resize-none rounded-xl"
                maxLength={100}
                rows={3}
                placeholder="한 줄 소개를 입력하세요"
              />
            </div>
            <Button
              className="h-12 w-full rounded-xl bg-primary text-base font-bold text-primary-foreground"
              onClick={handleSaveProfile}
              disabled={saving || !editName.trim()}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={1.5} />}
              저장
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
