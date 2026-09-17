"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

export function useAskAssistant() {
  return useMutation({
    mutationFn: (question: string) =>
      apiClient.post<{ answer: string }>("/assistant/ask", { question }),
  });
}
