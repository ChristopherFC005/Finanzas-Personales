import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn, formatMoney, formatPercent } from "@/lib/utils";

export function StatCard({
  label,
  amount,
  currency,
  icon: Icon,
  changeRatio,
  tone = "default",
}: {
  label: string;
  amount: number;
  currency: string;
  icon: LucideIcon;
  changeRatio?: number | null;
  tone?: "default" | "success" | "danger";
}) {
  const positive = (changeRatio ?? 0) >= 0;

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p
            className={cn(
              "mt-2 text-2xl font-semibold tracking-tight",
              tone === "success" && "text-success",
              tone === "danger" && "text-danger",
            )}
          >
            {formatMoney(amount, currency)}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-muted text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {changeRatio !== undefined && changeRatio !== null && (
        <div
          className={cn(
            "mt-3 inline-flex items-center gap-1 text-xs font-medium",
            positive ? "text-success" : "text-danger",
          )}
        >
          {positive ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" />
          )}
          {formatPercent(Math.abs(changeRatio))} vs. periodo anterior
        </div>
      )}
    </Card>
  );
}
