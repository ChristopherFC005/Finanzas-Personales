"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: "USER" | "SUPPORT" | "AUDITOR" | "ADMIN" | "SUPER_ADMIN";
  status: "ACTIVE" | "SUSPENDED" | "DELETED";
  preferences: {
    currency: string;
    themeMode: "LIGHT" | "DARK" | "SYSTEM";
    primaryColor: string;
    locale: string;
  } | null;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["users", "me"],
    queryFn: () => apiClient.get<Profile>("/users/me"),
    retry: false,
  });
}
