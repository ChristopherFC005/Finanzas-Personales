"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, ShieldAlert } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Usuarios", icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Cargando…</div>;
  }

  // The frontend check is a UX nicety only — every /admin/* API call is
  // re-authorized server-side by RolesGuard, which is what actually
  // prevents a non-admin from reading admin data.
  if (user && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
        <ShieldAlert className="h-10 w-10 text-danger" />
        <h1 className="text-xl font-semibold">Acceso denegado</h1>
        <p className="text-muted-foreground">No tienes permisos para ver esta sección.</p>
        <button className="text-primary" onClick={() => router.push("/dashboard")}>
          Volver al dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="glass-surface hidden w-64 flex-col border-l-0 border-t-0 md:flex">
        <div className="flex h-16 items-center gap-2 px-6">
          <span className="font-display text-lg font-bold gradient-text">FinanZen</span>
          <span className="rounded bg-accent/15 px-1.5 py-0.5 text-xs font-medium text-accent">
            Admin
          </span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                pathname === item.href
                  ? "gradient-brand text-white shadow-glow"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
