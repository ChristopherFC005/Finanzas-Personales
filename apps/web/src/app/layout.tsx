import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/providers/theme-provider";
import { QueryProvider } from "@/providers/query-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FinanZen — Controla tus finanzas personales",
  description:
    "Organiza tus ingresos, controla tus gastos, ahorra y alcanza tus metas, todo en un solo lugar.",
};

export const viewport: Viewport = {
  themeColor: "#050914",
};

// Runs before React hydrates so the correct theme/color paint immediately —
// no flash of the wrong theme for returning users. Defaults to dark + emerald,
// FinanZen's default brand identity, until preferences load from the backend.
const NO_FLASH_SCRIPT = `
(function () {
  try {
    var cached = localStorage.getItem("finanzen-theme");
    var mode = "DARK";
    var color = "#10B981";
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
    <html
      lang="es"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable}`}
    >
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
