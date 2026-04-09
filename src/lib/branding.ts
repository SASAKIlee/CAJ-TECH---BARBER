/**
 * Helper interno para extrair RGB de um Hexadecimal.
 * Centraliza a lógica de limpeza e expansão de strings.
 */
function parseHex(hex: string) {
  const defaultRGB = { r: 212, g: 175, b: 55 }; // Cor D4AF37 (Dourado CAJ)
  
  if (!hex) return defaultRGB;

  const raw = hex.replace("#", "").trim();
  
  // Valida se é um hexadecimal válido (3 ou 6 caracteres)
  if (!/^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(raw)) return defaultRGB;

  const expanded = raw.length === 3
    ? raw.split("").map((c) => c + c).join("")
    : raw;

  const n = parseInt(expanded, 16);
  
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255
  };
}

/** * Converte #RGB ou #RRGGBB em rgba para fundos com opacidade da marca. 
 */
export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Calcula se o texto deve ser PRETO ou BRANCO baseado no brilho da cor de fundo.
 * Usa a fórmula YIQ para garantir 100% de acessibilidade visual.
 */
export function contrastTextOnBrand(hex: string): "#000000" | "#ffffff" {
  const { r, g, b } = parseHex(hex);
  
  // Fórmula YIQ (Brilho percebido pelo olho humano)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  
  return yiq >= 150 ? "#000000" : "#ffffff";
}