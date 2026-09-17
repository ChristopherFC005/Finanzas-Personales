"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface Goal {
  id: string;
  name: string;
  description: string | null;
  targetAmount: string;
  currentAmount: string;
  targetDate: string | null;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
}

export interface GoalInput {
  name: string;
  description?: string;
  targetAmount: string;
  targetDate?: string;
}

export function useGoals() {
  return useQuery({
    queryKey: ["goals"],
    queryFn: () => apiClient.get<Goal[]>("/goals"),
  });
}

function useGoalMutation() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["goals"] });
  return { queryClient, invalidate };
}

export function useCreateGoal() {
  const { invalidate } = useGoalMutation();
  return useMutation({
    mutationFn: (input: GoalInput) => apiClient.post<Goal>("/goals", input),
    onSuccess: invalidate,
  });
}

export function useDeleteGoal() {
  const { invalidate } = useGoalMutation();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/goals/${id}`),
    onSuccess: invalidate,
  });
}

export function useDepositGoal() {
  const { invalidate } = useGoalMutation();
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: string }) =>
      apiClient.post<Goal>(`/goals/${id}/deposits`, { amount }),
    onSuccess: invalidate,
  });
}

export function useWithdrawGoal() {
  const { invalidate } = useGoalMutation();
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: string }) =>
      apiClient.post<Goal>(`/goals/${id}/withdrawals`, { amount }),
    onSuccess: invalidate,
  });
}
