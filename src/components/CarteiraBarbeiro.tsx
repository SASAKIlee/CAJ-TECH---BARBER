import { useState } from "react";
import { Wallet, Scissors, Calendar, TrendingUp, Clock, Target, Edit2, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  comissaoTotalMes: number;
  totalCortesMes: number;
  nomeBarbeiro: string;
  comissaoHoje?: number;
  cortesHoje?: number;
  metaDiaria?: number;
  onUpdateMeta?: (novaMeta: number) => void;
}

export function CarteiraBarbeiro({ 
  comissaoTotalMes, totalCortesMes, nomeBarbeiro, 
  comissaoHoje = 0, cortesHoje = 0, metaDiaria = 150, onUpdateMeta 
}: Props) {
  const [editandoMeta, setEditandoMeta] = useState(false);
  const [novaMetaValor, setNovaMetaValor] = useState(metaDiaria.toString());

  const progressoMeta = Math.min((comissaoHoje / metaDiaria) * 100, 100);

  const handleSalvarMeta = () => {
    const valorNum = Number(novaMetaValor);
    if (valorNum > 0 && onUpdateMeta) {
      onUpdateMeta(valorNum);
      setEditandoMeta(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-32">
      <div className="bg-primary/10 p-6 rounded-3xl border border-primary/20 backdrop-blur-md">
        <p className="text-[10px] font-black tracking-widest text-primary uppercase mb-1">Painel Financeiro</p>
        <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">
          {nomeBarbeiro} 💸
        </h2>
      </div>

      <div className="grid gap-3">
        <div className="flex justify-between items-end px-1 mt-2">
          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-1">
            <Clock className="h-3 w-3" /> Feito Hoje
          </p>
          
          {/* 🚀 O CONTROLE DA META DO BARBEIRO */}
          <div className="flex items-center gap-2">
            <Target className="h-3 w-3 text-primary" />
            {editandoMeta ? (
              <div className="flex items-center gap-1">
                <span className="text-xs text-zinc-500 font-bold">R$</span>
                <input 
                  type="number" 
                  value={novaMetaValor} 
                  onChange={e => setNovaMetaValor(e.target.value)}
                  className="w-16 bg-black border border-primary/50 text-white text-xs px-2 py-1 rounded-md outline-none"
                  autoFocus
                />
                <button onClick={handleSalvarMeta} className="bg-primary text-black p-1 rounded-md"><Check className="h-3 w-3"/></button>
              </div>
            ) : (
              <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setEditandoMeta(true)}>
                <span className="text-[10px] text-primary font-bold uppercase tracking-widest">Meta: R$ {metaDiaria}</span>
                <Edit2 className="h-3 w-3 text-zinc-500 group-hover:text-primary transition-colors" />
              </div>
            )}
          </div>
        </div>
        
        {/* A BARRA DE PROGRESSO GAMIFICADA */}
        <div className="w-full bg-zinc-900 rounded-full h-2.5 mb-2 border border-zinc-800">
          <div className="bg-primary h-2.5 rounded-full transition-all duration-1000 ease-out relative" style={{ width: `${progressoMeta}%` }}>
            {progressoMeta >= 100 && (
              <div className="absolute right-0 -top-1 w-4 h-4 bg-white rounded-full shadow-[0_0_10px_#fff] animate-pulse" />
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-5 flex flex-col gap-2 bg-zinc-900/50 border border-zinc-800 rounded-[22px] backdrop-blur-md">
            <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center"><Wallet className="h-4 w-4 text-green-500" /></div>
            <div>
              <p className="text-[9px] text-zinc-400 uppercase font-black tracking-widest">Sua Comissão</p>
              <p className="text-2xl font-black text-white italic">R$ {comissaoHoje.toFixed(2)}</p>
            </div>
          </Card>
          <Card className="p-5 flex flex-col gap-2 bg-zinc-900/50 border border-zinc-800 rounded-[22px] backdrop-blur-md">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"><Scissors className="h-4 w-4 text-primary" /></div>
            <div>
              <p className="text-[9px] text-zinc-400 uppercase font-black tracking-widest">Atendimentos</p>
              <p className="text-2xl font-black text-white italic">{cortesHoje}</p>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-3 pt-4">
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest px-1 flex items-center gap-1"><Calendar className="h-3 w-3" /> Resumo do Mês</p>
        <Card className="p-4 flex items-center gap-4 bg-black/40 border border-zinc-800 rounded-[22px]">
          <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-zinc-400" /></div>
          <div>
            <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Total Acumulado</p>
            <p className="text-xl font-bold text-white">R$ {comissaoTotalMes.toFixed(2)}</p>
            <p className="text-[10px] text-zinc-600 font-bold uppercase mt-0.5">{totalCortesMes} cortes finalizados</p>
          </div>
        </Card>
      </div>
    </div>
  );
}