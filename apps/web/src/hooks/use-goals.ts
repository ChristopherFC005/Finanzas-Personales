"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface GoalCollaborator {
  id: string;
  userId: string;
  user: { id: string; firstName: string; lastName: string };
}

export interface Goal {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  targetAmount: string;
  currentAmount: string;
  targetDate: string | null;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  isOwner: boolean;
  collaborators: GoalCollaborator[];
}

export interface GoalInput {
  name: string;
  description?: string;
  targetAmount: string;
  targetDate?: string;
}

export interface GoalInvitePreview {
  goalName: string;
  targetAmount: string;
  currentAmount: string;
  invitedByName: string;
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

export function useCreateGoalInvite() {
  return useMutation({
    mutationFn: (goalId: string) =>
      apiClient.post<{ token: string; url: string }>(`/goals/${goalId}/invite`),
  });
}

export function useGoalInvitePreview(token: string | null) {
  return useQuery({
    queryKey: ["goal-invites", token],
    queryFn: () => apiClient.get<GoalInvitePreview>(`/goal-invites/${token}`),
    enabled: !!token,
    retry: false,
  });
}

export function useAcceptGoalInvite() {
  const { invalidate } = useGoalMutation();
  return useMutation({
    mutationFn: (token: string) => apiClient.post<Goal>(`/goal-invites/${token}/accept`),
    onSuccess: invalidate,
  });
}
