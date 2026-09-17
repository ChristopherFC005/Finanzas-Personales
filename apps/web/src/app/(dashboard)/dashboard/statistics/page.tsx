"use client";

import { useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useStatisticsSummary } from "@/hooks/use-statistics";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { IncomeExpenseChart } from "@/components/finance/income-expense-chart";
import { formatMoney, formatPercent } from "@/lib/utils";

const PERIODS = [
  { value: "this_month", label: "Este mes" },
  { value: "three_months", label: "3 meses" },
  { value: "six_months", label: "6 meses" },
  { value: "year", label: "Año" },
];

export default function StatisticsPage() {
  const [period, setPeriod] = useState("this_month");
  const { data: user } = useCurrentUser();
  const currency = user?.preferences?.currency ?? "PEN";
  const { data, isLoading } = useStatisticsSummary(period);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Estadísticas</h1>
        <Select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-40">
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>

      {isLoading || !data ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <IncomeExpenseChart income={data.income} expenses={data.expenses} currency={currency} />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle>Tasa de ahorro</CardTitle>
              </CardHeader>
              <p className="text-xl font-semibold text-foreground">
                {formatPercent(data.savingsRate)}
              </p>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Promedio diario de gasto</CardTitle>
              </CardHeader>
              <p className="text-xl font-semibold text-foreground">
                {formatMoney(data.averageDailyExpense, currency)}
              </p>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Categoría principal</CardTitle>
              </CardHeader>
              <p className="text-xl font-semibold text-foreground">
                {data.topExpenseCategory?.name ?? "—"}
              </p>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Ahorro del periodo</CardTitle>
              </CardHeader>
              <p className="text-xl font-semibold text-foreground">
                {formatMoney(data.savings, currency)}
              </p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
