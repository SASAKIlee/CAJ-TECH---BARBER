import { useState } from "react";
import { DollarSign, TrendingDown, Wallet, Plus, Trash2, Users, Scissors, Briefcase, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// IMPORTANDO O ZOD E O TOAST
import { barbeiroSchema, servicoSchema, despesaSchema } from "@/lib/schemas";
import { toast } from "sonner";

export function VisaoDono({ 
  faturamentoHoje = 0, faturamentoMensal = 0, comissoesAPagarHoje = 0, despesasNoDia = 0, lucroRealHoje = 0, 
  despesas = [], onAddDespesa, onRemoveDespesa, 
  comissaoPorBarbeiroHoje = [], dataFiltro,
  barbeiros = [], servicos = [], 
  onAddBarbeiro, onRemoveBarbeiro, onAddServico, onRemoveServico 
}: any) {
  
  // States para os formulários
  const [novaDesc, setNovaDesc] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [nBarbeiro, setNBarbeiro] = useState({ nome: "", comissao: "50", email: "", senha: "" });
  const [nServico, setNServico] = useState({ nome: "", preco: "" });

  const formatarMoeda = (v: any) => Number(v || 0).toFixed(2);

  // --- FUNÇÕES DE VALIDAÇÃO COM ZOD ---

  const handleAddBarbeiro = () => {
    const validacao = barbeiroSchema.safeParse({
      nome: nBarbeiro.nome,
      email: nBarbeiro.email,
      senha: nBarbeiro.senha,
      comissao: nBarbeiro.comissao
    });

    if (!validacao.success) {
      return toast.error(validacao.error.errors[0].message);
    }

    onAddBarbeiro(validacao.data.nome, validacao.data.comissao, validacao.data.email, validacao.data.senha);
    toast.success("Barbeiro cadastrado com sucesso! ✂️");
    setNBarbeiro({ nome: "", comissao: "50", email: "", senha: "" });
  };

  const handleAddServico = () => {
    const validacao = servicoSchema.safeParse({
      nome: nServico.nome,
      preco: nServico.preco
    });

    if (!validacao.success) {
      return toast.error(validacao.error.errors[0].message);
    }

    onAddServico(validacao.data.nome, validacao.data.preco);
    toast.success("Serviço adicionado com sucesso!");
    setNServico({ nome: "", preco: "" });
  };

  const handleAddDespesa = () => {
    const validacao = despesaSchema.safeParse({
      descricao: novaDesc,
      valor: novoValor,
      data: dataFiltro
    });

    if (!validacao.success) {
      return toast.error(validacao.error.errors[0].message);
    }

    onAddDespesa({
      descricao: validacao.data.descricao,
      valor: validacao.data.valor,
      data: validacao.data.data
    });
    toast.success("Despesa registrada no caixa! 💸");
    setNovaDesc(""); 
    setNovoValor("");
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* 1. RESUMO DIÁRIO (MANTIDO) */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 bg-[#161616] border-zinc-800">
          <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-1">Hoje (Bruto)</p>
          <p className="text-2xl font-black text-white">R$ {formatarMoeda(faturamentoHoje)}</p>
        </Card>
        <Card className="p-4 bg-primary border-none">
          <p className="text-[10px] uppercase font-black text-black/60 tracking-widest mb-1">Hoje (Lucro)</p>
          <p className="text-2xl font-black text-black">R$ {formatarMoeda(lucroRealHoje)}</p>
        </Card>
      </div>

      {/* 🚀 2. NOVO: RESUMO MENSAL ACUMULADO */}
      <Card className="p-5 bg-zinc-900/40 border-2 border-dashed border-zinc-800 flex justify-between items-center overflow-hidden relative">
        <div className="space-y-1 relative z-10">
          <p className="text-[10px] uppercase font-black text-primary tracking-[0.2em]">Faturamento Mensal</p>
          <p className="text-4xl font-black text-white tracking-tighter">
            R$ {formatarMoeda(faturamentoMensal)}
          </p>
          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
            Total acumulado desde o dia 01
          </p>
        </div>
        <TrendingUp className="h-12 w-12 text-primary/10 absolute -right-2 -bottom-2 rotate-12" />
      </Card>

      {/* 2. GESTÃO DE EQUIPE (BARBEIROS) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="font-black text-white uppercase text-sm tracking-tighter">Gestão de Barbeiros</h3>
        </div>
        <Card className="p-4 bg-[#1A1A1A] border-zinc-800 space-y-3">
          <input placeholder="Nome do Barbeiro" className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-sm text-white" 
            value={nBarbeiro.nome} onChange={e => setNBarbeiro({...nBarbeiro, nome: e.target.value})} />
          <div className="flex gap-2">
            <input placeholder="Email" className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md p-2 text-sm text-white" 
              value={nBarbeiro.email} onChange={e => setNBarbeiro({...nBarbeiro, email: e.target.value})} />
            <input placeholder="Comissão %" type="number" className="w-24 bg-zinc-900 border border-zinc-800 rounded-md p-2 text-sm text-white" 
              value={nBarbeiro.comissao} onChange={e => setNBarbeiro({...nBarbeiro, comissao: e.target.value})} />
          </div>
          <div className="flex gap-2">
            <input placeholder="Senha de Acesso" type="password" className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md p-2 text-sm text-white" 
              value={nBarbeiro.senha} onChange={e => setNBarbeiro({...nBarbeiro, senha: e.target.value})} />
            {/* Trocado o onClick para usar a nossa função validada */}
            <Button className="bg-primary text-black font-black" onClick={handleAddBarbeiro}>Adicionar</Button>
          </div>
        </Card>
        
        <div className="grid gap-2">
          {barbeiros.map((b: any) => (
            <div key={b.id} className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
              <span className="text-sm font-bold text-white uppercase">{b.nome} ({b.comissao_pct}%)</span>
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
          <Briefcase className="h-4 w-4 text-primary" />
          <h3 className="font-black text-white uppercase text-sm tracking-tighter">Serviços e Preços</h3>
        </div>
        <Card className="p-4 bg-[#1A1A1A] border-zinc-800 flex gap-2">
          <input placeholder="Nome do Serviço" className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md p-2 text-sm text-white" 
            value={nServico.nome} onChange={e => setNServico({...nServico, nome: e.target.value})} />
          <input placeholder="Preço" type="number" className="w-24 bg-zinc-900 border border-zinc-800 rounded-md p-2 text-sm text-white" 
            value={nServico.preco} onChange={e => setNServico({...nServico, preco: e.target.value})} />
          {/* Trocado o onClick para usar a nossa função validada */}
          <Button className="bg-primary text-black font-black" onClick={handleAddServico}> <Plus className="h-5 w-5"/> </Button>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          {servicos.map((s: any) => (
            <div key={s.id} className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
              <div className="text-xs">
                <p className="font-bold text-white uppercase">{s.nome}</p>
                <p className="text-primary font-black">R$ {formatarMoeda(s.preco)}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onRemoveServico(s.id)} className="text-zinc-600 hover:text-red-500 h-8 w-8">
                <Trash2 className="h-4 w-4"/>
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* 4. LANÇAR DESPESA EXTRA */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <TrendingDown className="h-4 w-4 text-red-500" />
          <h3 className="font-black text-white uppercase text-sm tracking-tighter">Despesas do Dia</h3>
        </div>
        <Card className="p-4 bg-[#1A1A1A] border-zinc-800 flex gap-2">
          <input placeholder="Ex: Aluguel, Luz..." className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md p-2 text-sm text-white" 
            value={novaDesc} onChange={e => setNovaDesc(e.target.value)} />
          <input placeholder="Valor" type="number" className="w-24 bg-zinc-900 border border-zinc-800 rounded-md p-2 text-sm text-white" 
            value={novoValor} onChange={e => setNovoValor(e.target.value)} />
          {/* Trocado o onClick para usar a nossa função validada */}
          <Button className="bg-red-500 text-white font-black" onClick={handleAddDespesa}> <Plus className="h-5 w-5"/> </Button>
        </Card>
      </section>

      {/* 5. PERFORMANCE DA EQUIPE */}
      <section className="space-y-4">
        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Produção de Hoje</h3>
        <div className="grid gap-2">
          {comissaoPorBarbeiroHoje.map((item: any) => (
            <Card key={item.barbeiro?.id} className="p-4 bg-[#161616] border-zinc-800 flex justify-between items-center">
              <div>
                <p className="font-bold text-white uppercase text-sm">{item.barbeiro?.nome}</p>
                <p className="text-[10px] text-zinc-500 font-bold">{item.cortes} cortes realizados</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-zinc-500 font-black uppercase">Comissão</p>
                <p className="text-lg font-black text-primary">R$ {formatarMoeda(item.total)}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}