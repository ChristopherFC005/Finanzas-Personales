"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type AccountType = "CASH" | "DEBIT" | "CREDIT" | "SAVINGS" | "OTHER";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  bank: string | null;
  initialBalance: string;
  creditLimit: string | null;
  color: string | null;
  isActive: boolean;
  currentBalance: number;
  availableCredit: number | null;
}

export interface AccountInput {
  name: string;
  type: AccountType;
  bank?: string;
  initialBalance?: string;
  creditLimit?: string;
  color?: string;
}

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: () => apiClient.get<Account[]>("/accounts"),
  });
}

function useInvalidateAccounts() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  };
}

export function useCreateAccount() {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: (input: AccountInput) => apiClient.post<Account>("/accounts", input),
    onSuccess: invalidate,
  });
}

export function useUpdateAccount() {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<AccountInput> }) =>
      apiClient.patch<Account>(`/accounts/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useDeleteAccount() {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/accounts/${id}`),
    onSuccess: invalidate,
  });
}

export function usePayCreditCard() {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: ({
      id,
      amount,
      isInstallment,
    }: {
      id: string;
      amount: string;
      isInstallment: boolean;
    }) => apiClient.post<Account>(`/accounts/${id}/payments`, { amount, isInstallment }),
    onSuccess: invalidate,
  });
}
