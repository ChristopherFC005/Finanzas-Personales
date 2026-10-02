"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Check } from "lucide-react";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from "@/hooks/use-notifications";
import { cn, formatDate } from "@/lib/utils";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: unread } = useUnreadNotificationCount();
  const { data: notifications, isLoading } = useNotifications(open);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const count = unread?.count ?? 0;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-30 w-80 rounded-xl border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-medium text-foreground">Notificaciones</p>
            {count > 0 && (
              <button
                className="text-xs text-primary hover:underline"
                onClick={() => markAllRead.mutate()}
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">Cargando…</p>
            ) : !notifications || notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No tienes notificaciones.
              </p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-2 border-b border-border px-4 py-3 last:border-0",
                    !n.readAt && "bg-primary-muted/40",
                  )}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                    <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(n.createdAt)}</p>
                  </div>
                  {!n.readAt && (
                    <button
                      className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-primary"
                      onClick={() => markRead.mutate(n.id)}
                      aria-label="Marcar como leída"
                      title="Marcar como leída"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
