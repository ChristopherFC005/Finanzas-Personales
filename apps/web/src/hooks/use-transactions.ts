"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Category } from "./use-categories";

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
  search?: string;
}

export interface TransactionInput {
  type: "INCOME" | "EXPENSE";
  amount: string;
  categoryId: string;
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

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TransactionInput) =>
      apiClient.post<Transaction>("/transactions", input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<TransactionInput> }) =>
      apiClient.patch<Transaction>(`/transactions/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
  });
}
