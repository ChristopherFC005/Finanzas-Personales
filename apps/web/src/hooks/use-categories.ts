"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export interface Category {
  id: string;
  userId: string | null;
  name: string;
  icon: string | null;
  type: "INCOME" | "EXPENSE";
  isDefault: boolean;
}

export function useCategories(type?: "INCOME" | "EXPENSE") {
  return useQuery({
    queryKey: ["categories", type ?? "all"],
    queryFn: () =>
      apiClient.get<Category[]>(
        `/categories${type ? `?type=${type}` : ""}`,
      ),
  });
}
