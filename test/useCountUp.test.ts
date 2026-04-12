import { describe, it, expect, vi } from "vitest";

// Mock do window.performance
vi.stubGlobal("performance", {
  now: () => 0,
});

// Simulação simplificada do hook para teste
function simulateCountUp(target: number, duration: number): number {
  // Simula o easing cúbico
  const t = Math.min(1, 100 / duration); // assume 100ms passed
  const eased = 1 - (1 - t) ** 3;
  return Math.round(0 + (target - 0) * eased);
}

describe("count-up simulation", () => {
  it("deve calcular valor intermediário corretamente", () => {
    const result = simulateCountUp(100, 900);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(100);
  });

  it("deve retornar 0 para target 0", () => {
    const result = simulateCountUp(0, 900);
    expect(result).toBe(0);
  });

  it("deve calcular easing corretamente para 50% do tempo", () => {
    // 50% do tempo com easing cúbico = ~87.5% do valor
    const t = 0.5;
    const eased = 1 - (1 - t) ** 3;
    expect(eased).toBeCloseTo(0.875, 3);
  });
});
