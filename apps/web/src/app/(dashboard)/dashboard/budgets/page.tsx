"use client";

import { useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { useForm } from "react-hook-form";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCategories } from "@/hooks/use-categories";
import { useBudgets, useCreateBudget, useDeleteBudget, BudgetInput } from "@/hooks/use-budgets";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { BudgetProgress } from "@/components/finance/budget-progress";

export default function BudgetsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [open, setOpen] = useState(false);

  const { data: user } = useCurrentUser();
  const currency = user?.preferences?.currency ?? "PEN";
  const { data: budgets, isLoading } = useBudgets(month, year);
  const { data: categories } = useCategories("EXPENSE");
  const createBudget = useCreateBudget();
  const deleteBudget = useDeleteBudget();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<{ categoryId: string; amount: string; alertPercentage: number }>({
      defaultValues: { alertPercentage: 80 },
    });

  async function onSubmit(values: { categoryId: string; amount: string; alertPercentage: number }) {
    const input: BudgetInput = { ...values, month, year };
    try {
      await createBudget.mutateAsync(input);
      reset();
      setOpen(false);
    } catch {
      // surfaced via createBudget.isError below
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Presupuestos</h1>
        <div className="flex items-center gap-2">
          <Select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-32">
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i + 1}>
                {new Date(2000, i).toLocaleDateString("es-PE", { month: "long" })}
              </option>
            ))}
          </Select>
          <Select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-28">
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
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
          icon={Wallet}
          title="No hay presupuestos este periodo"
          description="Crea un presupuesto por categoría para controlar tus gastos."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((b) => (
            <BudgetProgress
              key={b.id}
              budget={b}
              currency={currency}
              onDelete={() => deleteBudget.mutate(b.id)}
            />
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo presupuesto">
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <Label htmlFor="categoryId">Categoría</Label>
            <Select id="categoryId" {...register("categoryId", { required: true })}>
              <option value="">Selecciona…</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
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
            <Label htmlFor="alertPercentage">Alertar al (%)</Label>
            <Input
              id="alertPercentage"
              type="number"
              min={1}
              max={100}
              {...register("alertPercentage", { valueAsNumber: true })}
            />
          </div>
          {createBudget.isError && (
            <p className="text-sm text-danger">
              Ya existe un presupuesto para esta categoría en este periodo.
            </p>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            Guardar presupuesto
          </Button>
        </form>
      </Modal>
    </div>
  );
}
