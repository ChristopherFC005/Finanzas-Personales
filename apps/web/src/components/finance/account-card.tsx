"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Account, useDeleteAccount } from "@/hooks/use-accounts";
import { ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_LABELS } from "@/lib/accounts";
import { cn, formatMoney } from "@/lib/utils";

export function AccountCard({
  account,
  currency,
  onEdit,
}: {
  account: Account;
  currency: string;
  onEdit: () => void;
}) {
  const deleteAccount = useDeleteAccount();
  const Icon = ACCOUNT_TYPE_ICONS[account.type];
  const isCredit = account.type === "CREDIT";
  const creditLimit = account.creditLimit ? Number(account.creditLimit) : null;
  const usedPercent =
    isCredit && creditLimit && creditLimit > 0
      ? Math.min(100, Math.round(((creditLimit - (account.availableCredit ?? 0)) / creditLimit) * 100))
      : null;

  return (
    <div
      className={cn(
        "relative flex min-h-44 flex-col justify-between overflow-hidden rounded-2xl p-5 text-white shadow-glow",
        "gradient-brand",
      )}
      style={
        account.color
          ? { background: `linear-gradient(135deg, ${account.color}, var(--accent))` }
          : undefined
      }
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10 blur-xl"
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-white/70">
            {account.bank || ACCOUNT_TYPE_LABELS[account.type]}
          </p>
          <p className="font-display text-lg font-semibold">{account.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Icon className="h-6 w-6 text-white/80" />
          <button
            onClick={onEdit}
            className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Editar cuenta"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => deleteAccount.mutate(account.id)}
            className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Eliminar cuenta"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative">
        <p className="text-xs text-white/70">
          {isCredit ? "Deuda actual" : "Saldo actual"}
        </p>
        <p className="font-display text-2xl font-bold">
          {formatMoney(Math.abs(account.currentBalance), currency)}
          {isCredit && account.currentBalance < 0 && (
            <span className="ml-1 text-sm font-normal text-white/70">por pagar</span>
          )}
        </p>
        {isCredit && creditLimit && (
          <div className="mt-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${usedPercent}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-white/70">
              Disponible: {formatMoney(account.availableCredit ?? 0, currency)} de{" "}
              {formatMoney(creditLimit, currency)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
