import { useState } from "react";
import { TrendingDown, Plus, Trash2, Users, Briefcase } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { barbeiroSchema, servicoSchema, despesaSchema } from "@/lib/schemas";
import { toast } from "sonner";

export function VisaoDono({ 
  faturamentoHoje = 0, 
  comissoesAPagarHoje = 0, 
  despesasNoDia = 0, 
  lucroRealHoje = 0, 
  despesas = [], 
  onAddDespesa, 
  onRemoveDespesa, 
  comissaoPorBarbeiroHoje = [], 
  dataFiltro, 
  faturamentoMensal = 0, 
  barbeiros = [], 
  servicos = [], 
  onAddBarbeiro, 
  onRemoveBarbeiro, 
  onAddServico, 
  onRemoveServico 
}: any) {
  
  const [novaDesc, setNovaDesc] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const [nBarbeiro, setNBarbeiro] = useState({ nome: "", comissao: "50", email: "", senha: "" });
  const [nServico, setNServico] = useState({ nome: "", preco: "" });

  const formatarMoeda = (v: any) => Number(v || 0).toFixed(2);

  // Gera a data de hoje sem horas (Meia-noite local)
  const getDataAtualLocal = () => {
    const agora = new Date();
    return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  };

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
    const dataObjeto = getDataAtualLocal();
    
    const validacao = despesaSchema.safeParse({
      descricao: novaDesc,
      valor: novoValor,
      data: dataObjeto
    });

    if (!validacao.success) {
      return toast.error(validacao.error.errors[0].message);
    }

    // 🔥 SOLUÇÃO PARA O ERRO DE PROPERTY: Usamos a variável 'dataObjeto' que é Date garantido
    const y = dataObjeto.getFullYear();
    const m = String(dataObjeto.getMonth() + 1).padStart(2, '0');
    const d = String(dataObjeto.getDate()).padStart(2, '0');
    const dataString = `${y}-${m}-${d}`;

    onAddDespesa({
      descricao: validacao.data.descricao,
      valor: validacao.data.valor,
      data: dataString
    });

    toast.success("Despesa registrada no caixa! 💸");
    setNovaDesc(""); 
    setNovoValor("");
  };

  const formatarDataExibicao = (dStr: string) => {
    if (!dStr) return "Hoje";
    const [y, m, d] = dStr.split("-");
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="space-y-8 pb-20">
      
      <div className="text-right text-xs text-zinc-500 px-1 font-bold">
        VISUALIZANDO: {formatarDataExibicao(dataFiltro)}
      </div>

      {/* 📊 DASHBOARD FINANCEIRO - GRID RESPONSIVO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        
        <Card className="p-4 bg-[#161616] border-zinc-800">
          <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-1">Entradas Hoje</p>
          <p className="text-2xl font-black text-white">R$ {formatarMoeda(faturamentoHoje)}</p>
        </Card>

        <Card className="p-4 bg-primary border-none shadow-lg shadow-primary/10">
          <p className="text-[10px] uppercase font-black text-black/60 tracking-widest mb-1">Lucro Real Hoje</p>
          <p className="text-2xl font-black text-black">R$ {formatarMoeda(lucroRealHoje)}</p>
        </Card>

        <Card className="p-4 bg-[#1A1A1A] border-zinc-800 border-dashed border-2">
          <p className="text-[10px] uppercase font-black text-primary tracking-widest mb-1">Faturamento Mensal</p>
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
          <h3 className="font-black text-white uppercase text-sm tracking-tighter">Barbeiros</h3>
        </div>
        <Card className="p-4 bg-[#1A1A1A] border-zinc-800 space-y-3">
          <input placeholder="Nome" className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-sm text-white" 
            value={nBarbeiro.nome} onChange={e => setNBarbeiro({...nBarbeiro, nome: e.target.value})} />
          <div className="flex gap-2">
            <input placeholder="Email" className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md p-2 text-sm text-white" 
              value={nBarbeiro.email} onChange={e => setNBarbeiro({...nBarbeiro, email: e.target.value})} />
            <input placeholder="%" type="number" className="w-20 bg-zinc-900 border border-zinc-800 rounded-md p-2 text-sm text-white" 
              value={nBarbeiro.comissao} onChange={e => setNBarbeiro({...nBarbeiro, comissao: e.target.value})} />
          </div>
          <div className="flex gap-2">
            <input placeholder="Senha" type="password" className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md p-2 text-sm text-white" 
              value={nBarbeiro.senha} onChange={e => setNBarbeiro({...nBarbeiro, senha: e.target.value})} />
            <Button className="bg-primary text-black font-black" onClick={handleAddBarbeiro}>Cadastrar</Button>
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

      {/* 3. SERVIÇOS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Briefcase className="h-4 w-4 text-primary" />
          <h3 className="font-black text-white uppercase text-sm tracking-tighter">Serviços</h3>
        </div>
        <Card className="p-4 bg-[#1A1A1A] border-zinc-800 flex gap-2">
          <input placeholder="Nome do Serviço" className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md p-2 text-sm text-white" 
            value={nServico.nome} onChange={e => setNServico({...nServico, nome: e.target.value})} />
          <input placeholder="R$" type="number" className="w-20 bg-zinc-900 border border-zinc-800 rounded-md p-2 text-sm text-white" 
            value={nServico.preco} onChange={e => setNServico({...nServico, preco: e.target.value})} />
          <Button className="bg-primary text-black font-black px-3" onClick={handleAddServico}> <Plus className="h-5 w-5"/> </Button>
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

      {/* 4. DESPESAS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <TrendingDown className="h-4 w-4 text-red-500" />
          <h3 className="font-black text-white uppercase text-sm tracking-tighter">Lançar Despesa</h3>
        </div>
        <Card className="p-4 bg-[#1A1A1A] border-zinc-800 flex gap-2">
          <input placeholder="Ex: Aluguel, Água..." className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md p-2 text-sm text-white" 
            value={novaDesc} onChange={e => setNovaDesc(e.target.value)} />
          <input placeholder="Valor" type="number" className="w-24 bg-zinc-900 border border-zinc-800 rounded-md p-2 text-sm text-white" 
            value={novoValor} onChange={e => setNovoValor(e.target.value)} />
          <Button className="bg-red-500 text-white font-black px-3" onClick={handleAddDespesa}> <Plus className="h-5 w-5"/> </Button>
        </Card>

        {despesas.length > 0 && (
          <div className="space-y-2">
            {despesas.slice(0, 3).map((desp: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center bg-zinc-900/30 p-2 rounded-md border border-white/5">
                <span className="text-xs text-white uppercase font-bold">{desp.descricao}</span>
                <span className="text-sm text-red-400 font-black">- R$ {formatarMoeda(desp.valor)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. PERFORMANCE */}
      <section className="space-y-4">
        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Produção de Hoje</h3>
        <div className="grid gap-2">
          {comissaoPorBarbeiroHoje.map((item: any) => (
            <Card key={item.barbeiro?.id} className="p-4 bg-[#161616] border-zinc-800 flex justify-between items-center">
              <div>
                <p className="font-bold text-white uppercase text-sm">{item.barbeiro?.nome}</p>
                <p className="text-[10px] text-zinc-500 font-bold">{item.cortes} cortes finalizados</p>
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