"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface FixedIncome {
  id: string;
  name: string;
  categoryId: string;
  category: { id: string; name: string; icon: string | null };
  accountId: string;
  account: { id: string; name: string; bank: string | null; type: string };
  amount: string;
  dayOfMonth: number;
  isActive: boolean;
  notes: string | null;
  receivedThisMonth: boolean;
  nextOccurrence: string;
}

export interface FixedIncomeInput {
  name: string;
  categoryId: string;
  accountId: string;
  amount: string;
  dayOfMonth: number;
  notes?: string;
}

export function useFixedIncomes() {
  return useQuery({
    queryKey: ["fixed-incomes"],
    queryFn: () => apiClient.get<FixedIncome[]>("/fixed-incomes"),
  });
}

function useInvalidateFixedIncomes() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["fixed-incomes"] });
    // A received fixed income lands as a real transaction on the account.
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  };
}

export function useCreateFixedIncome() {
  const invalidate = useInvalidateFixedIncomes();
  return useMutation({
    mutationFn: (input: FixedIncomeInput) => apiClient.post<FixedIncome>("/fixed-incomes", input),
    onSuccess: invalidate,
  });
}

export function useUpdateFixedIncome() {
  const invalidate = useInvalidateFixedIncomes();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch<FixedIncome>(`/fixed-incomes/${id}`, { isActive }),
    onSuccess: invalidate,
  });
}

export function useDeleteFixedIncome() {
  const invalidate = useInvalidateFixedIncomes();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/fixed-incomes/${id}`),
    onSuccess: invalidate,
  });
}
