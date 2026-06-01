
export type PlanoType = "starter" | "pro" | "elite";
 
export const VALORES_PLANO: Record<PlanoType, number> = {
  starter: 35.0,
  pro: 80.0,
  elite: 500.0,
};
 
export const NOMES_PLANO: Record<PlanoType, string> = {
  starter: "Starter",
  pro: "Pro",
  elite: "Elite",
};
 
/** Retorna o valor do plano com fallback seguro para "pro". */
export function getValorPlano(plano?: string): number {
  return VALORES_PLANO[(plano as PlanoType) ?? "pro"] ?? VALORES_PLANO.pro;
}
 
