"use client";

import { useState } from "react";
import { useAdminUsers, useReactivateUser, useSuspendUser } from "@/hooks/use-admin";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate } from "@/lib/utils";

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data, isLoading } = useAdminUsers({ page, search: search || undefined });
  const suspend = useSuspendUser();
  const reactivate = useReactivateUser();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Usuarios</h1>
        <Input
          placeholder="Buscar por nombre…"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          className="w-64"
        />
      </div>

      <Card className="p-0">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Registrado</th>
                  <th className="px-4 py-3 font-medium">Último acceso</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data?.data.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">{u.firstName} {u.lastName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.lastLoginAt ? formatDate(u.lastLoginAt) : "—"}
                    </td>
                    <td className="px-4 py-3">{u.role}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          u.status === "ACTIVE" && "bg-success/10 text-success",
                          u.status === "SUSPENDED" && "bg-danger/10 text-danger",
                        )}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.status === "ACTIVE" ? (
                        <Button size="sm" variant="outline" onClick={() => suspend.mutate(u.id)}>
                          Suspender
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => reactivate.mutate(u.id)}>
                          Reactivar
                        </Button>
                      )}
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
          <span>Página {data.meta.page} de {data.meta.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
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
    </div>
  );
}
