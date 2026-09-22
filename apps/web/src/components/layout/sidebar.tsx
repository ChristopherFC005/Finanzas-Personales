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
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/dashboard/budgets", label: "Presupuestos", icon: Wallet },
  { href: "/dashboard/goals", label: "Metas", icon: Target },
  { href: "/dashboard/statistics", label: "Estadísticas", icon: BarChart3 },
  { href: "/dashboard/assistant", label: "Asistente IA", icon: Sparkles, accent: true },
  { href: "/dashboard/profile", label: "Perfil", icon: UserCircle },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "glass-surface flex h-full w-64 flex-col border-r-0",
        className,
      )}
    >
      <div className="flex h-16 items-center gap-2 px-6">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg gradient-brand text-white shadow-glow">
          <Zap className="h-4 w-4" fill="currentColor" />
        </span>
        <span className="font-display text-lg font-bold gradient-text">FinanZen</span>
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
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                active && item.accent && "bg-accent/15 text-accent shadow-[0_0_0_1px_rgba(139,92,246,0.25)]",
                active && !item.accent && "gradient-brand text-white shadow-glow",
                !active && item.accent && "text-accent/80 hover:bg-accent/10 hover:text-accent",
                !active && !item.accent && "text-muted-foreground hover:bg-muted hover:text-foreground",
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
