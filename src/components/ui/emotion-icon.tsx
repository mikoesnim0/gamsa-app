import type { EmotionTag } from "@/types";

interface EmotionIconProps {
  emotion: EmotionTag;
  className?: string;
}

export function EmotionIcon({ emotion, className = "h-4 w-4" }: EmotionIconProps) {
  switch (emotion) {
    case "gratitude":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M12 21c-4.5-2.8-7-5.5-7-8.4A3.6 3.6 0 0 1 8.6 9c1.4 0 2.6.7 3.4 1.9A4 4 0 0 1 15.4 9a3.6 3.6 0 0 1 3.6 3.6c0 2.9-2.5 5.6-7 8.4Z" fill="currentColor" />
        </svg>
      );
    case "comfort":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="9.2" cy="10.3" r="1" fill="currentColor" />
          <circle cx="14.8" cy="10.3" r="1" fill="currentColor" />
          <path d="M8.5 14.2c1 .9 2.1 1.3 3.5 1.3s2.5-.4 3.5-1.3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "respect":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M12 3 5 6v5c0 4.2 2.7 7.9 7 10 4.3-2.1 7-5.8 7-10V6l-7-3Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="m9.2 12 2 2 3.6-3.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "love":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M12 20c-4-2.5-6.5-5-6.5-7.6A3.3 3.3 0 0 1 8.8 9c1.2 0 2.3.6 3.2 1.7A3.9 3.9 0 0 1 15.2 9a3.3 3.3 0 0 1 3.3 3.4C18.5 15 16 17.5 12 20Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "warmth":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M12 4c-2.8 2.1-5 4.9-5 8a5 5 0 0 0 10 0c0-3.1-2.2-5.9-5-8Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 7.5c1.4 1.5 2.4 3 2.4 4.5a2.4 2.4 0 1 1-4.8 0c0-1.5 1-3 2.4-4.5Z" fill="currentColor" />
        </svg>
      );
    case "joy":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="9" cy="10" r="1" fill="currentColor" />
          <circle cx="15" cy="10" r="1" fill="currentColor" />
          <path d="M8.4 13.8c1.1 1.2 2.2 1.8 3.6 1.8s2.5-.6 3.6-1.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "trust":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M12 3 5 6v5c0 4.2 2.7 7.9 7 10 4.3-2.1 7-5.8 7-10V6l-7-3Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="m9.2 12 1.8 1.9 3.8-3.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "hope":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M12 4.5 14.1 9l4.9.6-3.6 3.3.9 4.8-4.3-2.3-4.3 2.3.9-4.8-3.6-3.3 4.9-.6L12 4.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case "nostalgia":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="9.2" cy="10.3" r="1" fill="currentColor" />
          <circle cx="14.8" cy="10.3" r="1" fill="currentColor" />
          <path d="M9 15c.8-.6 1.8-1 3-1s2.2.4 3 1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}
