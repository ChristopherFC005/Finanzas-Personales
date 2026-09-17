"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar className="hidden md:flex" />

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-50 h-full">
            <Sidebar className="flex" />
            <button
              className="absolute right-3 top-4 rounded-lg p-2 hover:bg-muted"
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
