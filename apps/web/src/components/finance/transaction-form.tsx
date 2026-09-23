"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { useCategories } from "@/hooks/use-categories";
import { useAccounts } from "@/hooks/use-accounts";
import { useCreateTransaction, TransactionInput } from "@/hooks/use-transactions";
import { PAYMENT_METHOD_BY_ACCOUNT_TYPE } from "@/lib/accounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: "CASH", label: "Efectivo" },
  { value: "DEBIT", label: "Débito" },
  { value: "CREDIT", label: "Crédito" },
  { value: "TRANSFER", label: "Transferencia" },
  { value: "YAPE", label: "Yape" },
  { value: "PLIN", label: "Plin" },
  { value: "OTHER", label: "Otro" },
];

const schema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: z
    .string()
    .regex(/^\d{1,12}(\.\d{1,2})?$/, "Monto inválido."),
  categoryId: z.string().uuid("Selecciona una categoría."),
  accountId: z.union([z.string().uuid(), z.literal("")]).optional(),
  transactionDate: z.string().min(1, "Selecciona una fecha."),
  paymentMethod: z.string(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function TransactionForm({ onSuccess }: { onSuccess: () => void }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "EXPENSE",
      paymentMethod: "CASH",
      transactionDate: new Date().toISOString().slice(0, 10),
    },
  });

  const type = watch("type");
  const accountId = watch("accountId");
  const { data: categories } = useCategories(type);
  const { data: allAccounts } = useAccounts();
  const createTransaction = useCreateTransaction();

  // A credit card can't receive "income" (paying it off is its own action
  // in Cuentas, not a regular transaction) — so it's never offered here.
  const accounts = allAccounts?.filter((a) => type !== "INCOME" || a.type !== "CREDIT");
  const selectedAccount = accounts?.find((a) => a.id === accountId);

  useEffect(() => {
    setValue("categoryId", "");
  }, [type, setValue]);

  useEffect(() => {
    // Switching to Ingreso can invalidate a previously-selected credit card.
    if (accountId && !accounts?.some((a) => a.id === accountId)) {
      setValue("accountId", "");
    }
  }, [type, accountId, accounts, setValue]);

  async function onSubmit(values: FormValues) {
    await createTransaction.mutateAsync({
      ...values,
      accountId: values.accountId || undefined,
    } as TransactionInput);
    onSuccess();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setValue("type", "EXPENSE")}
          className={`h-10 rounded-lg border text-sm font-medium ${
            type === "EXPENSE"
              ? "border-danger bg-danger/10 text-danger"
              : "border-border text-muted-foreground"
          }`}
        >
          Gasto
        </button>
        <button
          type="button"
          onClick={() => setValue("type", "INCOME")}
          className={`h-10 rounded-lg border text-sm font-medium ${
            type === "INCOME"
              ? "border-success bg-success/10 text-success"
              : "border-border text-muted-foreground"
          }`}
        >
          Ingreso
        </button>
      </div>

      <div>
        <Label htmlFor="amount">Monto</Label>
        <Input
          id="amount"
          inputMode="decimal"
          placeholder="0.00"
          {...register("amount")}
          error={errors.amount?.message}
        />
      </div>

      <div>
        <Label htmlFor="categoryId">Categoría</Label>
        <Select id="categoryId" {...register("categoryId")}>
          <option value="">Selecciona…</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        {errors.categoryId && (
          <p className="mt-1 text-xs text-danger">{errors.categoryId.message}</p>
        )}
      </div>

      {accounts && accounts.length > 0 && (
        <div>
          <Label htmlFor="accountId">Cuenta (opcional)</Label>
          <Select id="accountId" {...register("accountId")}>
            <option value="">Sin cuenta específica</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.bank && a.bank !== a.name ? ` · ${a.bank}` : ""}
              </option>
            ))}
          </Select>
          {type === "INCOME" && (
            <p className="mt-1 text-xs text-muted-foreground">
              Las tarjetas de crédito no reciben ingresos.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="transactionDate">Fecha</Label>
          <Input
            id="transactionDate"
            type="date"
            {...register("transactionDate")}
            error={errors.transactionDate?.message}
          />
        </div>
        {selectedAccount ? (
          <div>
            <Label>Método de pago</Label>
            <div className="flex h-10 items-center rounded-lg border border-border bg-muted px-3 text-sm text-muted-foreground">
              {PAYMENT_METHOD_BY_ACCOUNT_TYPE[selectedAccount.type]} · {selectedAccount.name}
            </div>
          </div>
        ) : (
          <div>
            <Label htmlFor="paymentMethod">Método de pago</Label>
            <Select id="paymentMethod" {...register("paymentMethod")}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="description">Descripción</Label>
        <Input id="description" {...register("description")} />
      </div>

      <div>
        <Label htmlFor="notes">Notas</Label>
        <Input id="notes" {...register("notes")} />
      </div>

      {createTransaction.isError && (
        <p className="text-sm text-danger">
          No se pudo guardar el movimiento. Intenta nuevamente.
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Guardando…" : "Guardar movimiento"}
      </Button>
    </form>
  );
}
