"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  Users,
  UserCircle,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-context";

interface NavItem {
  href: string;
  labelKey: string;
  icon: typeof Home;
}

const LEFT_ITEMS: NavItem[] = [
  { href: "/home", labelKey: "nav_home", icon: Home },
  { href: "/records", labelKey: "nav_records", icon: BookOpen },
];

const RIGHT_ITEMS: NavItem[] = [
  { href: "/friends", labelKey: "nav_friends", icon: Users },
  { href: "/profile", labelKey: "nav_profile", icon: UserCircle },
];

function NavTab({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const { t } = useI18n();
  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors",
        isActive ? "text-[#efb8c2]" : "text-[#8fa1ba]"
      )}
    >
      <item.icon
        className="h-[26px] w-[26px]"
        strokeWidth={1.5}
        fill={isActive ? "currentColor" : "none"}
      />
      <span
        className={cn(
          "text-[11px] leading-tight",
          isActive ? "font-bold" : "font-medium"
        )}
      >
        {t(item.labelKey)}
      </span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#ece8ec] bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md items-end px-2">
        {/* Left tabs */}
        {LEFT_ITEMS.map((item) => (
          <NavTab
            key={item.href}
            item={item}
            isActive={pathname.startsWith(item.href)}
          />
        ))}

        {/* Center FAB */}
        <div className="flex flex-1 items-end justify-center">
          <Link
            href="/write"
            className="-mt-8 mb-1 flex items-center justify-center"
          >
            {/* Outer ring */}
            <div className="rounded-full bg-background p-[5px] shadow-[0_-4px_12px_rgba(239,184,194,0.15)]">
              {/* Inner FAB */}
              <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-[#efb8c2] text-white shadow-[0_8px_24px_rgba(239,184,194,0.5)] active:scale-95 transition-transform">
                <Image
                  src="/icons/dove-mail.png"
                  alt="write gratitude"
                  width={34}
                  height={34}
                  className="object-contain"
                />
              </div>
            </div>
          </Link>
        </div>

        {/* Right tabs */}
        {RIGHT_ITEMS.map((item) => (
          <NavTab
            key={item.href}
            item={item}
            isActive={pathname.startsWith(item.href)}
          />
        ))}
      </div>
    </nav>
  );
}
