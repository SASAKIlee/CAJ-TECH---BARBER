import { useState } from "react";
import { DollarSign, TrendingDown, Wallet, Plus, Trash2, Users, Scissors, PieChart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function VisaoDono({ 
  faturamentoHoje, comissoesAPagarHoje, despesasNoDia, lucroRealHoje, despesas, onAddDespesa, onRemoveDespesa, comissaoPorBarbeiroHoje, dataFiltro 
}: any) {
  const [novaDesc, setNovaDesc] = useState("");
  const [novoValor, setNovoValor] = useState("");

  return (
    <div className="space-y-6 pb-10">
      {/* 1. RESUMO FINANCEIRO (ALTO CONTRASTE) */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 bg-[#161616] border-zinc-800">
          <div className="flex items-center gap-2 mb-1 text-zinc-500">
            <DollarSign className="h-3 w-3"/>
            <span className="text-[10px] uppercase font-black tracking-widest">Entradas</span>
          </div>
          <p className="text-2xl font-black text-white">R$ {faturamentoHoje.toFixed(2)}</p>
        </Card>

        <Card className="p-4 bg-[#161616] border-zinc-800">
          <div className="flex items-center gap-2 mb-1 text-zinc-500">
            <Users className="h-3 w-3"/>
            <span className="text-[10px] uppercase font-black tracking-widest">Comissões</span>
          </div>
          <p className="text-2xl font-black text-orange-500">R$ {comissoesAPagarHoje.toFixed(2)}</p>
        </Card>

        <Card className="p-4 bg-[#161616] border-zinc-800">
          <div className="flex items-center gap-2 mb-1 text-zinc-500">
            <TrendingDown className="h-3 w-3"/>
            <span className="text-[10px] uppercase font-black tracking-widest">Gastos Extras</span>
          </div>
          <p className="text-2xl font-black text-red-500">R$ {despesasNoDia.toFixed(2)}</p>
        </Card>

        <Card className="p-4 bg-primary border-none shadow-lg shadow-primary/20">
          <div className="flex items-center gap-2 mb-1 text-black/60">
            <Wallet className="h-3 w-3"/>
            <span className="text-[10px] uppercase font-black tracking-widest">Lucro Real</span>
          </div>
          <p className="text-2xl font-black text-black">R$ {lucroRealHoje.toFixed(2)}</p>
        </Card>
      </div>

      {/* 2. LANÇAR DESPESA EXTRA */}
      <Card className="p-5 bg-[#1A1A1A] border-zinc-800 space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500"></div>
          <h3 className="text-sm font-black text-white uppercase tracking-tighter">Lançar Despesa (Luz, Aluguel, etc)</h3>
        </div>
        <div className="flex gap-2">
          <Input 
            placeholder="Descrição" 
            className="bg-zinc-900 border-zinc-800 text-white h-12 focus:border-primary" 
            value={novaDesc} 
            onChange={e => setNovaDesc(e.target.value)}
          />
          <Input 
            placeholder="R$ 0,00" 
            type="number"
            className="bg-zinc-900 border-zinc-800 text-white h-12 w-32 focus:border-primary font-bold" 
            value={novoValor} 
            onChange={e => setNovoValor(e.target.value)}
          />
          <Button 
            className="bg-primary text-black font-black h-12 px-6 hover:bg-primary/90"
            onClick={() => {
              if(!novaDesc || !novoValor) return;
              onAddDespesa(novaDesc, Number(novoValor), dataFiltro);
              setNovaDesc(""); setNovoValor("");
            }}
          >
            <Plus className="h-6 w-6"/>
          </Button>
        </div>
      </Card>

      {/* 3. HISTÓRICO DE DESPESAS */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Detalhamento de Saídas</h3>
        {despesas.filter((d:any) => d.data === dataFiltro).length === 0 ? (
          <p className="text-center py-6 text-zinc-600 text-xs italic">Nenhuma despesa extra registrada neste dia.</p>
        ) : (
          despesas.filter((d:any) => d.data === dataFiltro).map((d: any) => (
            <div key={d.id} className="flex justify-between items-center bg-[#161616] p-4 rounded-2xl border border-zinc-800/50">
              <div>
                <p className="text-sm font-bold text-zinc-100 uppercase tracking-tight">{d.descricao}</p>
                <Badge variant="outline" className="text-[9px] border-red-500/30 text-red-400 font-black">SAÍDA</Badge>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-lg font-black text-white">R$ {Number(d.valor).toFixed(2)}</p>
                <Button variant="ghost" size="icon" className="text-zinc-700 hover:text-red-500 h-8 w-8" onClick={() => onRemoveDespesa(d.id)}>
                  <Trash2 className="h-4 w-4"/>
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4. PERFORMANCE DOS BARBEIROS (CORTES E COMISSÃO) */}
      <div className="space-y-3 pt-4">
        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Produção da Equipe</h3>
        <div className="grid gap-3">
          {comissaoPorBarbeiroHoje.map((item: any) => (
            <Card key={item.barbeiro.id} className="p-4 bg-[#161616] border-zinc-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Scissors className="h-5 w-5 text-primary"/>
                </div>
                <div>
                  <p className="font-bold text-white uppercase text-sm">{item.barbeiro.nome}</p>
                  <p className="text-[10px] text-zinc-500 font-bold">{item.cortes} cortes realizados</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-zinc-500 font-black uppercase">Comissão</p>
                <p className="text-lg font-black text-primary">R$ {item.total.toFixed(2)}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}