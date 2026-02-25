"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  Plus,
  Users,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
}

const navItems: NavItem[] = [
  { href: "/home", label: "홈", icon: Home },
  { href: "/records", label: "기록", icon: BookOpen },
  { href: "/write", label: "", icon: Plus }, // 가운데 FAB
  { href: "/friends", label: "친구", icon: Users },
  { href: "/profile", label: "나", icon: UserCircle },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/80 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 pt-2 pb-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const isFab = item.href === "/write";

          if (isFab) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex -mt-6 items-center justify-center"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_4px_16px_-2px] shadow-primary/50 border-4 border-background active:scale-95 transition-transform">
                  <Plus className="h-7 w-7" strokeWidth={1.5} />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 p-2 transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              <item.icon
                className="h-5 w-5"
                strokeWidth={1.5}
                fill={isActive ? "currentColor" : "none"}
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
