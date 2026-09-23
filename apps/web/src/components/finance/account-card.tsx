"use client";

import { useState } from "react";
import { CreditCard, Pencil, Trash2 } from "lucide-react";
import { Account, useDeleteAccount, usePayCreditCard } from "@/hooks/use-accounts";
import { ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_LABELS, metallicGradient } from "@/lib/accounts";
import { hexToHsl } from "@/lib/color";
import { cn, formatMoney } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export function AccountCard({
  account,
  currency,
  onEdit,
}: {
  account: Account;
  currency: string;
  onEdit: () => void;
}) {
  const [payOpen, setPayOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [isInstallment, setIsInstallment] = useState(false);
  const deleteAccount = useDeleteAccount();
  const payCreditCard = usePayCreditCard();

  const Icon = ACCOUNT_TYPE_ICONS[account.type];
  const isCredit = account.type === "CREDIT";
  const creditLimit = account.creditLimit ? Number(account.creditLimit) : null;
  const usedPercent =
    isCredit && creditLimit && creditLimit > 0
      ? Math.min(100, Math.round(((creditLimit - (account.availableCredit ?? 0)) / creditLimit) * 100))
      : null;

  // Pale metals (plata, platino) need dark text to stay readable — decide
  // from the actual stored color's lightness rather than a fixed preset list,
  // so it also works for whatever hex a preset maps to.
  const useDarkText = account.color ? hexToHsl(account.color).l > 70 : false;
  const textTone = useDarkText ? "text-slate-900" : "text-white";
  const mutedTextTone = useDarkText ? "text-slate-900/70" : "text-white/70";

  function handlePay() {
    if (!amount) return;
    payCreditCard.mutate(
      { id: account.id, amount, isInstallment },
      {
        onSuccess: () => {
          setAmount("");
          setIsInstallment(false);
          setPayOpen(false);
        },
      },
    );
  }

  return (
    <div
      className={cn(
        "relative flex min-h-44 flex-col justify-between overflow-hidden rounded-2xl p-5 shadow-glow",
        textTone,
        !account.color && "gradient-brand text-white",
      )}
      style={account.color ? { background: metallicGradient(account.color) } : undefined}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full blur-xl",
          useDarkText ? "bg-black/10" : "bg-white/10",
        )}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className={cn("text-xs font-medium uppercase tracking-wide", mutedTextTone)}>
            {account.bank && account.bank !== account.name
              ? account.bank
              : ACCOUNT_TYPE_LABELS[account.type]}
          </p>
          <p className="font-display text-lg font-semibold">{account.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Icon className={cn("h-6 w-6", mutedTextTone)} />
          <button
            onClick={onEdit}
            className={cn(
              "rounded-lg p-1 hover:bg-black/10",
              useDarkText ? "text-slate-900/60 hover:text-slate-900" : "text-white/60 hover:text-white",
            )}
            aria-label="Editar cuenta"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => deleteAccount.mutate(account.id)}
            className={cn(
              "rounded-lg p-1 hover:bg-black/10",
              useDarkText ? "text-slate-900/60 hover:text-slate-900" : "text-white/60 hover:text-white",
            )}
            aria-label="Eliminar cuenta"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative">
        <p className={cn("text-xs", mutedTextTone)}>{isCredit ? "Deuda actual" : "Saldo actual"}</p>
        <p className="font-display text-2xl font-bold">
          {formatMoney(Math.abs(account.currentBalance), currency)}
          {isCredit && account.currentBalance < 0 && (
            <span className={cn("ml-1 text-sm font-normal", mutedTextTone)}>por pagar</span>
          )}
        </p>
        {isCredit && creditLimit && (
          <div className="mt-2">
            <div className={cn("h-1.5 w-full overflow-hidden rounded-full", useDarkText ? "bg-black/15" : "bg-white/20")}>
              <div
                className={cn("h-full rounded-full", useDarkText ? "bg-slate-900" : "bg-white")}
                style={{ width: `${usedPercent}%` }}
              />
            </div>
            <p className={cn("mt-1 text-[11px]", mutedTextTone)}>
              Disponible: {formatMoney(account.availableCredit ?? 0, currency)} de{" "}
              {formatMoney(creditLimit, currency)}
            </p>
          </div>
        )}

        {isCredit && !payOpen && (
          <button
            onClick={() => setPayOpen(true)}
            className={cn(
              "mt-3 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium",
              useDarkText ? "bg-black/10 hover:bg-black/15" : "bg-white/15 hover:bg-white/25",
            )}
          >
            <CreditCard className="h-3.5 w-3.5" />
            Pagar tarjeta
          </button>
        )}

        {isCredit && payOpen && (
          <div className="mt-3 space-y-2 rounded-lg bg-black/10 p-2.5">
            <Input
              inputMode="decimal"
              placeholder="Monto a pagar"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-8 border-none bg-white/90 text-xs text-slate-900 placeholder:text-slate-500"
            />
            <label className={cn("flex items-center gap-1.5 text-[11px]", mutedTextTone)}>
              <input
                type="checkbox"
                checked={isInstallment}
                onChange={(e) => setIsInstallment(e.target.checked)}
              />
              Es un pago a cuotas (no libera línea de crédito)
            </label>
            <div className="flex gap-2">
              <button
                onClick={handlePay}
                disabled={payCreditCard.isPending}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-xs font-semibold",
                  useDarkText ? "bg-slate-900 text-white" : "bg-white text-slate-900",
                )}
              >
                Confirmar pago
              </button>
              <button
                onClick={() => setPayOpen(false)}
                className={cn("rounded-lg px-2 py-1.5 text-xs", mutedTextTone)}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
