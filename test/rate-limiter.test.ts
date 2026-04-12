import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkRateLimit, clearRateLimit, cleanupRateLimits } from "@/lib/rate-limiter";

describe("rate-limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deve permitir primeiras 5 requisições", () => {
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit("user-1");
      expect(result.allowed).toBe(true);
    }
  });

  it("deve bloquear após 5 requisições", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("user-2");
    }
    const result = checkRateLimit("user-2");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("deve resetar após o tempo de janela", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("user-3");
    }
    // Avançar 1 hora + 1ms
    vi.advanceTimersByTime(60 * 60 * 1000 + 1);
    const result = checkRateLimit("user-3");
    expect(result.allowed).toBe(true);
  });

  it("deve retornar remaining correto", () => {
    checkRateLimit("user-4");
    const result = checkRateLimit("user-4");
    expect(result.remaining).toBe(3); // 5 - 2 = 3
  });

  it("deve limpar entrada específica", () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit("user-5");
    }
    clearRateLimit("user-5");
    const result = checkRateLimit("user-5");
    expect(result.allowed).toBe(true);
  });

  it("deve fazer cleanup de entradas expiradas", () => {
    checkRateLimit("user-6");
    vi.advanceTimersByTime(60 * 60 * 1000 + 1);
    cleanupRateLimits();
    const result = checkRateLimit("user-6");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4); // Resetou
  });
});
