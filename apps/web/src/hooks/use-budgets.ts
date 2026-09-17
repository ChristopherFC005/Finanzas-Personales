"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Category } from "./use-categories";

export interface Budget {
  id: string;
  categoryId: string;
  category: Category;
  amount: string;
  month: number;
  year: number;
  alertPercentage: number;
  spent: number;
  percentage: number;
  status: "NORMAL" | "WARNING" | "EXCEEDED";
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
    queryFn: () =>
      apiClient.get<Budget[]>(`/budgets?month=${month}&year=${year}`),
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BudgetInput) => apiClient.post<Budget>("/budgets", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budgets"] }),
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/budgets/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budgets"] }),
  });
}
