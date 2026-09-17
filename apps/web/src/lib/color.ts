// Derives an accessible set of CSS variable values from a single primary
// hex color the user picks (spec §16): --primary, --primary-hover,
// --primary-active, --primary-muted, --primary-foreground, --focus-ring.

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function hexToHsl(hex: string): Hsl {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex({ h, s, l }: Hsl): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const clampLightness = (l: number) => Math.min(100, Math.max(0, l));

export interface PrimaryColorScale {
  primary: string;
  primaryHover: string;
  primaryActive: string;
  primaryMuted: string;
  primaryForeground: string;
  focusRing: string;
}

export function generatePrimaryScale(
  baseHex: string,
  isDark: boolean,
): PrimaryColorScale {
  const hsl = hexToHsl(baseHex);

  const hover = hslToHex({
    ...hsl,
    l: clampLightness(hsl.l + (isDark ? 8 : -8)),
  });
  const active = hslToHex({
    ...hsl,
    l: clampLightness(hsl.l + (isDark ? 14 : -14)),
  });
  const muted = hslToHex({
    ...hsl,
    l: clampLightness(isDark ? 22 : 94),
    s: Math.max(20, hsl.s * 0.5),
  });

  // WCAG-ish luminance check to decide black vs white text on primary.
  const rgb = baseHex
    .replace("#", "")
    .match(/.{2}/g)!
    .map((h) => parseInt(h, 16) / 255);
  const luminance =
    0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!;
  const foreground = luminance > 0.55 ? "#0f172a" : "#ffffff";

  return {
    primary: baseHex,
    primaryHover: hover,
    primaryActive: active,
    primaryMuted: muted,
    primaryForeground: foreground,
    focusRing: baseHex,
  };
}

export const PRESET_COLORS: { name: string; hex: string }[] = [
  { name: "Verde", hex: "#16A34A" },
  { name: "Azul", hex: "#2563EB" },
  { name: "Celeste", hex: "#0EA5E9" },
  { name: "Turquesa", hex: "#0D9488" },
  { name: "Morado", hex: "#7C3AED" },
  { name: "Índigo", hex: "#4F46E5" },
  { name: "Rosa", hex: "#DB2777" },
  { name: "Naranja", hex: "#EA580C" },
  { name: "Rojo", hex: "#DC2626" },
];
