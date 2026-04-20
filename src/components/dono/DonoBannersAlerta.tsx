import { useMemo } from "react";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DonoBannersAlertaProps } from "@/types/dono";

export function DonoBannersAlerta({
  planoAtual,
  fasePagamento,
  diasRestantes = 0,
  onUpgradeClick,
  onRenovacaoClick,
}: DonoBannersAlertaProps) {
  // Calcula dias vencidos apenas quando necessário (fase 3)
  const diasVencidos = useMemo(() => {
    if (fasePagamento === 3 && diasRestantes < 0) {
      return Math.abs(diasRestantes);
    }
    return null;
  }, [fasePagamento, diasRestantes]);

  // Banner de upgrade para plano Starter
  if (planoAtual === "starter" && fasePagamento === 1) {
    return (
      <Button
        variant="outline"
        onClick={onUpgradeClick}
        className="w-full bg-emerald-500/5 border-emerald-500/20 text-emerald-500 font-black text-[10px] uppercase h-10 rounded-xl gap-2"
        aria-label="Fazer upgrade para o plano PRO"
      >
        <Crown className="h-4 w-4" aria-hidden="true" />
        Evoluir para o Plano PRO
      </Button>
    );
  }

  // Banner de vencimento próximo (fase 2)
  if (fasePagamento === 2) {
    return (
      <div
        className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-[20px] flex items-center justify-between text-yellow-500 text-[10px] font-black uppercase"
        role="alert"
        aria-live="polite"
      >
        <span className="flex items-center gap-2">
          <span className="animate-pulse h-2.5 w-2.5 bg-yellow-500 rounded-full" aria-hidden="true" />
          Vencimento em {diasRestantes} {diasRestantes === 1 ? "dia" : "dias"}
        </span>
        <Button
          size="sm"
          onClick={onRenovacaoClick}
          className="bg-yellow-500 text-black h-10 px-6 rounded-xl font-black"
          aria-label="Pagar fatura"
        >
          Pagar
        </Button>
      </div>
    );
  }

  // Banner de fatura vencida (fase 3)
  if (fasePagamento === 3) {
    const diasAtraso = diasVencidos ?? Math.abs(diasRestantes) + 3;
    return (
      <div
        className="bg-red-500/10 border border-red-500/30 p-4 rounded-[20px] flex flex-col sm:flex-row gap-3 items-center justify-between text-red-500 text-[10px] font-black uppercase"
        role="alert"
        aria-live="assertive"
      >
        <span className="flex items-center gap-2">
          <span className="animate-pulse h-2.5 w-2.5 bg-red-500 rounded-full" aria-hidden="true" />
          Vencido há {diasAtraso} {diasAtraso === 1 ? "dia" : "dias"}
        </span>
        <Button
          size="sm"
          onClick={onRenovacaoClick}
          className="bg-red-600 text-white h-10 px-6 rounded-xl shadow-lg shadow-red-500/20 font-black"
          aria-label="Regularizar pagamento"
        >
          Regularizar
        </Button>
      </div>
    );
  }

  return null;
}