"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "LIGHT" as const, label: "Claro", icon: Sun },
  { value: "DARK" as const, label: "Oscuro", icon: Moon },
  { value: "SYSTEM" as const, label: "Sistema", icon: Monitor },
];

export function ThemeModeSelector() {
  const { themeMode, setThemeMode } = useTheme();

  return (
    <div className="grid grid-cols-3 gap-3">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setThemeMode(opt.value)}
          className={cn(
            "focus-ring flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors",
            themeMode === opt.value
              ? "border-primary bg-primary-muted text-primary"
              : "border-border text-muted-foreground hover:bg-muted",
          )}
        >
          <opt.icon className="h-5 w-5" />
          {opt.label}
        </button>
      ))}
    </div>
  );
}
