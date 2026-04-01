import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatLoss(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(2)}B`;
  }
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

export function formatLossArabic(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(2)} مليار$`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(2)} مليون$`;
  }
  if (amount >= 1_000) {
    return `${(amount / 1_000).toFixed(1)} ألف$`;
  }
  return `$${amount.toLocaleString("ar-EG")}`;
}

export function formatDateArabic(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "اليوم";
  if (diffDays === 1) return "أمس";
  if (diffDays < 7) return `قبل ${diffDays} أيام`;
  if (diffDays < 30) return `قبل ${Math.floor(diffDays / 7)} أسابيع`;
  if (diffDays < 365) return `قبل ${Math.floor(diffDays / 30)} أشهر`;
  return `قبل ${Math.floor(diffDays / 365)} سنوات`;
}

export const categoryInfo: Record<string, { labelAr: string; labelEn: string; emoji: string; colorClass: string }> = {
  ai: { labelAr: "ذكاء اصطناعي", labelEn: "AI", emoji: "🤖", colorClass: "badge-ai" },
  crypto: { labelAr: "كريبتو", labelEn: "Crypto", emoji: "💰", colorClass: "badge-crypto" },
  iot: { labelAr: "إنترنت الأشياء", labelEn: "IoT", emoji: "📡", colorClass: "badge-iot" },
};

export const severityInfo: Record<string, { labelAr: string; colorClass: string; emoji: string }> = {
  low: { labelAr: "منخفض", colorClass: "severity-low", emoji: "🟢" },
  medium: { labelAr: "متوسط", colorClass: "severity-medium", emoji: "🟡" },
  high: { labelAr: "مرتفع", colorClass: "severity-high", emoji: "🟠" },
  critical: { labelAr: "حرج", colorClass: "severity-critical", emoji: "🔴" },
};
