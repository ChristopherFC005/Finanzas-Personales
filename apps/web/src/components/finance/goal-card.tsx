"use client";

import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Goal, useDepositGoal, useWithdrawGoal } from "@/hooks/use-goals";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn, formatDate, formatMoney } from "@/lib/utils";

export function GoalCard({
  goal,
  currency,
  onDelete,
}: {
  goal: Goal;
  currency: string;
  onDelete: () => void;
}) {
  const [amount, setAmount] = useState("");
  const deposit = useDepositGoal();
  const withdraw = useWithdrawGoal();

  const percentage = Math.min(
    100,
    Math.round((Number(goal.currentAmount) / Number(goal.targetAmount)) * 100),
  );

  function handleDeposit() {
    if (!amount) return;
    deposit.mutate({ id: goal.id, amount }, { onSuccess: () => setAmount("") });
  }

  function handleWithdraw() {
    if (!amount) return;
    withdraw.mutate({ id: goal.id, amount }, { onSuccess: () => setAmount("") });
  }

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-foreground">{goal.name}</p>
          {goal.targetDate && (
            <p className="text-xs text-muted-foreground">
              Meta: {formatDate(goal.targetDate)}
            </p>
          )}
        </div>
        <button onClick={onDelete} className="text-muted-foreground hover:text-danger">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold text-foreground">
            {formatMoney(goal.currentAmount, currency)}
          </span>
          <span className="text-muted-foreground">
            de {formatMoney(goal.targetAmount, currency)}
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full bg-primary transition-all",
              goal.status === "COMPLETED" && "bg-success",
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{percentage}% completado</p>
      </div>

      {goal.status === "ACTIVE" && (
        <div className="mt-4 flex gap-2">
          <Input
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <Button size="icon" variant="outline" onClick={handleDeposit} title="Aportar">
            <Plus className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="outline" onClick={handleWithdraw} title="Retirar">
            <Minus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {(deposit.isError || withdraw.isError) && (
        <p className="mt-2 text-xs text-danger">
          No se pudo procesar el movimiento. Verifica el monto.
        </p>
      )}
    </Card>
  );
}
