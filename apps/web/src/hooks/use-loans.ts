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

function useInvalidateLoans() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["loans"] });
}

// Lending money out (and deleting that loan) changes the funding account's
// balance, so the accounts list needs to refresh too — registering a
// repayment doesn't (it never flows back into an account, see backend).
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
  const invalidate = useInvalidateLoans();
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: string }) =>
      apiClient.post<Loan>(`/loans/${id}/payments`, { amount }),
    onSuccess: invalidate,
  });
}
