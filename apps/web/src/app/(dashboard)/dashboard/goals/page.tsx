"use client";

import { useState } from "react";
import { Plus, Target } from "lucide-react";
import { useForm } from "react-hook-form";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCreateGoal, useDeleteGoal, useGoals, GoalInput } from "@/hooks/use-goals";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { GoalCard } from "@/components/finance/goal-card";

export default function GoalsPage() {
  const [open, setOpen] = useState(false);
  const { data: user } = useCurrentUser();
  const currency = user?.preferences?.currency ?? "PEN";
  const { data: goals, isLoading } = useGoals();
  const createGoal = useCreateGoal();
  const deleteGoal = useDeleteGoal();

  const { register, handleSubmit, reset, formState: { isSubmitting } } =
    useForm<GoalInput>();

  async function onSubmit(values: GoalInput) {
    await createGoal.mutateAsync(values);
    reset();
    setOpen(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Metas</h1>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Nueva meta
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : !goals || goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Aún no tienes metas"
          description="Crea una meta de ahorro y empieza a aportar."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              currency={currency}
              onDelete={() => deleteGoal.mutate(g.id)}
            />
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nueva meta">
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" placeholder="Ej. Viaje a Cusco" {...register("name", { required: true })} />
          </div>
          <div>
            <Label htmlFor="description">Descripción</Label>
            <Input id="description" {...register("description")} />
          </div>
          <div>
            <Label htmlFor="targetAmount">Monto objetivo</Label>
            <Input
              id="targetAmount"
              inputMode="decimal"
              placeholder="0.00"
              {...register("targetAmount", { required: true })}
            />
          </div>
          <div>
            <Label htmlFor="targetDate">Fecha objetivo</Label>
            <Input id="targetDate" type="date" {...register("targetDate")} />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            Crear meta
          </Button>
        </form>
      </Modal>
    </div>
  );
}
