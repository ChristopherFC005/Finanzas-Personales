import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(
  amount: number | string,
  currency = "PEN",
  locale = "es-PE",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount));
}

export function formatDate(date: string | Date, locale = "es-PE"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

// Calendar-only fields (billingDate, paymentDueDate, targetDate, loan due
// dates, a transaction's picked date) travel as a "YYYY-MM-DD" and are
// stored/serialized as UTC midnight — formatting them with the viewer's
// local timezone can shift the displayed day backward for any negative UTC
// offset (e.g. Peru, UTC-5). Force UTC so the calendar day the user picked
// is always the day shown, everywhere. Never use this for a real instant
// (createdAt, paidAt, lastLoginAt) — those should show in local time.
export function formatDateOnly(date: string | Date, locale = "es-PE"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

// "Today" as the viewer's LOCAL calendar date in "YYYY-MM-DD" — not
// `toISOString().slice(0, 10)`, which is UTC and can already read as
// tomorrow in the evening for negative UTC offsets (e.g. Peru).
export function todayLocalISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatPercent(value: number, locale = "es-PE"): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}
