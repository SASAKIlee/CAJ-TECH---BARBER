import { useState } from "react";
import { Users, Scissors, Trash2, Plus, Power, PowerOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { barbeiroSchema, servicoSchema } from "@/lib/schemas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function VisaoDono({ 
  faturamentoHoje = 0, 
  comissoesAPagarHoje = 0, 
  lucroRealHoje = 0, 
  faturamentoMensal = 0,
  comissaoPorBarbeiroHoje = [], 
  barbeiros = [], 
  servicos = [], 
  onAddBarbeiro, 
  onRemoveBarbeiro, 
  onAddServico, 
  onRemoveServico,
  onToggleBarbeiroStatus 
}: any) {
  
  const [nBarbeiro, setNBarbeiro] = useState({ nome: "", comissao: "50", email: "", senha: "" });
  const [nServico, setNServico] = useState({ nome: "", preco: "" });

  const formatarMoeda = (v: any) => Number(v || 0).toFixed(2);

  const handleAddBarbeiro = () => {
    const validacao = barbeiroSchema.safeParse(nBarbeiro);
    if (!validacao.success) return toast.error(validacao.error.errors[0].message);
    
    onAddBarbeiro(validacao.data.nome, Number(validacao.data.comissao), validacao.data.email, validacao.data.senha);
    setNBarbeiro({ nome: "", comissao: "50", email: "", senha: "" });
  };

  const handleAddServico = () => {
    const validacao = servicoSchema.safeParse(nServico);
    if (!validacao.success) return toast.error(validacao.error.errors[0].message);

    onAddServico(validacao.data.nome, Number(validacao.data.preco));
    setNServico({ nome: "", preco: "" });
  };

  return (
    <div className="space-y-8 pb-32 w-full max-w-full overflow-x-hidden">
      
      {/* 1. DASHBOARD FINANCEIRO */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 bg-[#161616] border-zinc-800">
          <p className="text-[10px] uppercase font-black text-zinc-500 mb-1">Entradas Hoje</p>
          <p className="text-xl font-black text-white">R$ {formatarMoeda(faturamentoHoje)}</p>
        </Card>
        <Card className="p-4 bg-primary border-none shadow-lg shadow-primary/20">
          <p className="text-[10px] uppercase font-black text-black/60 mb-1">Lucro Real Hoje</p>
          <p className="text-xl font-black text-black">R$ {formatarMoeda(lucroRealHoje)}</p>
        </Card>
        <Card className="p-4 bg-[#1A1A1A] border-zinc-800">
          <p className="text-[10px] uppercase font-black text-zinc-500 mb-1">Faturamento Mês</p>
          <p className="text-lg font-black text-white">R$ {formatarMoeda(faturamentoMensal)}</p>
        </Card>
        <Card className="p-4 bg-[#1A1A1A] border-zinc-800">
          <p className="text-[10px] uppercase font-black text-zinc-500 mb-1">Comissões Hoje</p>
          <p className="text-lg font-black text-white">R$ {formatarMoeda(comissoesAPagarHoje)}</p>
        </Card>
      </div>

      {/* 2. GESTÃO DE EQUIPE */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="font-black text-white uppercase text-sm italic tracking-tighter">Equipe</h3>
        </div>
        <Card className="p-4 bg-[#1A1A1A] border-zinc-800 space-y-3 shadow-2xl">
          <input placeholder="Nome do Barbeiro" className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-3 text-sm text-white outline-none focus:border-primary" 
            value={nBarbeiro.nome} onChange={e => setNBarbeiro({...nBarbeiro, nome: e.target.value})} />
          <div className="flex gap-2">
            <input placeholder="Email" className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md p-3 text-sm text-white outline-none focus:border-primary w-full" 
              value={nBarbeiro.email} onChange={e => setNBarbeiro({...nBarbeiro, email: e.target.value})} />
            <input placeholder="%" type="number" className="w-20 bg-zinc-900 border border-zinc-800 rounded-md p-3 text-sm text-white outline-none focus:border-primary" 
              value={nBarbeiro.comissao} onChange={e => setNBarbeiro({...nBarbeiro, comissao: e.target.value})} />
          </div>
          <input placeholder="Senha" type="password" className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-3 text-sm text-white outline-none focus:border-primary" 
            value={nBarbeiro.senha} onChange={e => setNBarbeiro({...nBarbeiro, senha: e.target.value})} />
          <Button className="w-full bg-primary text-black font-black uppercase h-12" onClick={handleAddBarbeiro}>Cadastrar Barbeiro</Button>
        </Card>
        {/* ... (lista de barbeiros continua igual) ... */}
      </section>

      {/* 3. GESTÃO DE SERVIÇOS (CORRIGIDO PARA MOBILE) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Scissors className="h-4 w-4 text-primary" />
          <h3 className="font-black text-white uppercase text-sm italic tracking-tighter">Serviços e Preços</h3>
        </div>
        
        <Card className="p-4 bg-[#1A1A1A] border-zinc-800 shadow-xl space-y-3">
          {/* Nome do serviço ocupa a linha toda */}
          <input 
            placeholder="Nome do Serviço" 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-3 text-sm text-white outline-none focus:border-primary" 
            value={nServico.nome} 
            onChange={e => setNServico({...nServico, nome: e.target.value})} 
          />
          
          <div className="flex gap-2">
            {/* Preço ocupa o máximo de espaço possível */}
            <div className="relative flex-1">
              <span className="absolute left-3 top-3 text-zinc-500 text-sm">R$</span>
              <input 
                placeholder="0,00" 
                type="number" 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-3 pl-9 text-sm text-white outline-none focus:border-primary" 
                value={nServico.preco} 
                onChange={e => setNServico({...nServico, preco: e.target.value})} 
              />
            </div>
            
            {/* Botão de adicionar */}
            <Button 
              className="bg-primary text-black font-bold h-12 w-14 shrink-0" 
              onClick={handleAddServico}
            >
              <Plus className="h-6 w-6 stroke-[3px]"/>
            </Button>
          </div>
        </Card>

        {/* Lista de serviços em grid de 1 coluna para mobile e 2 para tablet */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {servicos.map((s: any) => (
            <div key={s.id} className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
              <div className="text-[11px]">
                <p className="font-bold text-white uppercase">{s.nome}</p>
                <p className="text-primary font-black italic">R$ {formatarMoeda(s.preco)}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onRemoveServico(s.id)} className="h-9 w-9 text-zinc-600 hover:text-red-500">
                <Trash2 className="h-4 w-4"/>
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* 4. PERFORMANCE DA EQUIPE */}
      {/* ... (o resto do código de performance) ... */}

    </div>
  );
}