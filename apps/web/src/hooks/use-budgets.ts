"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface Budget {
  id: string;
  categoryId: string;
  category: { id: string; name: string; icon: string | null };
  amount: string;
  month: number;
  year: number;
  alertPercentage: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
  isNearLimit: boolean;
  isOverLimit: boolean;
}

export interface BudgetInput {
  categoryId: string;
  amount: string;
  month: number;
  year: number;
  alertPercentage?: number;
}

export function useBudgets(month: number, year: number) {
  return useQuery({
    queryKey: ["budgets", month, year],
    queryFn: () => apiClient.get<Budget[]>(`/budgets?month=${month}&year=${year}`),
  });
}

function useInvalidateBudgets() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["budgets"] });
}

export function useCreateBudget() {
  const invalidate = useInvalidateBudgets();
  return useMutation({
    mutationFn: (input: BudgetInput) => apiClient.post<Budget>("/budgets", input),
    onSuccess: invalidate,
  });
}

export function useDeleteBudget() {
  const invalidate = useInvalidateBudgets();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/budgets/${id}`),
    onSuccess: invalidate,
  });
}
