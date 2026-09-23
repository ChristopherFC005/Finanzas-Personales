"use client";

import { useState } from "react";
import { ScrollText } from "lucide-react";
import { useAuditLogs } from "@/hooks/use-admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";

const ACTION_LABELS: Record<string, string> = {
  USER_SUSPENDED: "Usuario suspendido",
  USER_REACTIVATED: "Usuario reactivado",
  ROLE_CHANGED: "Cambio de rol",
  ADMIN_LOGIN: "Inicio de sesión admin",
  ADMIN_SETTING_CHANGED: "Configuración modificada",
};

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAuditLogs(page);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Auditoría</h1>
        <p className="text-sm text-muted-foreground">
          Registro de acciones administrativas sensibles.
        </p>
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
            icon={ScrollText}
            title="Sin actividad registrada"
            description="Las acciones sensibles (suspender usuarios, cambiar roles) aparecerán aquí."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Acción</th>
                  <th className="px-4 py-3 font-medium">Realizado por</th>
                  <th className="px-4 py-3 font-medium">Recurso</th>
                  <th className="px-4 py-3 font-medium">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((log) => (
                  <tr key={log.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {ACTION_LABELS[log.action] ?? log.action}
                    </td>
                    <td className="px-4 py-3">
                      {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : "Sistema"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {log.resourceType}
                      {log.resourceId ? ` · ${log.resourceId.slice(0, 8)}…` : ""}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {log.metadata
                        ? Object.entries(log.metadata)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(", ")
                        : "—"}
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
