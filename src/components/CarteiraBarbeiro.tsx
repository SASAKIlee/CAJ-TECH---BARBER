import { useState } from "react";
import { Wallet, Scissors, Calendar, TrendingUp, Clock, Target, Edit2, Check, X, Trophy, Crown, Medal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useCountUp } from "@/hooks/useCountUp";

interface Props {
  comissaoTotalMes: number;
  totalCortesMes: number;
  nomeBarbeiro: string;
  comissaoHoje?: number;
  cortesHoje?: number;
  metaDiaria?: number;
  clientesVIP?: number;
  gorjetaHoje?: number;
  rankingHoje?: number;
  totalBarbeiros?: number;
  onUpdateMeta?: (novaMeta: number) => void;
}

const formatarMoedaBR = (valor: number) => {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor || 0);
};

export function CarteiraBarbeiro({
  comissaoTotalMes, totalCortesMes, nomeBarbeiro,
  comissaoHoje = 0, cortesHoje = 0, metaDiaria = 150, clientesVIP = 0,
  gorjetaHoje = 0, rankingHoje, totalBarbeiros,
  onUpdateMeta
}: Props) {
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [novaMetaValor, setNovaMetaValor] = useState(metaDiaria.toString());

  const progressoMeta = Math.min((comissaoHoje / metaDiaria) * 100, 100);
  const metaBatida = progressoMeta >= 100;

  // Valores animados
  const comissaoAnimada = useCountUp(comissaoHoje);
  const totalMesAnimado = useCountUp(comissaoTotalMes);
  const gorjetaAnimada = useCountUp(gorjetaHoje);

  const handleSalvarMeta = () => {
    const valorNum = Number(novaMetaValor);
    if (valorNum > 0 && onUpdateMeta) {
      onUpdateMeta(valorNum);
      setEditandoMeta(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32">
      
      {/* HEADER PREMIUM */}
      <div className="bg-gradient-to-br from-zinc-900 to-black p-6 rounded-[28px] border border-white/[0.08] shadow-2xl relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 opacity-5">
           <Wallet className="h-32 w-32 rotate-12" />
        </div>
        <p className="text-[10px] font-black tracking-[0.2em] text-emerald-500 uppercase mb-1 flex items-center gap-2">
           <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
           Meu Desempenho
        </p>
        <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">
          {nomeBarbeiro.split(' ')[0]} 💸
        </h2>
      </div>

      {/* SEÇÃO DA META (GAMIFICAÇÃO) */}
      <div className="space-y-3 px-1">
        <div className="flex justify-between items-center">
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Progresso Diário
          </p>
          
          <div className="flex items-center gap-2">
            {editandoMeta ? (
              <div className="flex items-center gap-1 animate-in zoom-in-95">
                <input 
                  type="number" 
                  inputMode="decimal"
                  value={novaMetaValor} 
                  onChange={e => setNovaMetaValor(e.target.value)}
                  className="w-20 bg-zinc-800 border border-emerald-500/50 text-white text-xs font-bold px-3 py-1.5 rounded-xl outline-none"
                  autoFocus
                />
                <button onClick={handleSalvarMeta} className="bg-emerald-500 text-black p-1.5 rounded-lg active:scale-90 transition-transform"><Check className="h-4 w-4 stroke-[3px]"/></button>
                <button onClick={() => setEditandoMeta(false)} className="bg-zinc-800 text-zinc-400 p-1.5 rounded-lg"><X className="h-4 w-4"/></button>
              </div>
            ) : (
              <div className="flex items-center gap-2 cursor-pointer group bg-zinc-900/50 hover:bg-zinc-800 px-3 py-1.5 rounded-full border border-white/5 transition-all" onClick={() => setEditandoMeta(true)}>
                <Target className={cn("h-3.5 w-3.5", metaBatida ? "text-yellow-500" : "text-emerald-500")} />
                <span className="text-[10px] text-zinc-300 font-black uppercase tracking-widest">Meta: R$ {metaDiaria}</span>
                <Edit2 className="h-3 w-3 text-zinc-600 group-hover:text-white transition-colors" />
              </div>
            )}
          </div>
        </div>
        
        {/* BARRA DE PROGRESSO COM GLOW */}
        <div className="relative">
          <div className="w-full bg-zinc-900 rounded-full h-4 border border-zinc-800 p-0.5 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressoMeta}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full transition-all relative",
                metaBatida ? "bg-gradient-to-r from-yellow-600 to-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.4)]" : "bg-emerald-500"
              )}
            >
               {/* Efeito de brilho passando pela barra */}
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-20 animate-[shimmer_2s_infinite]" />
            </motion.div>
          </div>
          {metaBatida && (
             <div className="absolute -right-1 -top-6 animate-bounce">
                <div className="bg-yellow-500 text-black text-[8px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg">
                   <Trophy className="h-2.5 w-2.5" /> META BATIDA!
                </div>
             </div>
          )}
        </div>
      </div>

      {/* CARDS PRINCIPAIS */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-5 flex flex-col gap-3 bg-zinc-900/40 border border-zinc-800/50 rounded-[24px] backdrop-blur-md relative overflow-hidden group">
          <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/10 group-hover:scale-110 transition-transform">
            <Wallet className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Comissão Hoje</p>
            <p className="text-2xl font-black text-white italic tabular-nums">
              R$ <span className="text-emerald-400">{formatarMoedaBR(comissaoAnimada)}</span>
            </p>
          </div>
        </Card>

        <Card className="p-5 flex flex-col gap-3 bg-zinc-900/40 border border-zinc-800/50 rounded-[24px] backdrop-blur-md relative overflow-hidden group">
          <div className="h-10 w-10 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/10 group-hover:scale-110 transition-transform">
            <Scissors className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Atendimentos</p>
            <p className="text-3xl font-black text-white italic tabular-nums">{cortesHoje}</p>
          </div>
        </Card>

        <Card className="p-5 flex flex-col gap-3 bg-gradient-to-br from-emerald-900/40 to-emerald-900/20 border border-emerald-600/30 rounded-[24px] backdrop-blur-md relative overflow-hidden group col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 group-hover:scale-110 transition-transform">
                <Wallet className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-emerald-600/80 uppercase font-black tracking-widest">Gorjetas Hoje</p>
                <p className="text-xl font-black text-emerald-300 italic tabular-nums">R$ {formatarMoedaBR(gorjetaAnimada)}</p>
              </div>
            </div>
            <div className="text-right text-[9px] text-emerald-600/60">
              <p className="font-black uppercase">Extra</p>
              <p className="text-emerald-400 font-bold text-xs mt-0.5">💰 Gorjetas</p>
            </div>
          </div>
        </Card>

        {rankingHoje && totalBarbeiros && (
          <Card className="p-5 flex flex-col gap-3 bg-gradient-to-br from-amber-900/40 to-yellow-900/20 border border-yellow-600/30 rounded-[24px] backdrop-blur-md relative overflow-hidden group col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30 group-hover:scale-110 transition-transform">
                  <Medal className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-[10px] text-yellow-600/80 uppercase font-black tracking-widest">Ranking Hoje</p>
                  <p className="text-xl font-black text-yellow-300 italic">
                    {rankingHoje}º lugar
                  </p>
                </div>
              </div>
              <div className="text-right text-[9px] text-yellow-600/60">
                <p className="font-black uppercase">Entre</p>
                <p className="text-yellow-400 font-bold text-xs mt-0.5">{totalBarbeiros} barbeiros</p>
              </div>
            </div>
          </Card>
        )}

        {clientesVIP > 0 && (
          <Card className="p-5 flex flex-col gap-3 bg-gradient-to-br from-amber-900/40 to-yellow-900/20 border border-yellow-600/30 rounded-[24px] backdrop-blur-md relative overflow-hidden group col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30 group-hover:scale-110 transition-transform">
                  <Crown className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-[10px] text-yellow-600/80 uppercase font-black tracking-widest">Clientes VIP</p>
                  <p className="text-xl font-black text-yellow-300 italic">{clientesVIP} cliente{clientesVIP !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="text-right text-[9px] text-yellow-600/60">
                <p className="font-black uppercase">Status Premium</p>
                <p className="text-yellow-400 font-bold text-xs mt-0.5">👑 Ativo</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* RESUMO MENSAL (CRM) */}
      <div className="space-y-3 pt-2">
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] px-1 flex items-center gap-2">
           <Calendar className="h-4 w-4 text-zinc-600" /> Acumulado do Mês
        </p>
        <Card className="p-5 flex items-center justify-between gap-4 bg-gradient-to-r from-zinc-900/80 to-zinc-900/30 border border-zinc-800 rounded-[28px] shadow-xl">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shadow-inner">
               <TrendingUp className="h-7 w-7 text-zinc-400" />
            </div>
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-0.5">Saldo Disponível</p>
              <p className="text-2xl font-black text-white tabular-nums tracking-tighter">
                R$ {formatarMoedaBR(totalMesAnimado)}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                 <div className="h-1 w-1 rounded-full bg-emerald-500" />
                 <p className="text-[9px] text-zinc-400 font-bold uppercase">{totalCortesMes} cortes finalizados</p>
              </div>
            </div>
          </div>
          <div className="h-12 w-px bg-zinc-800 mx-2" />
          <div className="text-center">
             <p className="text-[10px] text-zinc-600 font-black uppercase">Média/Dia</p>
             <p className="text-sm font-black text-zinc-300">R$ {formatarMoedaBR(comissaoTotalMes / 30)}</p>
          </div>
        </Card>
      </div>

    </div>
  );
}