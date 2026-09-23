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

export type UserRole = "USER" | "SUPPORT" | "AUDITOR" | "ADMIN" | "SUPER_ADMIN";

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: UserRole;
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AuditLog {
  id: string;
  actorUserId: string | null;
  actor: { firstName: string; lastName: string } | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
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

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      apiClient.patch(`/admin/users/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "audit-logs"] });
    },
  });
}

export function useAuditLogs(page: number) {
  return useQuery({
    queryKey: ["admin", "audit-logs", page],
    queryFn: () =>
      apiClient.get<Paginated<AuditLog>>(`/admin/audit-logs?page=${page}&limit=20`),
  });
}
