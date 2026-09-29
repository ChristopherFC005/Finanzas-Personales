"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export type LoanPaymentType = "SINGLE" | "INSTALLMENTS";
export type LoanStatus = "ACTIVE" | "PAID" | "CANCELLED";

export interface Loan {
  id: string;
  borrowerName: string;
  totalAmount: string;
  paymentType: LoanPaymentType;
  dueDate: string | null;
  installmentsCount: number | null;
  firstDueDate: string | null;
  notes: string | null;
  status: LoanStatus;
  accountId: string | null;
  isExternal: boolean;
  account: { name: string; bank: string | null; type: string } | null;
  amountReceived: number;
  remaining: number;
  nextDueDate: string | null;
  isOverdue: boolean;
}

export interface LoanInput {
  borrowerName: string;
  totalAmount: string;
  paymentType: LoanPaymentType;
  accountId: string;
  isExternal?: boolean;
  dueDate?: string;
  installmentsCount?: number;
  firstDueDate?: string;
  notes?: string;
}

export function useLoans() {
  return useQuery({
    queryKey: ["loans"],
    queryFn: () => apiClient.get<Loan[]>("/loans"),
  });
}

// Lending money out, deleting a loan, and registering a repayment all move
// an account's balance (funding it, reversing it, or crediting the
// repayment back), so the accounts list needs to refresh in every case.
function useInvalidateLoansAndAccounts() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["loans"] });
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
  };
}

export function useCreateLoan() {
  const invalidate = useInvalidateLoansAndAccounts();
  return useMutation({
    mutationFn: (input: LoanInput) => apiClient.post<Loan>("/loans", input),
    onSuccess: invalidate,
  });
}

export function useDeleteLoan() {
  const invalidate = useInvalidateLoansAndAccounts();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/loans/${id}`),
    onSuccess: invalidate,
  });
}

export function useRegisterLoanPayment() {
  const invalidate = useInvalidateLoansAndAccounts();
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: string }) =>
      apiClient.post<Loan>(`/loans/${id}/payments`, { amount }),
    onSuccess: invalidate,
  });
}
