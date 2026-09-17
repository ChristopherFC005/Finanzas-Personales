"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { generatePrimaryScale } from "@/lib/color";
import { apiClient } from "@/lib/api/client";

type ThemeMode = "LIGHT" | "DARK" | "SYSTEM";

interface ThemeContextValue {
  themeMode: ThemeMode;
  primaryColor: string;
  resolvedDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  setPrimaryColor: (hex: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "finanzen-theme";
const DEFAULT_COLOR = "#16A34A";

function applyTheme(mode: ThemeMode, color: string) {
  const root = document.documentElement;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = mode === "DARK" || (mode === "SYSTEM" && systemDark);

  root.setAttribute("data-theme", isDark ? "dark" : "light");

  const scale = generatePrimaryScale(color, isDark);
  root.style.setProperty("--primary", scale.primary);
  root.style.setProperty("--primary-hover", scale.primaryHover);
  root.style.setProperty("--primary-active", scale.primaryActive);
  root.style.setProperty("--primary-muted", scale.primaryMuted);
  root.style.setProperty("--primary-foreground", scale.primaryForeground);
  root.style.setProperty("--focus-ring", scale.focusRing);

  return isDark;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>("SYSTEM");
  const [primaryColor, setPrimaryColorState] = useState(DEFAULT_COLOR);
  const [resolvedDark, setResolvedDark] = useState(false);

  // 1) Paint instantly from localStorage (no flash), 2) reconcile with the
  // backend so preferences follow the user across devices/sessions.
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as {
          themeMode: ThemeMode;
          primaryColor: string;
        };
        setThemeModeState(parsed.themeMode);
        setPrimaryColorState(parsed.primaryColor);
        setResolvedDark(applyTheme(parsed.themeMode, parsed.primaryColor));
      } else {
        setResolvedDark(applyTheme("SYSTEM", DEFAULT_COLOR));
      }
    } catch {
      setResolvedDark(applyTheme("SYSTEM", DEFAULT_COLOR));
    }

    apiClient
      .get<{ themeMode: ThemeMode; primaryColor: string }>(
        "/users/me/preferences",
      )
      .then((prefs) => {
        setThemeModeState(prefs.themeMode);
        setPrimaryColorState(prefs.primaryColor);
        setResolvedDark(applyTheme(prefs.themeMode, prefs.primaryColor));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      })
      .catch(() => {
        // Not authenticated yet (e.g. on the landing/login page) — the
        // localStorage/system defaults above already painted the page.
      });
  }, []);

  useEffect(() => {
    if (themeMode !== "SYSTEM") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setResolvedDark(applyTheme(themeMode, primaryColor));
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [themeMode, primaryColor]);

  const persist = useCallback(
    (mode: ThemeMode, color: string) => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ themeMode: mode, primaryColor: color }),
      );
      apiClient
        .patch("/users/me/preferences", { themeMode: mode, primaryColor: color })
        .catch(() => undefined);
    },
    [],
  );

  const setThemeMode = useCallback(
    (mode: ThemeMode) => {
      setThemeModeState(mode);
      setResolvedDark(applyTheme(mode, primaryColor));
      persist(mode, primaryColor);
    },
    [primaryColor, persist],
  );

  const setPrimaryColor = useCallback(
    (hex: string) => {
      setPrimaryColorState(hex);
      setResolvedDark(applyTheme(themeMode, hex));
      persist(themeMode, hex);
    },
    [themeMode, persist],
  );

  const value = useMemo(
    () => ({ themeMode, primaryColor, resolvedDark, setThemeMode, setPrimaryColor }),
    [themeMode, primaryColor, resolvedDark, setThemeMode, setPrimaryColor],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de ThemeProvider.");
  return ctx;
}
