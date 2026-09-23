"use client";

import { useState } from "react";
import {
  useAdminUsers,
  useReactivateUser,
  useSuspendUser,
  useUpdateUserRole,
  UserRole,
} from "@/hooks/use-admin";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate } from "@/lib/utils";

const ROLE_LABELS: Record<UserRole, string> = {
  USER: "Usuario",
  SUPPORT: "Soporte",
  AUDITOR: "Auditor",
  ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
};

// An ADMIN can only hand out these roles; ADMIN/SUPER_ADMIN require being
// a SUPER_ADMIN yourself — mirrors the check the backend actually enforces.
const ADMIN_GRANTABLE: UserRole[] = ["USER", "SUPPORT", "AUDITOR"];
const ALL_ROLES: UserRole[] = ["USER", "SUPPORT", "AUDITOR", "ADMIN", "SUPER_ADMIN"];

export default function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data: me } = useCurrentUser();
  const { data, isLoading } = useAdminUsers({ page, search: search || undefined });
  const suspend = useSuspendUser();
  const reactivate = useReactivateUser();
  const updateRole = useUpdateUserRole();

  const assignableRoles = me?.role === "SUPER_ADMIN" ? ALL_ROLES : ADMIN_GRANTABLE;

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
                {data?.data.map((u) => {
                  const isSelf = u.id === me?.id;
                  const isSuperAdminTarget = u.role === "SUPER_ADMIN";
                  const canEditRole = !isSelf && !isSuperAdminTarget;
                  // The dropdown must always include the user's current role
                  // even if the actor couldn't grant it themselves, or the
                  // <select> would silently jump to the first option.
                  const roleOptions = assignableRoles.includes(u.role)
                    ? assignableRoles
                    : [u.role, ...assignableRoles];

                  return (
                    <tr key={u.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        {u.firstName} {u.lastName}
                        {isSelf && (
                          <span className="ml-2 text-xs text-muted-foreground">(tú)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {u.lastLoginAt ? formatDate(u.lastLoginAt) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {canEditRole ? (
                          <Select
                            value={u.role}
                            className="h-8 w-36 text-xs"
                            disabled={updateRole.isPending}
                            onChange={(e) =>
                              updateRole.mutate({ id: u.id, role: e.target.value as UserRole })
                            }
                          >
                            {roleOptions.map((r) => (
                              <option key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </option>
                            ))}
                          </Select>
                        ) : (
                          <span className="text-muted-foreground">{ROLE_LABELS[u.role]}</span>
                        )}
                      </td>
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
                        {!isSelf && !isSuperAdminTarget && (
                          u.status === "ACTIVE" ? (
                            <Button size="sm" variant="outline" onClick={() => suspend.mutate(u.id)}>
                              Suspender
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => reactivate.mutate(u.id)}>
                              Reactivar
                            </Button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
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
