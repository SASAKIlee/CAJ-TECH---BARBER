import { useState } from "react";
import { Users, Scissors, Plus, Trash2, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { barbeiroSchema, servicoSchema } from "@/lib/schemas";
import { toast } from "sonner";

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
  onRemoveServico
}: any) {
  
  // Estados dos formulários (Apenas Barbeiro e Serviço)
  const [nBarbeiro, setNBarbeiro] = useState({ nome: "", comissao: "50", email: "", senha: "" });
  const [nServico, setNServico] = useState({ nome: "", preco: "" });

  const formatarMoeda = (v: any) => Number(v || 0).toFixed(2);

  // --- FUNÇÕES DE ADIÇÃO ---

  const handleAddBarbeiro = () => {
    const validacao = barbeiroSchema.safeParse({
      nome: nBarbeiro.nome,
      email: nBarbeiro.email,
      senha: nBarbeiro.senha,
      comissao: nBarbeiro.comissao
    });

    if (!validacao.success) return toast.error(validacao.error.errors[0].message);

    onAddBarbeiro(
      validacao.data.nome, 
      Number(validacao.data.comissao), 
      validacao.data.email, 
      validacao.data.senha
    );
    setNBarbeiro({ nome: "", comissao: "50", email: "", senha: "" });
  };

  const handleAddServico = () => {
    const validacao = servicoSchema.safeParse(nServico);
    if (!validacao.success) return toast.error(validacao.error.errors[0].message);

    onAddServico(validacao.data.nome, Number(validacao.data.preco));
    setNServico({ nome: "", preco: "" });
  };

  return (
    <div className="space-y-8 pb-32">
      
      {/* 1. DASHBOARD FINANCEIRO (Faturamento - Comissões = Lucro) */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 bg-[#161616] border-zinc-800">
          <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-1">Entradas Hoje</p>
          <p className="text-2xl font-black text-white">R$ {formatarMoeda(faturamentoHoje)}</p>
        </Card>
        <Card className="p-4 bg-primary border-none shadow-lg shadow-primary/20">
          <p className="text-[10px] uppercase font-black text-black/60 tracking-widest mb-1">Lucro Real Hoje</p>
          <p className="text-2xl font-black text-black">R$ {formatarMoeda(lucroRealHoje)}</p>
        </Card>
        <Card className="p-4 bg-[#1A1A1A] border-zinc-800">
          <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-1">Faturamento Mensal</p>
          <p className="text-xl font-black text-white">R$ {formatarMoeda(faturamentoMensal)}</p>
        </Card>
        <Card className="p-4 bg-[#1A1A1A] border-zinc-800">
          <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-1">Comissões Hoje</p>
          <p className="text-xl font-black text-white">R$ {formatarMoeda(comissoesAPagarHoje)}</p>
        </Card>
      </div>

      {/* 2. GESTÃO DE EQUIPE */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="font-black text-white uppercase text-sm tracking-tighter italic">Equipe e Acessos</h3>
        </div>
        <Card className="p-4 bg-[#1A1A1A] border-zinc-800 space-y-4 shadow-2xl">
          <input placeholder="Nome do Barbeiro" className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-3 text-sm text-white outline-none focus:border-primary" 
            value={nBarbeiro.nome} onChange={e => setNBarbeiro({...nBarbeiro, nome: e.target.value})} />
          <div className="flex gap-2">
            <input placeholder="Email de Login" className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md p-3 text-sm text-white outline-none focus:border-primary" 
              value={nBarbeiro.email} onChange={e => setNBarbeiro({...nBarbeiro, email: e.target.value})} />
            <input placeholder="%" type="number" className="w-20 bg-zinc-900 border border-zinc-800 rounded-md p-3 text-sm text-white outline-none focus:border-primary" 
              value={nBarbeiro.comissao} onChange={e => setNBarbeiro({...nBarbeiro, comissao: e.target.value})} />
          </div>
          <input placeholder="Senha (mínimo 6 caracteres)" type="password" className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-3 text-sm text-white outline-none focus:border-primary" 
            value={nBarbeiro.senha} onChange={e => setNBarbeiro({...nBarbeiro, senha: e.target.value})} />
          <Button className="w-full h-12 bg-primary text-black font-black uppercase" onClick={handleAddBarbeiro}>Cadastrar Barbeiro</Button>
        </Card>
        
        <div className="grid gap-2">
          {barbeiros.map((b: any) => (
            <div key={b.id} className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
              <span className="text-xs font-bold text-white uppercase">{b.nome} ({b.comissao_pct}%)</span>
              <Button variant="ghost" size="sm" onClick={() => onRemoveBarbeiro(b.id)} className="text-zinc-600 hover:text-red-500">
                <Trash2 className="h-4 w-4"/>
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* 3. GESTÃO DE SERVIÇOS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Scissors className="h-4 w-4 text-primary" />
          <h3 className="font-black text-white uppercase text-sm tracking-tighter italic">Serviços</h3>
        </div>
        <Card className="p-4 bg-[#1A1A1A] border-zinc-800 flex gap-2">
          <input placeholder="Nome do Serviço" className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md p-2 text-sm text-white outline-none" 
            value={nServico.nome} onChange={e => setNServico({...nServico, nome: e.target.value})} />
          <input placeholder="R$" type="number" className="w-24 bg-zinc-900 border border-zinc-800 rounded-md p-2 text-sm text-white outline-none" 
            value={nServico.preco} onChange={e => setNServico({...nServico, preco: e.target.value})} />
          <Button className="bg-primary text-black" onClick={handleAddServico}><Plus className="h-5 w-5"/></Button>
        </Card>
        <div className="grid grid-cols-2 gap-2">
          {servicos.map((s: any) => (
            <div key={s.id} className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
              <div className="text-[10px]">
                <p className="font-bold text-white uppercase">{s.nome}</p>
                <p className="text-primary font-black">R$ {formatarMoeda(s.preco)}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onRemoveServico(s.id)} className="h-8 w-8 text-zinc-600 hover:text-red-500">
                <Trash2 className="h-4 w-4"/>
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* 4. PERFORMANCE DA EQUIPE */}
      <section className="space-y-4">
        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Desempenho Hoje</h3>
        <div className="grid gap-2">
          {comissaoPorBarbeiroHoje.map((item: any) => (
            <Card key={item.barbeiro?.id} className="p-4 bg-[#161616] border-zinc-800 flex justify-between items-center shadow-lg">
              <div>
                <p className="font-bold text-white uppercase text-xs">{item.barbeiro?.nome}</p>
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">{item.cortes} atendimentos</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-zinc-500 font-black uppercase">A pagar</p>
                <p className="text-lg font-black text-primary italic">R$ {formatarMoeda(item.total)}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}