"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { HandCoins, Plus } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { LoanInput, LoanPaymentType, useCreateLoan, useLoans } from "@/hooks/use-loans";
import { useAccounts } from "@/hooks/use-accounts";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { LoanCard } from "@/components/finance/loan-card";
import { formatMoney } from "@/lib/utils";

export default function LoansPage() {
  const [open, setOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const currency = user?.preferences?.currency ?? "PEN";
  const { data: loans, isLoading } = useLoans();
  const { data: accounts } = useAccounts();
  const createLoan = useCreateLoan();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoanInput>({ defaultValues: { paymentType: "SINGLE" } });

  const paymentType = watch("paymentType");
  const active = loans?.filter((l) => l.status === "ACTIVE") ?? [];
  const paid = loans?.filter((l) => l.status !== "ACTIVE") ?? [];
  const totalOwed = active.reduce((sum, l) => sum + l.remaining, 0);

  async function onSubmit(values: LoanInput) {
    // React Hook Form keeps a hidden field's stale value in state after it
    // unmounts (e.g. switching tabs leaves dueDate: "" behind), so build the
    // payload explicitly instead of forwarding the raw form values — an
    // empty string for the *other* schedule type fails IsDateString/IsInt
    // on the backend even though the field isn't visible anymore.
    const payload: LoanInput = {
      borrowerName: values.borrowerName,
      totalAmount: values.totalAmount,
      paymentType: values.paymentType,
      accountId: values.accountId,
      notes: values.notes || undefined,
      ...(values.paymentType === "SINGLE"
        ? { dueDate: values.dueDate }
        : {
            installmentsCount: Number(values.installmentsCount),
            firstDueDate: values.firstDueDate,
          }),
    };
    await createLoan.mutateAsync(payload);
    reset({ paymentType: "SINGLE" });
    setOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Préstamos</h1>
          <p className="text-sm text-muted-foreground">
            Te deben: <span className="gradient-text font-semibold">{formatMoney(totalOwed, currency)}</span>
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Nuevo préstamo
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : !loans || loans.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="No tienes préstamos registrados"
          description="Anota a quién le prestaste dinero y cuándo te toca cobrarlo."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              Registrar el primero
            </Button>
          }
        />
      ) : (
        <>
          {active.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {active.map((l) => (
                <LoanCard key={l.id} loan={l} currency={currency} />
              ))}
            </div>
          )}
          {paid.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Finalizados</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {paid.map((l) => (
                  <LoanCard key={l.id} loan={l} currency={currency} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo préstamo">
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <Label htmlFor="borrowerName">¿A quién le prestaste?</Label>
            <Input
              id="borrowerName"
              placeholder="Ej. Juan Pérez"
              {...register("borrowerName", { required: true })}
              error={errors.borrowerName ? "Requerido" : undefined}
            />
          </div>

          <div>
            <Label htmlFor="totalAmount">Monto total</Label>
            <Input
              id="totalAmount"
              inputMode="decimal"
              placeholder="0.00"
              {...register("totalAmount", { required: true, pattern: /^\d{1,12}(\.\d{1,2})?$/ })}
            />
          </div>

          <div>
            <Label htmlFor="accountId">¿Desde qué cuenta o tarjeta sale el dinero?</Label>
            <Select id="accountId" {...register("accountId", { required: true })}>
              <option value="">Selecciona…</option>
              {accounts?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.bank && a.bank !== a.name ? ` · ${a.bank}` : ""}
                </option>
              ))}
            </Select>
            {errors.accountId && (
              <p className="mt-1 text-xs text-danger">Selecciona una cuenta.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setValue("paymentType", "SINGLE" as LoanPaymentType)}
              className={`h-10 rounded-lg border text-sm font-medium ${
                paymentType === "SINGLE"
                  ? "border-primary bg-primary-muted text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              Pago único
            </button>
            <button
              type="button"
              onClick={() => setValue("paymentType", "INSTALLMENTS" as LoanPaymentType)}
              className={`h-10 rounded-lg border text-sm font-medium ${
                paymentType === "INSTALLMENTS"
                  ? "border-primary bg-primary-muted text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              Varios meses
            </button>
          </div>

          {paymentType === "SINGLE" ? (
            <div>
              <Label htmlFor="dueDate">¿Cuándo te deben pagar?</Label>
              <Input id="dueDate" type="date" {...register("dueDate", { required: paymentType === "SINGLE" })} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="installmentsCount">Número de cuotas</Label>
                <Input
                  id="installmentsCount"
                  type="number"
                  min={1}
                  max={120}
                  {...register("installmentsCount", {
                    required: paymentType === "INSTALLMENTS",
                    valueAsNumber: true,
                  })}
                />
              </div>
              <div>
                <Label htmlFor="firstDueDate">Primer pago</Label>
                <Input
                  id="firstDueDate"
                  type="date"
                  {...register("firstDueDate", { required: paymentType === "INSTALLMENTS" })}
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Input id="notes" {...register("notes")} />
          </div>

          {createLoan.isError && (
            <p className="text-sm text-danger">No se pudo crear el préstamo. Revisa los datos.</p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            Guardar préstamo
          </Button>
        </form>
      </Modal>
    </div>
  );
}
