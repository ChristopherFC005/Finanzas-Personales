"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface StatisticsSummary {
  period: { start: string; end: string };
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
  averageDailyExpense: number;
  topExpenseCategory: { id: string; name: string; icon: string | null; amount: number } | null;
  comparedToPreviousPeriod: { income: number | null; expenses: number | null };
}

export function useStatisticsSummary(
  period: string = "this_month",
  range?: { dateFrom: string; dateTo: string },
) {
  const params = new URLSearchParams({ period });
  if (range) {
    params.set("dateFrom", range.dateFrom);
    params.set("dateTo", range.dateTo);
  }

  return useQuery({
    queryKey: ["statistics", "summary", period, range?.dateFrom, range?.dateTo],
    queryFn: () =>
      apiClient.get<StatisticsSummary>(`/statistics/summary?${params.toString()}`),
  });
}
