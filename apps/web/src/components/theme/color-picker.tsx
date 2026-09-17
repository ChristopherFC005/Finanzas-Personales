"use client";

import { Check } from "lucide-react";
import { useTheme } from "@/providers/theme-provider";
import { PRESET_COLORS } from "@/lib/color";
import { cn } from "@/lib/utils";

export function ColorPicker() {
  const { primaryColor, setPrimaryColor } = useTheme();

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {PRESET_COLORS.map((c) => (
          <button
            key={c.hex}
            type="button"
            title={c.name}
            onClick={() => setPrimaryColor(c.hex)}
            className={cn(
              "focus-ring flex h-10 w-10 items-center justify-center rounded-full border-2 transition-transform hover:scale-105",
              primaryColor.toLowerCase() === c.hex.toLowerCase()
                ? "border-foreground"
                : "border-transparent",
            )}
            style={{ backgroundColor: c.hex }}
          >
            {primaryColor.toLowerCase() === c.hex.toLowerCase() && (
              <Check className="h-4 w-4 text-white" />
            )}
          </button>
        ))}

        <label
          className="focus-ring flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-border text-xs text-muted-foreground"
          title="Color personalizado"
        >
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="h-0 w-0 opacity-0"
          />
          +
        </label>
      </div>
    </div>
  );
}
