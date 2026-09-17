"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Paginated } from "./use-transactions";

export interface AdminDashboard {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  totalTransactions: number;
  recentUsers: {
    id: string;
    firstName: string;
    lastName: string;
    status: string;
    createdAt: string;
  }[];
}

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  createdAt: string;
  lastLoginAt: string | null;
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => apiClient.get<AdminDashboard>("/admin/dashboard"),
  });
}

export function useAdminUsers(params: { page: number; search?: string }) {
  const query = new URLSearchParams({ page: String(params.page), limit: "20" });
  if (params.search) query.set("search", params.search);

  return useQuery({
    queryKey: ["admin", "users", params],
    queryFn: () =>
      apiClient.get<Paginated<AdminUser>>(`/admin/users?${query.toString()}`),
  });
}

export function useSuspendUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/admin/users/${id}/suspend`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useReactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/admin/users/${id}/reactivate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}
