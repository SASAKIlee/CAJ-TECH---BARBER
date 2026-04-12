import { describe, it, expect } from "vitest";
import { hexToRgba, contrastTextOnBrand } from "@/lib/branding";

describe("branding utils", () => {
  describe("hexToRgba", () => {
    it("deve converter hex para rgba corretamente", () => {
      const result = hexToRgba("#D4AF37", 0.5);
      expect(result).toBe("rgba(212, 175, 55, 0.5)");
    });

    it("deve lidar com hex sem alpha (opacity 1)", () => {
      const result = hexToRgba("#000000", 1);
      expect(result).toBe("rgba(0, 0, 0, 1)");
    });

    it("deve lidar com hex curto (#FFF)", () => {
      const result = hexToRgba("#FFF", 0.5);
      expect(result).toBe("rgba(255, 255, 255, 0.5)");
    });

    it("deve retornar rgba válido mesmo para hex inválido (fallback)", () => {
      const result = hexToRgba("invalid", 0.5);
      expect(result).toMatch(/^rgba\(\d+, \d+, \d+, [\d.]+\)$/);
    });

    it("deve retornar rgba válido para string vazia (fallback)", () => {
      const result = hexToRgba("", 0.5);
      expect(result).toMatch(/^rgba\(\d+, \d+, \d+, [\d.]+\)$/);
    });
  });

  describe("contrastTextOnBrand", () => {
    it("deve retornar branco (lowercase) para cor escura", () => {
      const result = contrastTextOnBrand("#000000");
      expect(result.toLowerCase()).toBe("#ffffff");
    });

    it("deve retornar preto para cor clara", () => {
      const result = contrastTextOnBrand("#FFFFFF");
      expect(result).toBe("#000000");
    });

    it("deve retornar preto para dourado claro (#D4AF37)", () => {
      const result = contrastTextOnBrand("#D4AF37");
      expect(result).toBe("#000000");
    });

    it("deve retornar branco (lowercase) para cor muito escura", () => {
      const result = contrastTextOnBrand("#121212");
      expect(result.toLowerCase()).toBe("#ffffff");
    });

    it("deve lidar com hex inválido retornando preto", () => {
      const result = contrastTextOnBrand("invalid");
      expect(result).toBe("#000000");
    });
  });
});
