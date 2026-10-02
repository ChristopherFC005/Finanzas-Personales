"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Banknote, CheckCircle2, Pause, Play, Plus, Trash2 } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCategories } from "@/hooks/use-categories";
import { useAccounts } from "@/hooks/use-accounts";
import {
  FixedIncome,
  FixedIncomeInput,
  useCreateFixedIncome,
  useDeleteFixedIncome,
  useFixedIncomes,
  useUpdateFixedIncome,
} from "@/hooks/use-fixed-incomes";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatDateOnly, formatMoney } from "@/lib/utils";

export default function FixedIncomesPage() {
  const [open, setOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const currency = user?.preferences?.currency ?? "PEN";
  const { data: incomes, isLoading } = useFixedIncomes();
  const { data: incomeCategories } = useCategories("INCOME");
  const { data: accounts } = useAccounts();
  const nonCreditAccounts = (accounts ?? []).filter((a) => a.type !== "CREDIT");
  const createFixedIncome = useCreateFixedIncome();
  const toggleFixedIncome = useUpdateFixedIncome();
  const deleteFixedIncome = useDeleteFixedIncome();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FixedIncomeInput>();

  const active = incomes?.filter((i) => i.isActive) ?? [];
  const paused = incomes?.filter((i) => !i.isActive) ?? [];
  const monthlyTotal = active.reduce((sum, i) => sum + Number(i.amount), 0);

  async function onSubmit(values: FixedIncomeInput) {
    await createFixedIncome.mutateAsync({ ...values, dayOfMonth: Number(values.dayOfMonth) });
    reset();
    setOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Ingresos fijos</h1>
          <p className="text-sm text-muted-foreground">
            Al mes: <span className="gradient-text font-semibold">{formatMoney(monthlyTotal, currency)}</span>
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Nuevo ingreso fijo
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : !incomes || incomes.length === 0 ? (
        <EmptyState
          icon={Banknote}
          title="Sin ingresos fijos registrados"
          description="Anota tu sueldo, ingresos de tu negocio u otro ingreso recurrente, y a qué cuenta debe llegar cada mes."
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
              {active.map((income) => (
                <FixedIncomeCard
                  key={income.id}
                  income={income}
                  currency={currency}
                  onTogglePause={() => toggleFixedIncome.mutate({ id: income.id, isActive: false })}
                  onDelete={() => deleteFixedIncome.mutate(income.id)}
                />
              ))}
            </div>
          )}
          {paused.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Pausados</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {paused.map((income) => (
                  <FixedIncomeCard
                    key={income.id}
                    income={income}
                    currency={currency}
                    onTogglePause={() => toggleFixedIncome.mutate({ id: income.id, isActive: true })}
                    onDelete={() => deleteFixedIncome.mutate(income.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo ingreso fijo">
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <Label htmlFor="name">¿Qué ingreso es?</Label>
            <Input
              id="name"
              placeholder="Ej. Sueldo, Ventas del negocio…"
              {...register("name", { required: true })}
              error={errors.name ? "Requerido" : undefined}
            />
          </div>

          <div>
            <Label htmlFor="categoryId">Tipo</Label>
            <Select id="categoryId" {...register("categoryId", { required: true })}>
              <option value="">Selecciona…</option>
              {incomeCategories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {errors.categoryId && <p className="mt-1 text-xs text-danger">Selecciona un tipo.</p>}
          </div>

          <div>
            <Label htmlFor="accountId">¿A qué cuenta o tarjeta entra el dinero?</Label>
            <Select id="accountId" {...register("accountId", { required: true })}>
              <option value="">Selecciona…</option>
              {nonCreditAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.bank && a.bank !== a.name ? ` · ${a.bank}` : ""}
                </option>
              ))}
            </Select>
            {errors.accountId && <p className="mt-1 text-xs text-danger">Selecciona una cuenta.</p>}
            <p className="mt-1 text-xs text-muted-foreground">
              Las tarjetas de crédito no pueden recibir ingresos.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="amount">Monto</Label>
              <Input
                id="amount"
                inputMode="decimal"
                placeholder="0.00"
                {...register("amount", { required: true, pattern: /^\d{1,12}(\.\d{1,2})?$/ })}
              />
            </div>
            <div>
              <Label htmlFor="dayOfMonth">Día del mes</Label>
              <Input
                id="dayOfMonth"
                type="number"
                min={1}
                max={31}
                placeholder="1-31"
                {...register("dayOfMonth", { required: true, min: 1, max: 31 })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Input id="notes" {...register("notes")} />
          </div>

          {createFixedIncome.isError && (
            <p className="text-sm text-danger">No se pudo crear el ingreso fijo. Revisa los datos.</p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            Guardar ingreso fijo
          </Button>
        </form>
      </Modal>
    </div>
  );
}

function FixedIncomeCard({
  income,
  currency,
  onTogglePause,
  onDelete,
}: {
  income: FixedIncome;
  currency: string;
  onTogglePause: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className={cn(!income.isActive && "opacity-60")}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full gradient-brand text-white">
            <Banknote className="h-4 w-4" />
          </span>
          <div>
            <p className="font-medium text-foreground">{income.name}</p>
            <p className="text-xs text-muted-foreground">
              {income.category.name} · entra a {income.account.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onTogglePause}
            className="text-muted-foreground hover:text-foreground"
            aria-label={income.isActive ? "Pausar" : "Reactivar"}
            title={income.isActive ? "Pausar" : "Reactivar"}
          >
            {income.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            onClick={onDelete}
            className="text-muted-foreground hover:text-danger"
            aria-label="Eliminar ingreso fijo"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xl font-semibold text-foreground">{formatMoney(income.amount, currency)}</p>
        <p className="text-xs text-muted-foreground">Cada mes, el día {income.dayOfMonth}</p>
      </div>

      <div className="mt-3 text-xs">
        {!income.isActive ? (
          <span className="text-muted-foreground">Pausado — no se generará automáticamente.</span>
        ) : income.receivedThisMonth ? (
          <span className="flex items-center gap-1 text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Recibido este mes
          </span>
        ) : (
          <span className="text-muted-foreground">Próximo: {formatDateOnly(income.nextOccurrence)}</span>
        )}
      </div>
    </Card>
  );
}
