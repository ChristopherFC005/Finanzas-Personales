"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { AlertTriangle, PiggyBank, Plus, Trash2 } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCategories } from "@/hooks/use-categories";
import { Budget, BudgetInput, useBudgets, useCreateBudget, useDeleteBudget } from "@/hooks/use-budgets";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatMoney, formatPercent } from "@/lib/utils";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function BudgetsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [open, setOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const currency = user?.preferences?.currency ?? "PEN";
  const { data: budgets, isLoading } = useBudgets(month, year);
  const { data: expenseCategories } = useCategories("EXPENSE");
  const createBudget = useCreateBudget();
  const deleteBudget = useDeleteBudget();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BudgetInput>();

  const budgetedCategoryIds = new Set((budgets ?? []).map((b) => b.categoryId));
  const availableCategories = (expenseCategories ?? []).filter(
    (c) => !budgetedCategoryIds.has(c.id),
  );

  async function onSubmit(values: BudgetInput) {
    await createBudget.mutateAsync({ ...values, month, year, alertPercentage: 80 });
    reset();
    setOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Presupuestos</h1>
          <p className="text-sm text-muted-foreground">Cuánto planeas gastar por categoría cada mes.</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(month)} onChange={(e) => setMonth(Number(e.target.value))} className="w-36">
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </Select>
          <Select value={String(year)} onChange={(e) => setYear(Number(e.target.value))} className="w-24">
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuevo
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : !budgets || budgets.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="Sin presupuestos este mes"
          description="Define cuánto quieres gastar en cada categoría y te avisamos cuando te estés acercando al límite."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" />
              Crear el primero
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => (
            <BudgetCard key={budget.id} budget={budget} currency={currency} onDelete={() => deleteBudget.mutate(budget.id)} />
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo presupuesto">
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <Label htmlFor="categoryId">Categoría</Label>
            <Select id="categoryId" {...register("categoryId", { required: true })}>
              <option value="">Selecciona…</option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            {errors.categoryId && (
              <p className="mt-1 text-xs text-danger">Selecciona una categoría.</p>
            )}
            {availableCategories.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Ya tienes un presupuesto para todas tus categorías de gasto este mes.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="amount">Monto mensual</Label>
            <Input
              id="amount"
              inputMode="decimal"
              placeholder="0.00"
              {...register("amount", { required: true, pattern: /^\d{1,12}(\.\d{1,2})?$/ })}
            />
          </div>

          {createBudget.isError && (
            <p className="text-sm text-danger">No se pudo crear el presupuesto. Revisa los datos.</p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting || availableCategories.length === 0}>
            Guardar presupuesto
          </Button>
        </form>
      </Modal>
    </div>
  );
}

function BudgetCard({ budget, currency, onDelete }: { budget: Budget; currency: string; onDelete: () => void }) {
  const pct = Math.min(100, Math.round(budget.percentageUsed * 100));

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-foreground">{budget.category.name}</p>
          <p className="text-xs text-muted-foreground">
            {formatMoney(budget.spent, currency)} de {formatMoney(budget.amount, currency)}
          </p>
        </div>
        <button
          onClick={onDelete}
          className="text-muted-foreground hover:text-danger"
          aria-label="Eliminar presupuesto"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              budget.isOverLimit ? "bg-danger" : budget.isNearLimit ? "bg-warning" : "bg-primary",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{formatPercent(budget.percentageUsed)} usado</p>
      </div>

      {(budget.isOverLimit || budget.isNearLimit) && (
        <p
          className={cn(
            "mt-3 flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium",
            budget.isOverLimit ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning",
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {budget.isOverLimit
            ? "Superaste el presupuesto de este mes."
            : `Ya usaste más del ${budget.alertPercentage}% del presupuesto.`}
        </p>
      )}
    </Card>
  );
}
