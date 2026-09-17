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

export function formatPercent(value: number, locale = "es-PE"): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}
