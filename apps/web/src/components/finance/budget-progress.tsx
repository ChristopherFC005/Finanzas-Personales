import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Budget } from "@/hooks/use-budgets";
import { Card } from "@/components/ui/card";
import { cn, formatMoney } from "@/lib/utils";

const STATUS_CONFIG = {
  NORMAL: { label: "Normal", icon: CheckCircle2, color: "text-success", bar: "bg-success" },
  WARNING: { label: "Advertencia", icon: AlertTriangle, color: "text-warning", bar: "bg-warning" },
  EXCEEDED: { label: "Superado", icon: XCircle, color: "text-danger", bar: "bg-danger" },
};

export function BudgetProgress({
  budget,
  currency,
  onDelete,
}: {
  budget: Budget;
  currency: string;
  onDelete: () => void;
}) {
  const config = STATUS_CONFIG[budget.status];
  const Icon = config.icon;

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-foreground">{budget.category.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatMoney(budget.spent, currency)} / {formatMoney(budget.amount, currency)}
          </p>
        </div>
        <button
          onClick={onDelete}
          className="text-xs text-muted-foreground hover:text-danger"
        >
          Eliminar
        </button>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", config.bar)}
          style={{ width: `${Math.min(100, budget.percentage)}%` }}
        />
      </div>

      <div className={cn("mt-2 flex items-center gap-1.5 text-xs font-medium", config.color)}>
        <Icon className="h-3.5 w-3.5" />
        {config.label} · {budget.percentage}%
      </div>
    </Card>
  );
}
