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
    <Card className="group relative overflow-hidden">
      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full gradient-brand opacity-10 blur-2xl transition-opacity group-hover:opacity-20" />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p
            className={cn(
              "mt-2 font-display text-3xl font-semibold tracking-tight",
              tone === "success" && "text-success",
              tone === "danger" && "text-danger",
              tone === "default" && "gradient-text",
            )}
          >
            {formatMoney(amount, currency)}
          </p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl gradient-brand text-white shadow-glow">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {changeRatio !== undefined && changeRatio !== null && (
        <div
          className={cn(
            "relative mt-3 inline-flex items-center gap-1 text-xs font-medium",
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
