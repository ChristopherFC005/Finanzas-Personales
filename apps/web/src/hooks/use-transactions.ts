"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Category } from "./use-categories";
import { AccountType } from "./use-accounts";

// The account nested in a transaction response is the raw record — it never
// carries the computed currentBalance/availableCredit fields that GET
// /accounts returns, so it gets its own lighter type instead of reusing Account.
export interface AccountRef {
  id: string;
  name: string;
  type: AccountType;
  bank: string | null;
  color: string | null;
}

export type PaymentMethod =
  | "CASH"
  | "DEBIT"
  | "CREDIT"
  | "TRANSFER"
  | "YAPE"
  | "PLIN"
  | "OTHER";

export interface Transaction {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: string;
  description: string | null;
  paymentMethod: PaymentMethod;
  transactionDate: string;
  notes: string | null;
  category: Category;
  account: AccountRef | null;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: "INCOME" | "EXPENSE";
  categoryId?: string;
  accountId?: string;
  search?: string;
}

export interface TransactionInput {
  type: "INCOME" | "EXPENSE";
  amount: string;
  categoryId: string;
  accountId?: string;
  description?: string;
  paymentMethod: PaymentMethod;
  transactionDate: string;
  notes?: string;
}

function buildQuery(filters: TransactionFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  return params.toString();
}

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: () =>
      apiClient.get<Paginated<Transaction>>(
        `/transactions?${buildQuery(filters)}`,
      ),
  });
}

function invalidateAfterTransactionChange(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["transactions"] });
  queryClient.invalidateQueries({ queryKey: ["statistics"] });
  queryClient.invalidateQueries({ queryKey: ["accounts"] });
  queryClient.invalidateQueries({ queryKey: ["budgets"] });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TransactionInput) =>
      apiClient.post<Transaction>("/transactions", input),
    onSuccess: () => invalidateAfterTransactionChange(queryClient),
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TransactionInput> }) =>
      apiClient.patch<Transaction>(`/transactions/${id}`, input),
    onSuccess: () => invalidateAfterTransactionChange(queryClient),
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/transactions/${id}`),
    onSuccess: () => invalidateAfterTransactionChange(queryClient),
  });
}
