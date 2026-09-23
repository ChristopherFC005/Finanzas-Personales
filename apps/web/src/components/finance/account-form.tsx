"use client";

import { useForm } from "react-hook-form";
import {
  Account,
  AccountInput,
  AccountType,
  useCreateAccount,
  useUpdateAccount,
} from "@/hooks/use-accounts";
import { PERU_BANKS, ACCOUNT_TYPE_LABELS, METALLIC_PRESETS, metallicGradient } from "@/lib/accounts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const ACCOUNT_TYPES: AccountType[] = ["CASH", "DEBIT", "CREDIT", "SAVINGS", "OTHER"];

interface FormValues {
  name: string;
  type: AccountType;
  bank?: string;
  initialBalance?: string;
  availableNow?: string;
  creditLimit?: string;
  color?: string;
}

export function AccountForm({
  account,
  onSuccess,
}: {
  account?: Account;
  onSuccess: () => void;
}) {
  const isEdit = !!account;
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const mutation = isEdit ? updateAccount : createAccount;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: account
      ? {
          name: account.name,
          type: account.type,
          bank: account.bank ?? "",
          initialBalance: account.initialBalance,
          availableNow:
            account.type === "CREDIT" ? String(account.availableCredit ?? 0) : undefined,
          creditLimit: account.creditLimit ?? undefined,
          color: account.color ?? undefined,
        }
      : { type: "DEBIT", initialBalance: "0" },
  });

  const type = watch("type");
  const color = watch("color");

  async function onSubmit(values: FormValues) {
    let initialBalance = values.initialBalance || "0";

    if (values.type === "CREDIT") {
      const creditLimit = Number(values.creditLimit || 0);
      const availableNow = Number(values.availableNow ?? creditLimit);
      if (isEdit && account) {
        // Recalibrate: keep whatever already happened on this account (its
        // movements since creation) and reset the anchor so TODAY's balance
        // matches what the user just typed, instead of blindly overwriting
        // initialBalance and silently discarding transaction history.
        const netMovements = account.currentBalance - Number(account.initialBalance);
        initialBalance = String(availableNow - creditLimit - netMovements);
      } else {
        initialBalance = String(availableNow - creditLimit);
      }
    }

    const payload: AccountInput = {
      name: values.name,
      type: values.type,
      bank: values.bank || undefined,
      initialBalance,
      creditLimit: values.type === "CREDIT" ? values.creditLimit : undefined,
      color: values.color || undefined,
    };

    if (isEdit && account) {
      await updateAccount.mutateAsync({ id: account.id, input: payload });
    } else {
      await createAccount.mutateAsync(payload);
      reset({ type: "DEBIT", initialBalance: "0" });
    }
    onSuccess();
  }

  return (
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

      {type === "CREDIT" ? (
        <>
          <div>
            <Label htmlFor="creditLimit">Línea de crédito</Label>
            <Input
              id="creditLimit"
              inputMode="decimal"
              placeholder="0.00"
              {...register("creditLimit", { pattern: /^\d{1,12}(\.\d{1,2})?$/ })}
            />
          </div>
          <div>
            <Label htmlFor="availableNow">
              Disponible ahora mismo{" "}
              <span className="font-normal text-muted-foreground">
                (lo que te queda por gastar de esa línea)
              </span>
            </Label>
            <Input
              id="availableNow"
              inputMode="decimal"
              placeholder="0.00"
              {...register("availableNow", { pattern: /^\d{1,12}(\.\d{1,2})?$/ })}
            />
          </div>
        </>
      ) : (
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
      )}

      <div>
        <Label>Color de la tarjeta</Label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setValue("color", undefined)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full border-2 text-[10px] text-muted-foreground gradient-brand",
              !color ? "border-foreground" : "border-transparent",
            )}
            title="Predeterminado"
          >
            {!color && "✓"}
          </button>
          {METALLIC_PRESETS.map((preset) => (
            <button
              key={preset.hex}
              type="button"
              title={preset.name}
              onClick={() => setValue("color", preset.hex)}
              className={cn(
                "h-9 w-9 rounded-full border-2 transition-transform hover:scale-105",
                color === preset.hex ? "border-foreground" : "border-transparent",
              )}
              style={{ background: metallicGradient(preset.hex) }}
            />
          ))}
        </div>
      </div>

      {mutation.isError && (
        <p className="text-sm text-danger">No se pudo guardar la cuenta. Intenta nuevamente.</p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isEdit ? "Guardar cambios" : "Guardar cuenta"}
      </Button>
    </form>
  );
}
