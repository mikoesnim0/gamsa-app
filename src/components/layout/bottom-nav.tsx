"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n-context";

interface NavItem {
  href: string;
  labelKey: string;
  icon: string; // Material Symbols icon name
  hasFill?: boolean; // supports FILL variation for active state
}

const LEFT_ITEMS: NavItem[] = [
  { href: "/home", labelKey: "nav_home", icon: "home", hasFill: true },
  { href: "/records", labelKey: "nav_records", icon: "history_edu" },
];

const RIGHT_ITEMS: NavItem[] = [
  { href: "/friends", labelKey: "nav_friends", icon: "group", hasFill: true },
  { href: "/profile", labelKey: "nav_profile", icon: "account_circle", hasFill: true },
];

function NavTab({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const { t } = useI18n();
  return (
    <Link
      href={item.href}
      className={cn(
        "flex min-w-[56px] flex-col items-center gap-1 py-2 transition-colors",
        isActive ? "text-[#efb8c2]" : "text-[#8fa1ba]"
      )}
    >
      <span
        className="material-symbols-outlined text-[26px]"
        style={
          item.hasFill
            ? { fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }
            : undefined
        }
      >
        {item.icon}
      </span>
      <span
        className={cn(
          "text-[11px] leading-tight",
          isActive ? "font-bold" : "font-semibold"
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
    <nav className="nav-safe-bottom fixed bottom-0 left-0 right-0 z-[160] border-t border-[#ece8ec] bg-[#f8f6f6] px-6 pt-2">
      <div className="mx-auto flex max-w-[620px] items-end justify-between">
        {/* Left tabs */}
        {LEFT_ITEMS.map((item) => (
          <NavTab
            key={item.href}
            item={item}
            isActive={pathname.startsWith(item.href)}
          />
        ))}

        {/* Center FAB — matches designer "from" exactly */}
        <Link
          href="/write"
          className="-mt-7 flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#f8f6f6] bg-[#efb8c2] shadow-[0_10px_18px_rgba(239,184,194,0.45)] active:scale-95 transition-transform"
        >
          <Image
            src="/icons/dove-mail.png"
            alt="write gratitude"
            width={36}
            height={36}
            className="object-contain"
          />
        </Link>

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
