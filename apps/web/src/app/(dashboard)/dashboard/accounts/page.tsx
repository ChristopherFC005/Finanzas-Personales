"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Plus, Wallet } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { AccountInput, AccountType, useAccounts, useCreateAccount } from "@/hooks/use-accounts";
import { PERU_BANKS, ACCOUNT_TYPE_LABELS } from "@/lib/accounts";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AccountCard } from "@/components/finance/account-card";
import { formatMoney } from "@/lib/utils";

const ACCOUNT_TYPES: AccountType[] = ["CASH", "DEBIT", "CREDIT", "SAVINGS", "OTHER"];

export default function AccountsPage() {
  const [open, setOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const currency = user?.preferences?.currency ?? "PEN";
  const { data: accounts, isLoading } = useAccounts();
  const createAccount = useCreateAccount();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AccountInput>({ defaultValues: { type: "DEBIT", initialBalance: "0" } });

  const type = watch("type");
  const total = accounts?.reduce((sum, a) => sum + a.currentBalance, 0) ?? 0;

  async function onSubmit(values: AccountInput) {
    await createAccount.mutateAsync(values);
    reset({ type: "DEBIT", initialBalance: "0" });
    setOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Cuentas y tarjetas</h1>
          <p className="text-sm text-muted-foreground">
            Saldo total: <span className="gradient-text font-semibold">{formatMoney(total, currency)}</span>
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Nueva cuenta
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : !accounts || accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Aún no tienes cuentas registradas"
          description="Agrega tu efectivo, tarjeta de débito o crédito con el saldo con el que empiezas."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              Agregar mi primera cuenta
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => (
            <AccountCard key={a.id} account={a} currency={currency} />
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nueva cuenta">
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              placeholder="Ej. BCP Débito"
              {...register("name", { required: true })}
              error={errors.name ? "Requerido" : undefined}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="type">Tipo</Label>
              <Select id="type" {...register("type", { required: true })}>
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ACCOUNT_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="bank">Banco</Label>
              <Select id="bank" {...register("bank")}>
                <option value="">Sin banco</option>
                {PERU_BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="initialBalance">
              Saldo inicial{" "}
              <span className="font-normal text-muted-foreground">
                (con cuánto empiezas hoy)
              </span>
            </Label>
            <Input
              id="initialBalance"
              inputMode="decimal"
              placeholder="0.00"
              {...register("initialBalance", { pattern: /^-?\d{1,12}(\.\d{1,2})?$/ })}
            />
          </div>

          {type === "CREDIT" && (
            <div>
              <Label htmlFor="creditLimit">Línea de crédito</Label>
              <Input
                id="creditLimit"
                inputMode="decimal"
                placeholder="0.00"
                {...register("creditLimit", { pattern: /^\d{1,12}(\.\d{1,2})?$/ })}
              />
            </div>
          )}

          {createAccount.isError && (
            <p className="text-sm text-danger">No se pudo crear la cuenta. Intenta nuevamente.</p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            Guardar cuenta
          </Button>
        </form>
      </Modal>
    </div>
  );
}
