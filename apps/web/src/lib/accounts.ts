import { CreditCard, Landmark, PiggyBank, Wallet, type LucideIcon } from "lucide-react";
import type { AccountType } from "@/hooks/use-accounts";
import { hexToHsl, hslToHex } from "@/lib/color";

export const PERU_BANKS = [
  "BCP",
  "Interbank",
  "BBVA",
  "Scotiabank",
  "Banco de la Nación",
  "Banco Pichincha",
  "Banco Falabella",
  "Banco Ripley",
  "Mibanco",
  "Otro",
];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CASH: "Efectivo",
  DEBIT: "Débito",
  CREDIT: "Crédito",
  SAVINGS: "Ahorros",
  OTHER: "Otro",
};

export const ACCOUNT_TYPE_ICONS: Record<AccountType, LucideIcon> = {
  CASH: Wallet,
  DEBIT: CreditCard,
  CREDIT: CreditCard,
  SAVINGS: PiggyBank,
  OTHER: Landmark,
};

// Mirrors the backend's PAYMENT_METHOD_BY_ACCOUNT_TYPE — picking a card
// locks the payment method to that card, it's never a separate choice.
export const PAYMENT_METHOD_BY_ACCOUNT_TYPE: Record<AccountType, string> = {
  CASH: "Efectivo",
  DEBIT: "Débito",
  CREDIT: "Crédito",
  SAVINGS: "Débito",
  OTHER: "Otro",
};

export interface MetallicPreset {
  name: string;
  hex: string;
  /** Light text reads poorly on pale metals (plata, platino, oro rosa claro). */
  darkText?: boolean;
}

export const METALLIC_PRESETS: MetallicPreset[] = [
  { name: "Oro", hex: "#C9A227" },
  { name: "Oro rosa", hex: "#B76E79" },
  { name: "Plata", hex: "#9CA3AF", darkText: true },
  { name: "Platino", hex: "#B7C0C7", darkText: true },
  { name: "Grafito", hex: "#4B5563" },
  { name: "Negro mate", hex: "#1F2023" },
  { name: "Bronce", hex: "#8C5A3C" },
  { name: "Azul acero", hex: "#3B5A7A" },
];

/**
 * A brushed-metal look built from ONE stored hex: a diagonal sweep across
 * darker → base → lighter → base stops (HSL lightness only, same hue) reads
 * as a metallic sheen without needing to store a whole gradient string —
 * the DB/API still only ever see a single hex color.
 */
export function metallicGradient(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  const dark = hslToHex({ h, s: Math.min(100, s * 0.9), l: Math.max(0, l - 18) });
  const light = hslToHex({ h, s: Math.max(0, s * 0.7), l: Math.min(100, l + 16) });
  return `linear-gradient(135deg, ${dark} 0%, ${hex} 30%, ${light} 50%, ${hex} 70%, ${dark} 100%)`;
}
