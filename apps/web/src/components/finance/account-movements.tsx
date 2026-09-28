"use client";

import {
  ArrowDownCircle,
  ArrowUpCircle,
  CreditCard,
  HandCoins,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Account, AccountMovement, AccountMovementKind, useAccountMovements } from "@/hooks/use-accounts";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate, formatDateOnly, formatMoney } from "@/lib/utils";

const KIND_CONFIG: Record<
  AccountMovementKind,
  { icon: typeof TrendingUp; inflow: boolean; iconTone: string; dateOnly: boolean }
> = {
  // Transactions are picked from a plain date input (no time-of-day), so
  // they're formatted as a calendar date (see formatDateOnly); card
  // payments and loan events are real timestamps generated server-side.
  INCOME: { icon: TrendingUp, inflow: true, iconTone: "bg-success/15 text-success", dateOnly: true },
  EXPENSE: { icon: TrendingDown, inflow: false, iconTone: "bg-danger/15 text-danger", dateOnly: true },
  CARD_PAYMENT: { icon: CreditCard, inflow: true, iconTone: "bg-success/15 text-success", dateOnly: false },
  CARD_PAYMENT_OUT: { icon: ArrowUpCircle, inflow: false, iconTone: "bg-danger/15 text-danger", dateOnly: false },
  LOAN_OUT: { icon: HandCoins, inflow: false, iconTone: "bg-accent/15 text-accent", dateOnly: false },
  LOAN_PAYMENT_IN: { icon: ArrowDownCircle, inflow: true, iconTone: "bg-success/15 text-success", dateOnly: false },
};

function MovementRow({ movement, currency }: { movement: AccountMovement; currency: string }) {
  const config = KIND_CONFIG[movement.kind];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3">
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", config.iconTone)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{movement.label}</p>
        <p className="text-xs text-muted-foreground">
          {config.dateOnly ? formatDateOnly(movement.date) : formatDate(movement.date)}
          {movement.description ? ` · ${movement.description}` : ""}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 text-sm font-semibold",
          config.inflow ? "text-success" : "text-danger",
        )}
      >
        {config.inflow ? "+" : "-"}
        {formatMoney(movement.amount, currency)}
      </span>
    </div>
  );
}

export function AccountMovementsModal({
  account,
  currency,
  onClose,
}: {
  account: Account | null;
  currency: string;
  onClose: () => void;
}) {
  const { data: movements, isLoading } = useAccountMovements(account?.id ?? null);

  return (
    <Modal open={!!account} onClose={onClose} title={account ? `Movimientos · ${account.name}` : "Movimientos"}>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : !movements || movements.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Todavía no hay movimientos en esta cuenta.
        </p>
      ) : (
        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {movements.map((m) => (
            <MovementRow key={`${m.kind}-${m.id}`} movement={m} currency={currency} />
          ))}
        </div>
      )}
    </Modal>
  );
}
