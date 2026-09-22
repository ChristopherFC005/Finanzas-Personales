"use client";

import { Menu, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const { data: user } = useCurrentUser();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="glass-surface sticky top-0 z-20 flex h-16 items-center justify-between border-l-0 border-r-0 border-t-0 px-4 md:px-6">
      <button
        className="rounded-lg p-2 hover:bg-muted md:hidden"
        onClick={onMenuClick}
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden items-center gap-3 md:flex">
        {user && (
          <>
            <span className="flex h-8 w-8 items-center justify-center rounded-full gradient-brand text-xs font-semibold text-white">
              {user.firstName.charAt(0).toUpperCase()}
            </span>
            <p className="text-sm text-muted-foreground">
              Hola, <span className="font-medium text-foreground">{user.firstName}</span>
            </p>
          </>
        )}
      </div>

      <Button variant="ghost" size="sm" onClick={handleLogout}>
        <LogOut className="h-4 w-4" />
        Salir
      </Button>
    </header>
  );
}
