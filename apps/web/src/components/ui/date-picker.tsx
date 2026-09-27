"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface DateParts {
  y: number;
  m: number;
  d: number;
}

// Dates travel as plain "YYYY-MM-DD" strings end-to-end. Parsing that
// through `new Date(...)` and reading back local getters shifts a day
// backward for negative UTC offsets (e.g. Peru, UTC-5) — so every part is
// pulled directly from the string instead of going through Date/UTC math.
function parseISO(value?: string | null): DateParts | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) };
}

function toISO(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, "0")}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function todayParts(): DateParts {
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
}

function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

// Monday-first weekday index (0=Mon..6=Sun) for the 1st of the month.
function firstWeekdayIndex(y: number, m: number): number {
  const jsDay = new Date(y, m, 1).getDay();
  return (jsDay + 6) % 7;
}

function sortableKey(p: DateParts): number {
  return p.y * 10000 + p.m * 100 + p.d;
}

export interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  id?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Selecciona una fecha",
  min,
  max,
  disabled,
  id,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseISO(value);
  const minParts = parseISO(min);
  const maxParts = parseISO(max);
  const today = todayParts();
  const [viewY, setViewY] = useState(selected?.y ?? today.y);
  const [viewM, setViewM] = useState(selected?.m ?? today.m);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onDocClick);
      document.addEventListener("keydown", onKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function isDisabled(y: number, m: number, d: number): boolean {
    const key = sortableKey({ y, m, d });
    if (minParts && key < sortableKey(minParts)) return true;
    if (maxParts && key > sortableKey(maxParts)) return true;
    return false;
  }

  function changeMonth(delta: number) {
    let m = viewM + delta;
    let y = viewY;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewM(m);
    setViewY(y);
  }

  const totalDays = daysInMonth(viewY, viewM);
  const leadingBlanks = firstWeekdayIndex(viewY, viewM);
  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const label = selected
    ? new Intl.DateTimeFormat("es-PE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(selected.y, selected.m, selected.d))
    : placeholder;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "focus-ring flex h-10 w-full items-center justify-between rounded-lg border border-border bg-surface px-3 text-left text-sm transition-colors hover:border-primary/40",
          selected ? "text-foreground" : "text-muted-foreground",
          disabled && "cursor-not-allowed opacity-50 hover:border-border",
        )}
      >
        <span className="capitalize">{label}</span>
        <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="glass-surface absolute z-20 mt-2 w-72 rounded-2xl border border-border p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-display text-sm font-semibold capitalize text-foreground">
              {MONTHS[viewM]} {viewY}
            </span>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
            {WEEKDAYS.map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (d === null) return <span key={i} />;
              const isSelected =
                !!selected && selected.y === viewY && selected.m === viewM && selected.d === d;
              const isToday = today.y === viewY && today.m === viewM && today.d === d;
              const blocked = isDisabled(viewY, viewM, d);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={blocked}
                  onClick={() => {
                    onChange(toISO(viewY, viewM, d));
                    setOpen(false);
                  }}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-all",
                    blocked && "cursor-not-allowed text-muted-foreground/30",
                    !blocked && !isSelected && "text-foreground hover:scale-105 hover:bg-muted",
                    isSelected && "gradient-brand text-white shadow-glow",
                    !isSelected && isToday && "border border-primary/50 text-primary",
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
