import { X, Crown, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DonoModalUpgradeProps, PlanoType } from "@/types/dono";

const VALORES_PLANO: Record<PlanoType, number> = {
  starter: 50.0,
  pro: 99.9,
  elite: 497.0,
};

export function DonoModalUpgrade({ open, onClose, planoAtual, onUpgrade }: DonoModalUpgradeProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl overflow-y-auto">
      <div className="w-full max-w-4xl py-10 mt-10">
        <div className="flex justify-between items-center mb-8 px-4">
          <h2 className="text-white font-black uppercase italic text-2xl tracking-tighter">Planos CAJ TECH</h2>
          <button
            onClick={onClose}
            className="bg-white/5 h-12 w-12 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X className="text-zinc-500 h-6 w-6" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
          <Card className="p-6 bg-black border-zinc-800 rounded-3xl flex flex-col justify-between opacity-60">
            <div>
              <h3 className="text-zinc-500 font-black uppercase text-xs tracking-widest">Starter</h3>
              <p className="text-4xl font-black text-white my-4 italic">
                R$ 50<span className="text-xs opacity-30">/mês</span>
              </p>
              <ul className="text-[11px] text-zinc-400 space-y-3 mb-6">
                <li className="flex gap-2 font-bold uppercase">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Até 2 Barbeiros
                </li>
                <li className="flex gap-2 font-bold uppercase">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Link de Agendamento
                </li>
              </ul>
            </div>
            <Button
              variant="outline"
              className="border-zinc-800 text-zinc-500 uppercase font-black text-[10px] h-12 rounded-xl"
              disabled
            >
              Seu Plano Atual
            </Button>
          </Card>

          <Card className="p-6 bg-emerald-500/5 border-emerald-500 border-2 rounded-3xl relative md:scale-105 shadow-2xl z-10 flex flex-col justify-between">
            <div>
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-[9px] font-black uppercase px-4 py-1 rounded-full shadow-lg">
                Mais Vendido
              </span>
              <h3 className="text-emerald-500 font-black uppercase text-xs tracking-widest">PRO</h3>
              <p className="text-5xl font-black text-white my-4 italic">
                R$ 99<span className="text-xs opacity-50">,90/mês</span>
              </p>
              <ul className="text-[11px] text-zinc-300 space-y-3 mb-6">
                <li className="flex gap-2 font-bold uppercase">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Barbeiros Ilimitados
                </li>
                <li className="flex gap-2 font-bold uppercase">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> WhatsApp VIP (Automação)
                </li>
                <li className="flex gap-2 font-bold uppercase">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Clube de Assinatura
                </li>
              </ul>
            </div>
            {planoAtual === "pro" ? (
              <Button
                variant="outline"
                className="w-full bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-black uppercase h-14 rounded-xl"
                disabled
              >
                Seu Plano Atual
              </Button>
            ) : (
              <Button
                onClick={() => onUpgrade("pro")}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase h-14 rounded-xl shadow-lg"
              >
                Evoluir e Pagar
              </Button>
            )}
          </Card>

          <Card className="p-6 bg-black border-zinc-800 rounded-3xl flex flex-col justify-between">
            <div>
              <h3 className="text-yellow-500 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                <Crown className="h-4 w-4" /> Elite
              </h3>
              <p className="text-4xl font-black text-white my-4 italic">
                R$ 497<span className="text-xs opacity-30">/mês</span>
              </p>
              <ul className="text-[11px] text-zinc-400 space-y-3 mb-6">
                <li className="flex gap-2 font-bold uppercase">
                  <CheckCircle2 className="h-4 w-4 text-yellow-500 shrink-0" /> Tudo do Pro +
                </li>
                <li className="flex gap-2 font-bold uppercase">
                  <CheckCircle2 className="h-4 w-4 text-yellow-500 shrink-0" /> Marketing Completo
                </li>
                <li className="flex gap-2 font-bold uppercase">
                  <CheckCircle2 className="h-4 w-4 text-yellow-500 shrink-0" /> Gestão de Tráfego Pago
                </li>
              </ul>
            </div>
            {planoAtual === "elite" ? (
              <Button
                variant="outline"
                className="border-zinc-800 text-zinc-500 uppercase font-black text-[10px] h-12 rounded-xl"
                disabled
              >
                Seu Plano Atual
              </Button>
            ) : (
              <Button
                onClick={() => onUpgrade("elite")}
                className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-black uppercase h-14 rounded-xl shadow-lg"
              >
                Evoluir e Pagar
              </Button>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
