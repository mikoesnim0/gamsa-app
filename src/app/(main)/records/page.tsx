"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Share2, ChevronRight, Check, Loader2, Users, Clock, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n-context";
import type { GratitudeEntry, Target, EmotionTag } from "@/types";

const EMOTION_KEYS: Record<string, string> = {
  gratitude: "emotion_gratitude",
  comfort: "emotion_comfort",
  respect: "emotion_respect",
  love: "emotion_love",
  warmth: "emotion_warmth",
  joy: "emotion_joy",
  nostalgia: "emotion_nostalgia",
  trust: "emotion_trust",
  hope: "emotion_hope",
};

const ALL_EMOTIONS: EmotionTag[] = [
  "gratitude", "comfort", "respect", "love", "warmth", "joy", "trust", "hope",
];

// From reference donut chart colors
const EMOTION_COLORS: Record<string, string> = {
  gratitude: "#efb8c2",
  comfort: "#f3c9d6",
  respect: "#e8d9bf",
  love: "#e79ad0",
  warmth: "#e9b88f",
  joy: "#f7b76b",
  trust: "#9fc6ff",
  hope: "#a9d88f",
  nostalgia: "#c9b8ef",
};

type DateFilter = "recent" | "oldest" | "week" | "month" | "year";
type OpenMenu = "date" | "emotion" | "friend" | null;
type TabKey = "total" | "sent" | "received";
type ViewMode = "timeline" | "grouped";

const DATE_FILTER_KEYS: { value: DateFilter; labelKey: string }[] = [
  { value: "recent", labelKey: "records_filter_recent" },
  { value: "oldest", labelKey: "records_filter_oldest" },
  { value: "week", labelKey: "records_filter_this_week" },
  { value: "month", labelKey: "records_filter_this_month" },
  { value: "year", labelKey: "records_filter_this_year" },
];

function inDateRange(date: Date, filter: DateFilter): boolean {
  const now = new Date();
  if (filter === "recent" || filter === "oldest") return true;
  if (filter === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return date >= start && date <= now;
  }
  if (filter === "month") {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }
  return date.getFullYear() === now.getFullYear();
}

