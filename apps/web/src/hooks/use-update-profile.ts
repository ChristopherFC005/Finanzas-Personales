"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { firstName?: string; lastName?: string; phone?: string }) =>
      apiClient.patch("/users/me", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users", "me"] }),
  });
}

export function useUpdateCurrency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (currency: string) =>
      apiClient.patch("/users/me/preferences", { currency }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users", "me"] }),
  });
}
