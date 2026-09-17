"use client";

import { Wallet, TrendingUp, TrendingDown, PiggyBank } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useStatisticsSummary } from "@/hooks/use-statistics";
import { StatCard } from "@/components/finance/stat-card";
import { IncomeExpenseChart } from "@/components/finance/income-expense-chart";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardHomePage() {
  const { data: user } = useCurrentUser();
  const currency = user?.preferences?.currency ?? "PEN";

  const { data: month, isLoading: monthLoading } = useStatisticsSummary("this_month");
  const { data: balance, isLoading: balanceLoading } = useStatisticsSummary(
    "custom",
    { dateFrom: "2000-01-01", dateTo: new Date().toISOString().slice(0, 10) },
  );

  const loading = monthLoading || balanceLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Hola, {user?.firstName ?? "…"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Este es el resumen de tu situación financiera.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Saldo disponible"
            amount={balance?.savings ?? 0}
            currency={currency}
            icon={Wallet}
          />
          <StatCard
            label="Ingresos del mes"
            amount={month?.income ?? 0}
            currency={currency}
            icon={TrendingUp}
            changeRatio={month?.comparedToPreviousPeriod.income ?? null}
            tone="success"
          />
          <StatCard
            label="Gastos del mes"
            amount={month?.expenses ?? 0}
            currency={currency}
            icon={TrendingDown}
            changeRatio={month?.comparedToPreviousPeriod.expenses ?? null}
            tone="danger"
          />
          <StatCard
            label="Ahorro del mes"
            amount={month?.savings ?? 0}
            currency={currency}
            icon={PiggyBank}
          />
        </div>
      )}

      {month && (
        <IncomeExpenseChart
          income={month.income}
          expenses={month.expenses}
          currency={currency}
        />
      )}
    </div>
  );
}
