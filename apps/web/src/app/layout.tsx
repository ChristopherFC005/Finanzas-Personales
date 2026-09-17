import type { Metadata } from "next";
import { ThemeProvider } from "@/providers/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinanZen — Controla tus finanzas personales",
  description:
    "Organiza tus ingresos, controla tus gastos, ahorra y alcanza tus metas, todo en un solo lugar.",
};

// Runs before React hydrates so the correct theme/color paint immediately —
// no flash of the default green/light theme for returning users.
const NO_FLASH_SCRIPT = `
(function () {
  try {
    var cached = localStorage.getItem("finanzen-theme");
    var mode = "SYSTEM";
    var color = "#16A34A";
    if (cached) {
      var parsed = JSON.parse(cached);
      mode = parsed.themeMode || mode;
      color = parsed.primaryColor || color;
    }
    var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var isDark = mode === "DARK" || (mode === "SYSTEM" && systemDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    document.documentElement.style.setProperty("--primary", color);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body>
        <QueryProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
