"use client";

import { useState } from "react";
import { ArrowLeftRight, Trash2 } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  useDeleteTransaction,
  useTransactions,
} from "@/hooks/use-transactions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { FloatingAddButton } from "@/components/finance/floating-add-button";
import { cn, formatDate, formatMoney } from "@/lib/utils";

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"" | "INCOME" | "EXPENSE">("");
  const { data: user } = useCurrentUser();
  const currency = user?.preferences?.currency ?? "PEN";

  const { data, isLoading } = useTransactions({
    page,
    limit: 15,
    search: search || undefined,
    type: type || undefined,
  });
  const deleteTransaction = useDeleteTransaction();

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Movimientos</h1>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Buscar por descripción…"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="sm:w-64"
          />
          <Select
            value={type}
            onChange={(e) => {
              setPage(1);
              setType(e.target.value as "" | "INCOME" | "EXPENSE");
            }}
            className="sm:w-40"
          >
            <option value="">Todos</option>
            <option value="INCOME">Ingresos</option>
            <option value="EXPENSE">Gastos</option>
          </Select>
        </div>
      </div>

      <Card className="p-0">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !data || data.data.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="Aún no tienes movimientos"
            description="Registra tu primer ingreso o gasto con el botón +"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Descripción</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium">Cuenta</th>
                  <th className="px-4 py-3 font-medium">Método</th>
                  <th className="px-4 py-3 text-right font-medium">Monto</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.data.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(t.transactionDate)}
                    </td>
                    <td className="px-4 py-3">{t.description || "—"}</td>
                    <td className="px-4 py-3">{t.category.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.account?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.paymentMethod}</td>
                    <td
                      className={cn(
                        "px-4 py-3 text-right font-medium",
                        t.type === "INCOME" ? "text-success" : "text-danger",
                      )}
                    >
                      {t.type === "INCOME" ? "+" : "-"}
                      {formatMoney(t.amount, currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-danger"
                        onClick={() => deleteTransaction.mutate(t.id)}
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {data.meta.page} de {data.meta.totalPages} · {data.meta.total} movimientos
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      <FloatingAddButton />
    </div>
  );
}