export default function RecordsPage() {
  const { firebaseUser } = useAuth();
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const [entries, setEntries] = useState<GratitudeEntry[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<DateFilter>("recent");
  const [selectedEmotions, setSelectedEmotions] = useState<EmotionTag[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState<OpenMenu>(null);
  const [showAll, setShowAll] = useState(false);

  // Support ?tab=received and ?highlight=entryId from other pages
  const initialTab = searchParams.get("tab") === "received" ? "received" : "total";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const highlightId = searchParams.get("highlight");
  const [highlightActive, setHighlightActive] = useState<string | null>(highlightId);
  const highlightRef = useRef<HTMLDivElement>(null);
  // Expanded grouped sections
  const [expandedTargets, setExpandedTargets] = useState<Set<string>>(new Set());

  function getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return t("time_just_now");
    if (diffMin < 60) return t("time_minutes_ago", { count: diffMin });
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return t("time_hours_ago", { count: diffHour });
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return t("time_days_ago", { count: diffDay });
    return date.toLocaleDateString("ko-KR");
  }

  // Highlight scroll + auto-dismiss
  useEffect(() => {
    if (!highlightActive) return;
    // Scroll into view after render
    const timer = setTimeout(() => {
      highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
    // Fade out highlight after 2s
    const fadeTimer = setTimeout(() => setHighlightActive(null), 2500);
    return () => { clearTimeout(timer); clearTimeout(fadeTimer); };
  }, [highlightActive]);

  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    Promise.all([
      api.gratitude.getEntries(uid),
      api.targets.getTargets(uid),
    ])
      .then(([allEntries, targetList]) => {
        setEntries(allEntries);
        setTargets(targetList);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [firebaseUser]);

  const targetNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const tgt of targets) map[tgt.id] = tgt.name;
    return map;
  }, [targets]);

  const friendOptions = useMemo(() => {
    return targets.map((tgt) => ({ id: tgt.id, name: tgt.name }));
  }, [targets]);

  // Filter + sort entries
  const filteredEntries = useMemo(() => {
    let list = entries.slice();

    list = list.filter((e) => {
      const d = e.createdAt?.toDate ? e.createdAt.toDate() : new Date(e.createdAt as unknown as string);
      return inDateRange(d, dateFilter);
    });

    if (selectedEmotions.length > 0) {
      list = list.filter((e) =>
        e.emotionTags.some((tag) => selectedEmotions.includes(tag))
      );
    }

    if (selectedFriends.length > 0) {
      list = list.filter((e) => e.targetId && selectedFriends.includes(e.targetId));
    }

    list.sort((a, b) => {
      const da = (a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt as unknown as string)).getTime();
      const db = (b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt as unknown as string)).getTime();
      return dateFilter === "oldest" ? da - db : db - da;
    });

    return list;
  }, [entries, dateFilter, selectedEmotions, selectedFriends]);

  // Compute emotion ratios with all 8 emotions
  const emotionRatios = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;
    for (const entry of filteredEntries) {
      for (const tag of entry.emotionTags) {
        counts[tag] = (counts[tag] ?? 0) + 1;
        total++;
      }
    }
    return ALL_EMOTIONS.map((emotion) => ({
      emotion,
      label: t(EMOTION_KEYS[emotion] ?? emotion),
      count: counts[emotion] ?? 0,
      percentage: total > 0 ? Math.round(((counts[emotion] ?? 0) / total) * 100) : 0,
      color: EMOTION_COLORS[emotion] ?? "#ccc",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredEntries, t]);

  const topEmotion = useMemo(() => {
    const sorted = emotionRatios.filter((r) => r.count > 0).sort((a, b) => b.count - a.count);
    return sorted[0] ?? null;
  }, [emotionRatios]);

  const totalSent = entries.length;

  // Build conic gradient for donut
  const conicGradient = useMemo(() => {
    const nonZero = emotionRatios.filter((r) => r.percentage > 0);
    if (nonZero.length === 0) return `conic-gradient(var(--muted) 0% 100%)`;
    let acc = 0;
    const stops: string[] = [];
    for (const r of nonZero) {
      stops.push(`${r.color} ${acc}% ${acc + r.percentage}%`);
      acc += r.percentage;
    }
    if (acc < 100) stops.push(`var(--muted) ${acc}% 100%`);
    return `conic-gradient(${stops.join(", ")})`;
  }, [emotionRatios]);

  const lettersList = useMemo(() => {
    return filteredEntries.map((entry) => {
      const d = entry.createdAt?.toDate
        ? entry.createdAt.toDate()
        : new Date(entry.createdAt as unknown as string);
      return {
        id: entry.id,
        targetId: entry.targetId ?? "_self",
        name: entry.targetId ? (targetNames[entry.targetId] ?? t("common_unknown")) : t("common_to_self"),
        title: entry.title ?? "",
        preview: entry.content.slice(0, 60) + (entry.content.length > 60 ? "..." : ""),
        timeAgo: getRelativeTime(d),
        tag: entry.emotionTags[0] ? t(EMOTION_KEYS[entry.emotionTags[0]] ?? entry.emotionTags[0]) : "",
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredEntries, targetNames, t]);

  // Group letters by target for grouped view
  const groupedLetters = useMemo(() => {
    const groups: { targetId: string; name: string; count: number; letters: typeof lettersList }[] = [];
    const map = new Map<string, typeof lettersList>();
    for (const letter of lettersList) {
      const key = letter.targetId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(letter);
    }
    for (const [targetId, letters] of map) {
      groups.push({
        targetId,
        name: letters[0].name,
        count: letters.length,
        letters,
      });
    }
    // Sort groups by most recent letter
    groups.sort((a, b) => {
      // Group with highlighted entry goes first if present
      if (highlightActive) {
        const aHas = a.letters.some((l) => l.id === highlightActive);
        const bHas = b.letters.some((l) => l.id === highlightActive);
        if (aHas && !bHas) return -1;
        if (bHas && !aHas) return 1;
      }
      return b.count - a.count;
    });
    return groups;
  }, [lettersList, highlightActive]);

  // Auto-expand group containing highlighted entry
  useEffect(() => {
    if (!highlightActive) return;
    for (const group of groupedLetters) {
      if (group.letters.some((l) => l.id === highlightActive)) {
        setExpandedTargets((prev) => new Set(prev).add(group.targetId));
        break;
      }
    }
  }, [highlightActive, groupedLetters]);

  const toggleTargetExpand = useCallback((targetId: string) => {
    setExpandedTargets((prev) => {
      const next = new Set(prev);
      if (next.has(targetId)) next.delete(targetId);
      else next.add(targetId);
      return next;
    });
  }, []);

  const displayedLetters = showAll ? lettersList : lettersList.slice(0, 3);

  function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: t("records_share_title"),
        text: t("records_share_text", { count: totalSent }),
        url: window.location.href,
      }).catch(() => {});
    } else {
      toast.success(t("records_toast_share_copied"));
    }
  }

  function toggleEmotion(emotion: EmotionTag) {
    setSelectedEmotions((prev) =>
      prev.includes(emotion) ? prev.filter((e) => e !== emotion) : [...prev, emotion]
    );
  }

  function toggleFriend(targetId: string) {
    setSelectedFriends((prev) =>
      prev.includes(targetId) ? prev.filter((id) => id !== targetId) : [...prev, targetId]
    );
  }

  const dateLabelCurrent = (() => {
    const found = DATE_FILTER_KEYS.find((o) => o.value === dateFilter);
    return found ? t(found.labelKey) : t("records_filter_recent");
  })();
  const emotionLabel = selectedEmotions.length === 0
    ? t("common_all")
    : t("records_filter_emotion_count", { count: selectedEmotions.length });
  const friendLabel = selectedFriends.length === 0
    ? t("common_all")
    : t("records_filter_friend_count", { count: selectedFriends.length });

  // Emotion Donut component (reused in sent/received tabs)
  function EmotionDonut() {
    return (
      <section className="mt-7">
        <h3 className="font-serif text-[32px] font-bold leading-none text-[#1f2a3d]">{t("records_emotion_ratio")}</h3>
        <div className="mt-3 rounded-[34px] border border-[#ece8ea] bg-[#f2f2f3] p-4">
          <div className="flex items-start gap-5">
            {/* Donut */}
            <div className="relative h-28 w-28 shrink-0 rounded-full p-[10px]" style={{ background: conicGradient }}>
              <div className="flex h-full w-full items-center justify-center rounded-full bg-[#f2f2f3]">
                <div className="text-center">
                  <span className="font-serif text-[20px] font-bold text-[#1f2a3d]">
                    {topEmotion ? `${topEmotion.percentage}%` : "0%"}
                  </span>
                  <p className="text-[10px] font-semibold tracking-wide text-[#8d99ac]">
                    {topEmotion?.label ?? t("emotion_gratitude")}
                  </p>
                </div>
              </div>
            </div>
            {/* Legend */}
            <div className="flex-1 space-y-1.5">
              {emotionRatios.map((item) => (
                <div key={item.emotion} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[13px] text-[#56667f]">{item.label}</span>
                  </div>
                  <span className="text-[13px] font-semibold text-[#1f2a3d]">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Single letter card component with highlight support
  function LetterCard({ letter }: { letter: (typeof lettersList)[number] }) {
    const isHighlighted = highlightActive === letter.id;
    return (
      <Link href={`/records/${letter.id}`}>
        <div
          ref={isHighlighted ? highlightRef : undefined}
          className={cn(
            "flex gap-3 rounded-[28px] border px-4 py-3.5 transition-all duration-700",
            isHighlighted
              ? "border-[#efb8c2] bg-[#fff3f6] shadow-[0_0_0_3px_rgba(239,184,194,0.3)] animate-pulse"
              : "border-[#ece8ea] bg-card hover:bg-muted/30"
          )}
        >
          <Avatar className="h-11 w-11 shrink-0">
            <AvatarFallback className="bg-[#edd1b5] font-serif text-base text-white">
              {letter.name[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <p className="truncate font-serif text-[17px] font-bold leading-none text-[#243244]">
                {letter.name}
              </p>
              {letter.title && (
                <p className="truncate text-[14px] text-foreground/70">{letter.title}</p>
              )}
            </div>
            <p className="mt-1.5 truncate text-[13px] leading-[1.5] text-muted-foreground">
              {letter.preview}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
            <span className="text-[12px] text-muted-foreground">
              {letter.timeAgo}
            </span>
            {letter.tag && (
              <span className="rounded-full bg-[#f7efe6] px-2.5 py-0.5 text-[10px] font-semibold text-[#7386a4]">
                {letter.tag}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Letters list — timeline view
  function LettersList({ letters, emptyText }: { letters: typeof lettersList; emptyText: string }) {
    return letters.length > 0 ? (
      <div className="space-y-4">
        {letters.map((letter) => (
          <LetterCard key={letter.id} letter={letter} />
        ))}
      </div>
    ) : (
      <p className="py-8 text-center text-sm text-[#8d99ac]">{emptyText}</p>
    );
  }

  // Letters list — grouped by target
  function GroupedLettersList({ emptyText }: { emptyText: string }) {
    if (groupedLetters.length === 0) {
      return <p className="py-8 text-center text-sm text-[#8d99ac]">{emptyText}</p>;
    }
    return (
      <div className="space-y-4">
        {groupedLetters.map((group) => {
          const isExpanded = expandedTargets.has(group.targetId);
          return (
            <div key={group.targetId} className="rounded-[30px] border border-[#ece8ea] bg-[#f2f2f3] overflow-hidden">
              {/* Group header */}
              <button
                type="button"
                onClick={() => toggleTargetExpand(group.targetId)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#eeeced]"
              >
                <Avatar className="h-11 w-11">
                  <AvatarFallback className="bg-[#edd1b5] font-serif text-lg text-white">
                    {group.name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-serif text-[18px] font-bold leading-none text-[#243244]">
                    {group.name}
                  </p>
                  <p className="mt-1.5 text-[13px] text-[#8d99ac]">
                    {t("records_group_count", { count: group.count })}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 shrink-0 text-[#c6ceda] transition-transform duration-200",
                    isExpanded && "rotate-180"
                  )}
                />
              </button>

              {/* Expanded letters */}
              {isExpanded && (
                <div className="space-y-2 px-3 pb-3">
                  {group.letters.map((letter) => (
                    <Link key={letter.id} href={`/records/${letter.id}`}>
                      <div
                        ref={highlightActive === letter.id ? highlightRef : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-[22px] border px-3 py-2.5 transition-all duration-700",
                          highlightActive === letter.id
                            ? "border-[#efb8c2] bg-[#fff3f6] shadow-[0_0_0_3px_rgba(239,184,194,0.3)] animate-pulse"
                            : "border-[#e8e5e7] bg-white hover:bg-[#faf8f9]"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <p className="truncate text-[15px] font-semibold text-[#243244]">
                              {letter.preview}
                            </p>
                            <span className="ml-2 shrink-0 text-[10px] text-[#a6b0bf]">
                              {letter.timeAgo}
                            </span>
                          </div>
                          {letter.tag && (
                            <p className="mt-1 text-[12px] text-[#93a3bf]">{letter.tag}</p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-[#c6ceda]" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Close menus overlay */}
      {menuOpen && (
        <button
          type="button"
          aria-label={t("common_close")}
          onClick={() => setMenuOpen(null)}
          className="fixed inset-0 z-20 bg-transparent"
        />
      )}

      {/* Header — centered serif title, from reference colors */}
      <header className="screen-safe-top sticky top-0 z-10 grid grid-cols-[40px_1fr_40px] items-center bg-background/80 px-4 py-4 backdrop-blur-md">
        <div />
        <h1 className="text-center font-serif text-[26px] font-bold leading-none text-[#1f2a3d]">{t("records_title")}</h1>
        <Button variant="ghost" size="icon" className="rounded-full" onClick={handleShare}>
          <Share2 className="h-5 w-5 text-[#69798f]" strokeWidth={1.5} />
        </Button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="px-4 pb-8">
          {/* Tabs — from reference style */}
          <div className="mb-4 flex border-b border-[#f1d7dc] text-center text-[14px] font-semibold text-[#8d99ac]">
            {([
              { key: "total" as TabKey, labelKey: "records_tab_total" },
              { key: "sent" as TabKey, labelKey: "records_tab_sent" },
              { key: "received" as TabKey, labelKey: "records_tab_received" },
            ]).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "w-1/3 pb-2 transition-colors",
                  activeTab === tab.key
                    ? "border-b-2 border-[#efb8c2] text-[#1f2a3d]"
                    : ""
                )}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>

          {/* ── Total Tab ── */}
          {activeTab === "total" && (
            <div className="space-y-6">
              {/* Stats Cards — from reference exact colors */}
              <div className="grid grid-cols-2 gap-3">
                <article className="rounded-[36px] border border-[#ece8ea] bg-[#f2f2f3] p-4">
                  <p className="text-[16px] font-semibold text-[#8d99ac]">{t("records_stats_sent")}</p>
                  <p className="mt-1 font-serif text-[40px] font-bold leading-none text-[#1f2a3d]">{totalSent}</p>
                </article>
                <article className="rounded-[36px] border border-[#ece8ea] bg-[#f2f2f3] p-4">
                  <p className="text-[16px] font-semibold text-[#8d99ac]">{t("records_stats_received")}</p>
                  <p className="mt-1 font-serif text-[40px] font-bold leading-none text-[#1f2a3d]">0</p>
                </article>
              </div>

              {/* NOTE: Emotion ratio removed from total tab, shown in sent/received tabs only */}

              {/* Filter Chips — from reference style */}
              <div className="relative flex gap-2 overflow-visible">
                {/* Date */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => (v === "date" ? null : "date"))}
                    className={cn(
                      "rounded-full px-4 py-2 text-[13px] font-semibold transition-colors",
                      dateFilter !== "recent" || menuOpen === "date"
                        ? "bg-[#efb8c2] text-[#354257]"
                        : "bg-[#f2f2f3] text-[#56667f]"
                    )}
                  >
                    {t("records_filter_date", { value: dateLabelCurrent })}
                  </button>
                  {menuOpen === "date" && (
                    <div className="absolute bottom-full z-30 mb-2 w-40 rounded-2xl border border-[#f1d6de] bg-white p-2 shadow-[0_10px_20px_rgba(66,41,49,0.15)]">
                      {DATE_FILTER_KEYS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { setDateFilter(opt.value); setMenuOpen(null); }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px]",
                            dateFilter === opt.value ? "bg-[#fff3f6] text-[#2f3f57]" : "text-[#60718a]"
                          )}
                        >
                          {t(opt.labelKey)}
                          {dateFilter === opt.value && <Check className="h-4 w-4 text-[#efb8c2]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Emotion */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => (v === "emotion" ? null : "emotion"))}
                    className={cn(
                      "rounded-full px-4 py-2 text-[13px] font-semibold transition-colors",
                      selectedEmotions.length > 0 || menuOpen === "emotion"
                        ? "bg-[#efb8c2] text-[#354257]"
                        : "bg-[#f2f2f3] text-[#56667f]"
                    )}
                  >
                    {t("records_filter_emotion", { value: emotionLabel })}
                  </button>
                  {menuOpen === "emotion" && (
                    <div className="absolute bottom-full z-30 mb-2 w-44 rounded-2xl border border-[#f1d6de] bg-white p-2 shadow-[0_10px_20px_rgba(66,41,49,0.15)]">
                      <button
                        type="button"
                        onClick={() => setSelectedEmotions([])}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px]",
                          selectedEmotions.length === 0 ? "bg-[#fff3f6] text-[#2f3f57]" : "text-[#60718a]"
                        )}
                      >
                        {t("common_all")}
                        {selectedEmotions.length === 0 && <Check className="h-4 w-4 text-[#efb8c2]" />}
                      </button>
                      {ALL_EMOTIONS.map((emotion) => (
                        <button
                          key={emotion}
                          type="button"
                          onClick={() => toggleEmotion(emotion)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px]",
                            selectedEmotions.includes(emotion) ? "bg-[#fff3f6] text-[#2f3f57]" : "text-[#60718a]"
                          )}
                        >
                          {t(EMOTION_KEYS[emotion] ?? emotion)}
                          {selectedEmotions.includes(emotion) && <Check className="h-4 w-4 text-[#efb8c2]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Friend */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => (v === "friend" ? null : "friend"))}
                    className={cn(
                      "rounded-full px-4 py-2 text-[13px] font-semibold transition-colors",
                      selectedFriends.length > 0 || menuOpen === "friend"
                        ? "bg-[#efb8c2] text-[#354257]"
                        : "bg-[#f2f2f3] text-[#56667f]"
                    )}
                  >
                    {t("records_filter_friend", { value: friendLabel })}
                  </button>
                  {menuOpen === "friend" && (
                    <div className="absolute bottom-full right-0 z-30 mb-2 w-48 rounded-2xl border border-[#f1d6de] bg-white p-2 shadow-[0_10px_20px_rgba(66,41,49,0.15)]">
                      <button
                        type="button"
                        onClick={() => setSelectedFriends([])}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px]",
                          selectedFriends.length === 0 ? "bg-[#fff3f6] text-[#2f3f57]" : "text-[#60718a]"
                        )}
                      >
                        {t("common_all")}
                        {selectedFriends.length === 0 && <Check className="h-4 w-4 text-[#efb8c2]" />}
                      </button>
                      {friendOptions.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => toggleFriend(f.id)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px]",
                            selectedFriends.includes(f.id) ? "bg-[#fff3f6] text-[#2f3f57]" : "text-[#60718a]"
                          )}
                        >
                          {f.name}
                          {selectedFriends.includes(f.id) && <Check className="h-4 w-4 text-[#efb8c2]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* View mode toggle + Letters */}
              <section>
                <div className="mb-4 flex items-end justify-between">
                  <h3 className="font-serif text-[28px] font-bold leading-none text-[#1f2a3d]">
                    {viewMode === "grouped" ? t("records_heading_by_target") : t("records_heading_recent")}
                  </h3>
                  <div className="flex items-center gap-1">
                    {/* View toggle */}
                    <div className="mr-2 flex rounded-full border border-[#ece8ea] bg-white p-0.5">
                      <button
                        type="button"
                        onClick={() => setViewMode("timeline")}
                        className={cn(
                          "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                          viewMode === "timeline"
                            ? "bg-[#efb8c2] text-[#354257]"
                            : "text-[#8d99ac]"
                        )}
                      >
                        <Clock className="h-3 w-3" />
                        {t("records_view_timeline")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("grouped")}
                        className={cn(
                          "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                          viewMode === "grouped"
                            ? "bg-[#efb8c2] text-[#354257]"
                            : "text-[#8d99ac]"
                        )}
                      >
                        <Users className="h-3 w-3" />
                        {t("records_view_grouped")}
                      </button>
                    </div>
                    {viewMode === "timeline" && lettersList.length > 3 && (
                      <button
                        type="button"
                        onClick={() => setShowAll(!showAll)}
                        className="text-[14px] font-semibold text-[#efb8c2]"
                      >
                        {showAll ? t("records_collapse") : t("records_view_all")}
                      </button>
                    )}
                  </div>
                </div>

                {viewMode === "timeline" ? (
                  <LettersList
                    letters={displayedLetters}
                    emptyText={
                      selectedEmotions.length > 0 || selectedFriends.length > 0
                        ? t("records_empty_filtered")
                        : t("records_empty_none")
                    }
                  />
                ) : (
                  <GroupedLettersList
                    emptyText={
                      selectedEmotions.length > 0 || selectedFriends.length > 0
                        ? t("records_empty_filtered")
                        : t("records_empty_none")
                    }
                  />
                )}
              </section>
            </div>
          )}

          {/* ── Sent Tab ── */}
          {activeTab === "sent" && (
            <div className="space-y-6">
              {/* Stats */}
              <article className="rounded-[36px] border border-[#ece8ea] bg-[#f2f2f3] p-4">
                <p className="text-[16px] font-semibold text-[#8d99ac]">{t("records_stats_sent")}</p>
                <p className="mt-1 font-serif text-[40px] font-bold leading-none text-[#1f2a3d]">{totalSent}</p>
              </article>

              {/* Emotion ratio in sent tab */}
              <EmotionDonut />

              {/* Letters */}
              <section>
                <div className="mb-4 flex items-end justify-between">
                  <h3 className="font-serif text-[28px] font-bold leading-none text-[#1f2a3d]">{t("records_heading_sent_list")}</h3>
                  <div className="flex rounded-full border border-[#ece8ea] bg-white p-0.5">
                    <button
                      type="button"
                      onClick={() => setViewMode("timeline")}
                      className={cn(
                        "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                        viewMode === "timeline"
                          ? "bg-[#efb8c2] text-[#354257]"
                          : "text-[#8d99ac]"
                      )}
                    >
                      <Clock className="h-3 w-3" />
                      {t("records_view_timeline")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("grouped")}
                      className={cn(
                        "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                        viewMode === "grouped"
                          ? "bg-[#efb8c2] text-[#354257]"
                          : "text-[#8d99ac]"
                      )}
                    >
                      <Users className="h-3 w-3" />
                      {t("records_view_grouped")}
                    </button>
                  </div>
                </div>
                {viewMode === "timeline" ? (
                  <LettersList letters={lettersList} emptyText={t("records_empty_no_sent")} />
                ) : (
                  <GroupedLettersList emptyText={t("records_empty_no_sent")} />
                )}
              </section>
            </div>
          )}

          {/* ── Received Tab ── */}
          {activeTab === "received" && (
            <div className="space-y-6">
              <article className="rounded-[36px] border border-[#ece8ea] bg-[#f2f2f3] p-4">
                <p className="text-[16px] font-semibold text-[#8d99ac]">{t("records_stats_received")}</p>
                <p className="mt-1 font-serif text-[40px] font-bold leading-none text-[#1f2a3d]">0</p>
              </article>

              {/* Emotion ratio placeholder for received tab */}
              <section className="mt-7">
                <h3 className="font-serif text-[32px] font-bold leading-none text-[#1f2a3d]">{t("records_emotion_ratio")}</h3>
                <p className="mt-3 text-sm text-[#8d99ac]">
                  {t("records_empty_no_received")}
                </p>
              </section>

              <section>
                <h3 className="mb-4 font-serif text-[28px] font-bold leading-none text-[#1f2a3d]">{t("records_heading_received_list")}</h3>
                <p className="py-8 text-center text-sm text-[#8d99ac]">
                  {t("records_empty_no_received")}
                </p>
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
