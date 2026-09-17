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
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4 md:px-6">
      <button
        className="rounded-lg p-2 hover:bg-muted md:hidden"
        onClick={onMenuClick}
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden md:block">
        {user && (
          <p className="text-sm text-muted-foreground">
            Hola, <span className="font-medium text-foreground">{user.firstName}</span>
          </p>
        )}
      </div>

      <Button variant="ghost" size="sm" onClick={handleLogout}>
        <LogOut className="h-4 w-4" />
        Salir
      </Button>
    </header>
  );
}
