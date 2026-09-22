import { CreditCard, Landmark, PiggyBank, Wallet, type LucideIcon } from "lucide-react";
import type { AccountType } from "@/hooks/use-accounts";

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
