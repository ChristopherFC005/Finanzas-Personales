"use client";

import { Users, UserCheck, UserPlus, Receipt } from "lucide-react";
import { useAdminDashboard } from "@/hooks/use-admin";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { data, isLoading } = useAdminDashboard();

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  const stats = [
    { label: "Total de usuarios", value: data.totalUsers, icon: Users },
    { label: "Usuarios activos", value: data.activeUsers, icon: UserCheck },
    { label: "Nuevos este mes", value: data.newUsersThisMonth, icon: UserPlus },
    { label: "Movimientos registrados", value: data.totalTransactions, icon: Receipt },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Dashboard administrativo</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{s.value}</p>
              </div>
              <s.icon className="h-8 w-8 text-primary" />
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimos registros</CardTitle>
        </CardHeader>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 font-medium">Nombre</th>
              <th className="py-2 font-medium">Estado</th>
              <th className="py-2 font-medium">Registrado</th>
            </tr>
          </thead>
          <tbody>
            {data.recentUsers.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="py-2">{u.firstName} {u.lastName}</td>
                <td className="py-2">{u.status}</td>
                <td className="py-2 text-muted-foreground">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
