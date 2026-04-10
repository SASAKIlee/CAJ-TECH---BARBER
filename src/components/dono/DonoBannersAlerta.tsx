import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DonoBannersAlertaProps } from "@/types/dono";

export function DonoBannersAlerta({
  planoAtual,
  fasePagamento,
  diasRestantes,
  onUpgradeClick,
  onRenovacaoClick,
}: DonoBannersAlertaProps) {
  if (planoAtual === "starter" && fasePagamento === 1) {
    return (
      <Button
        variant="outline"
        onClick={onUpgradeClick}
        className="w-full bg-emerald-500/5 border-emerald-500/20 text-emerald-500 font-black text-[10px] uppercase h-10 rounded-xl gap-2"
      >
        <Crown className="h-4 w-4" /> Evoluir para o Plano PRO
      </Button>
    );
  }
  if (fasePagamento === 2) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-[20px] flex items-center justify-between text-yellow-500 text-[10px] font-black uppercase">
        <span className="flex items-center gap-2">
          <span className="animate-pulse h-2.5 w-2.5 bg-yellow-500 rounded-full" /> Vencimento em {diasRestantes} dias
        </span>
        <Button size="sm" onClick={onRenovacaoClick} className="bg-yellow-500 text-black h-10 px-6 rounded-xl font-black">
          Pagar
        </Button>
      </div>
    );
  }
  if (fasePagamento === 3) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-[20px] flex flex-col sm:flex-row gap-3 items-center justify-between text-red-500 text-[10px] font-black uppercase">
        <span className="flex items-center gap-2">
          <span className="animate-pulse h-2.5 w-2.5 bg-red-500 rounded-full" /> Vencido: {3 + (diasRestantes || 0)} dias
        </span>
        <Button
          size="sm"
          onClick={onRenovacaoClick}
          className="bg-red-600 text-white h-10 px-6 rounded-xl shadow-lg shadow-red-500/20 font-black"
        >
          Regularizar
        </Button>
      </div>
    );
  }
  return null;
}
