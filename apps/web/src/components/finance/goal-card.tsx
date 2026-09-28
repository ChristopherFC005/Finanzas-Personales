"use client";

import { useState } from "react";
import { Check, Copy, Minus, Plus, Share2, Trash2, Users } from "lucide-react";
import { Goal, useCreateGoalInvite, useDepositGoal, useWithdrawGoal } from "@/hooks/use-goals";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn, formatDateOnly, formatMoney } from "@/lib/utils";

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
  const [frequency, setFrequency] = useState<"MONTHLY" | "BIWEEKLY">("MONTHLY");
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const deposit = useDepositGoal();
  const withdraw = useWithdrawGoal();
  const createInvite = useCreateGoalInvite();

  async function handleShare() {
    setShareOpen(true);
    createInvite.mutate(goal.id);
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked (permissions, insecure context) —
      // the link is still shown selectable in the box either way.
    }
  }

  const percentage = Math.min(
    100,
    Math.round((Number(goal.currentAmount) / Number(goal.targetAmount)) * 100),
  );

  // Suggests how much to add per period to land on the target date — purely
  // a read-only projection from what's already stored (targetAmount,
  // currentAmount, targetDate), nothing persisted server-side.
  const suggestedContribution = (() => {
    if (goal.status !== "ACTIVE" || !goal.targetDate) return null;
    const remaining = Number(goal.targetAmount) - Number(goal.currentAmount);
    if (remaining <= 0) return null;

    // Both sides compared as UTC midnight of a calendar day — targetDate
    // already arrives that way from the API (`@db.Date`), and today's local
    // calendar date is re-expressed as UTC midnight so the day-diff isn't
    // skewed by the viewer's timezone offset (see formatDateOnly).
    const now = new Date();
    const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const daysLeft = Math.ceil((new Date(goal.targetDate).getTime() - todayUTC) / 86_400_000);
    if (daysLeft <= 0) return null;

    const periodDays = frequency === "MONTHLY" ? 30 : 15;
    const periods = Math.max(1, Math.ceil(daysLeft / periodDays));
    return remaining / periods;
  })();

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
              Meta: {formatDateOnly(goal.targetDate)}
            </p>
          )}
          {goal.collaborators.length > 0 && (
            <p className="mt-1 flex items-center gap-1 text-xs text-accent">
              <Users className="h-3 w-3" />
              Compartida con {goal.collaborators.map((c) => c.user.firstName).join(", ")}
            </p>
          )}
          {!goal.isOwner && (
            <p className="mt-1 text-xs text-muted-foreground">Colaboras en esta meta</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {goal.isOwner && (
            <button
              onClick={handleShare}
              className="text-muted-foreground hover:text-accent"
              aria-label="Compartir meta"
              title="Compartir meta"
            >
              <Share2 className="h-4 w-4" />
            </button>
          )}
          {goal.isOwner && (
            <button onClick={onDelete} className="text-muted-foreground hover:text-danger">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {shareOpen && (
        <div className="mt-3 rounded-lg bg-muted p-2.5">
          {createInvite.isPending ? (
            <p className="text-xs text-muted-foreground">Generando link…</p>
          ) : createInvite.isError ? (
            <p className="text-xs text-danger">No se pudo generar el link. Intenta de nuevo.</p>
          ) : createInvite.data ? (
            <>
              <p className="text-xs text-muted-foreground">
                Comparte este link con la persona que quieres invitar (necesita cuenta en Cyfra):
              </p>
              <div className="mt-1.5 flex gap-1.5">
                <Input readOnly value={createInvite.data.url} className="h-8 text-xs" />
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 shrink-0"
                  onClick={() => copyLink(createInvite.data!.url)}
                  title="Copiar link"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </>
          ) : null}
          <button
            onClick={() => setShareOpen(false)}
            className="mt-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            Cerrar
          </button>
        </div>
      )}

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

      {suggestedContribution !== null && (
        <div className="mt-3 rounded-lg bg-muted p-2.5">
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setFrequency("MONTHLY")}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium",
                frequency === "MONTHLY"
                  ? "bg-primary text-white"
                  : "bg-background text-muted-foreground",
              )}
            >
              Mensual
            </button>
            <button
              type="button"
              onClick={() => setFrequency("BIWEEKLY")}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium",
                frequency === "BIWEEKLY"
                  ? "bg-primary text-white"
                  : "bg-background text-muted-foreground",
              )}
            >
              Quincenal
            </button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Aporta{" "}
            <span className="font-semibold text-foreground">
              {formatMoney(suggestedContribution, currency)}
            </span>{" "}
            {frequency === "MONTHLY" ? "al mes" : "cada quincena"} para llegar a tiempo.
          </p>
        </div>
      )}

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
