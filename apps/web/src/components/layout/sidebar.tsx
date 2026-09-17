"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Target,
  BarChart3,
  Sparkles,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/dashboard/budgets", label: "Presupuestos", icon: Wallet },
  { href: "/dashboard/goals", label: "Metas", icon: Target },
  { href: "/dashboard/statistics", label: "Estadísticas", icon: BarChart3 },
  { href: "/dashboard/assistant", label: "Asistente", icon: Sparkles },
  { href: "/dashboard/profile", label: "Perfil", icon: UserCircle },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside className={cn("flex h-full w-64 flex-col border-r border-border bg-surface", className)}>
      <div className="flex h-16 items-center px-6">
        <span className="text-lg font-bold text-primary">FinanZen</span>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary-muted text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
