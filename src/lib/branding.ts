/** Converte #RGB ou #RRGGBB em rgba para fundos com opacidade da marca. */
export function hexToRgba(hex: string, alpha: number): string {
  const raw = hex?.replace("#", "").trim() || "D4AF37";
  const expanded =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw.padEnd(6, "0").slice(0, 6);
  const n = parseInt(expanded, 16);
  if (Number.isNaN(n)) return `rgba(212, 175, 55, ${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function contrastTextOnBrand(hex: string): "#000000" | "#ffffff" {
  const raw = hex?.replace("#", "").trim() || "D4AF37";
  const expanded =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw.padEnd(6, "0").slice(0, 6);
  const n = parseInt(expanded, 16);
  if (Number.isNaN(n)) return "#000000";
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 186 ? "#000000" : "#ffffff";
}
