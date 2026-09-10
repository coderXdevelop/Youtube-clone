import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats subscriber count accurately in YouTube format
 * e.g. 0 -> "0 subscribers", 1 -> "1 subscriber", 1250 -> "1.2K subscribers", 1500000 -> "1.5M subscribers"
 */
export function formatSubscriberCount(count: number | undefined | null): string {
  const num = Number(count);
  if (!num || isNaN(num) || num <= 0) {
    return "0 subscribers";
  }
  if (num === 1) {
    return "1 subscriber";
  }
  if (num < 1000) {
    return `${num.toLocaleString()} subscribers`;
  }
  if (num < 1000000) {
    const k = num / 1000;
    const formatted = (num % 1000 === 0 || num >= 10000) ? Math.floor(k).toString() : k.toFixed(1);
    return `${formatted}K subscribers`;
  }
  const m = num / 1000000;
  const formatted = (num % 1000000 === 0 || num >= 10000000) ? Math.floor(m).toString() : m.toFixed(1);
  return `${formatted}M subscribers`;
}
