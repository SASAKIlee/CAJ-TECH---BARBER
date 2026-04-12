/**
 * Rate Limiter simples para prevenir spam no agendamento público.
 * Limita a 5 tentativas por IP/sessão por hora.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hora

/**
 * Verifica se o identificador (IP ou session) excedeu o limite.
 * @param identifier Identificador único (IP, session ID, etc.)
 * @returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  // Se não existe ou expirou, cria novo
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: LIMIT - 1, resetAt: now + WINDOW_MS };
  }

  // Incrementa contador
  entry.count += 1;

  if (entry.count > LIMIT) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: LIMIT - entry.count, resetAt: entry.resetAt };
}

/**
 * Limpa entrada específica do rate limiter.
 */
export function clearRateLimit(identifier: string): void {
  rateLimitMap.delete(identifier);
}

/**
 * Limpa entradas expiradas (chamar periodicamente).
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}
