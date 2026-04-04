import { Wallet, Scissors, Calendar, TrendingUp, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Props {
  comissaoTotalMes: number;
  totalCortesMes: number;
  nomeBarbeiro: string;
  // 🚀 ADICIONEI AS PROPS DE HOJE
  comissaoHoje?: number;
  cortesHoje?: number;
}

export function CarteiraBarbeiro({ 
  comissaoTotalMes, 
  totalCortesMes, 
  nomeBarbeiro, 
  comissaoHoje = 0, 
  cortesHoje = 0 
}: Props) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-32">
      <div className="bg-primary/10 p-6 rounded-3xl border border-primary/20 backdrop-blur-md">
        <p className="text-[10px] font-black tracking-widest text-primary uppercase mb-1">Painel Financeiro</p>
        <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">
          {nomeBarbeiro} 💸
        </h2>
      </div>

      {/* 🚀 O CARRO-CHEFE: O QUE IMPORTA É O HOJE */}
      <div className="grid gap-3">
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest px-1 flex items-center gap-1 mt-2">
          <Clock className="h-3 w-3" /> Feito Hoje
        </p>
        
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-5 flex flex-col gap-2 bg-zinc-900/50 border border-zinc-800 rounded-[22px] backdrop-blur-md">
            <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-[9px] text-zinc-400 uppercase font-black tracking-widest">Sua Comissão</p>
              <p className="text-2xl font-black text-white italic">R$ {comissaoHoje.toFixed(2)}</p>
            </div>
          </Card>

          <Card className="p-5 flex flex-col gap-2 bg-zinc-900/50 border border-zinc-800 rounded-[22px] backdrop-blur-md">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Scissors className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[9px] text-zinc-400 uppercase font-black tracking-widest">Atendimentos</p>
              <p className="text-2xl font-black text-white italic">{cortesHoje}</p>
            </div>
          </Card>
        </div>
      </div>

      {/* RESUMO MENSAL */}
      <div className="grid gap-3 pt-4">
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest px-1 flex items-center gap-1">
          <Calendar className="h-3 w-3" /> Resumo do Mês
        </p>
        
        <Card className="p-4 flex items-center gap-4 bg-black/40 border border-zinc-800 rounded-[22px]">
          <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-zinc-400" />
          </div>
          <div>
            <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Total Acumulado</p>
            <p className="text-xl font-bold text-white">R$ {comissaoTotalMes.toFixed(2)}</p>
            <p className="text-[10px] text-zinc-600 font-bold uppercase mt-0.5">{totalCortesMes} cortes finalizados</p>
          </div>
        </Card>
      </div>

      <div className="p-4 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 border-dashed text-center">
        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
          Valores calculados automaticamente ao concluir agendamentos.
        </p>
      </div>
    </div>
  );
}