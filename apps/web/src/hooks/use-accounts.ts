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
  billingDate: string | null;
  paymentDueDate: string | null;
  color: string | null;
  isActive: boolean;
  createdAt: string;
  currentBalance: number;
  availableCredit: number | null;
  /** Debt as of the last billing cutoff — what you can actually pay right
   * now. Only set for credit cards that have a billingDate configured. */
  statementDue: number | null;
}

export interface AccountInput {
  name: string;
  type: AccountType;
  bank?: string;
  initialBalance?: string;
  creditLimit?: string;
  color?: string;
  billingDate?: string;
  paymentDueDate?: string;
}

export type AccountMovementKind =
  | "INCOME"
  | "EXPENSE"
  | "CARD_PAYMENT"
  | "CARD_PAYMENT_OUT"
  | "LOAN_OUT"
  | "LOAN_PAYMENT_IN";

export interface AccountMovement {
  id: string;
  kind: AccountMovementKind;
  amount: number;
  date: string;
  label: string;
  description: string | null;
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

export function useAccountMovements(id: string | null) {
  return useQuery({
    queryKey: ["accounts", id, "movements"],
    queryFn: () => apiClient.get<AccountMovement[]>(`/accounts/${id}/movements`),
    enabled: !!id,
  });
}

export function usePayCreditCard() {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: ({
      id,
      amount,
      sourceAccountId,
      isInstallment,
    }: {
      id: string;
      amount: string;
      sourceAccountId: string;
      isInstallment: boolean;
    }) =>
      apiClient.post<Account>(`/accounts/${id}/payments`, {
        amount,
        sourceAccountId,
        isInstallment,
      }),
    onSuccess: invalidate,
  });
}
