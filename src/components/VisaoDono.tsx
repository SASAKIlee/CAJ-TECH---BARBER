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

  const getDataAtualLocal = () => {
    const agora = new Date();
    return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  };

  const handleAddBarbeiro = () => {
    const validacao = barbeiroSchema.safeParse(nBarbeiro);
    if (!validacao.success) return toast.error(validacao.error.errors[0].message);
    
    onAddBarbeiro({
      nome: validacao.data.nome,
      comissao_pct: validacao.data.comissao, 
      email: validacao.data.email,
      senha: validacao.data.senha
    });

    toast.success("Barbeiro cadastrado! ✂️");
    setNBarbeiro({ nome: "", comissao: "50", email: "", senha: "" });
  };

  const handleAddServico = () => {
    const validacao = servicoSchema.safeParse(nServico);
    if (!validacao.success) return toast.error(validacao.error.errors[0].message);
    
    onAddServico({
      nome: validacao.data.nome,
      preco: validacao.data.preco
    });

    toast.success("Serviço adicionado!");
    setNServico({ nome: "", preco: "" });
  };

  const handleAddDespesa = () => {
    const dataObjeto = getDataAtualLocal();
    const validacao = despesaSchema.safeParse({ descricao: novaDesc, valor: novoValor, data: dataObjeto });

    if (!validacao.success) return toast.error(validacao.error.errors[0].message);

    const y = dataObjeto.getFullYear();
    const m = String(dataObjeto.getMonth() + 1).padStart(2, '0');
    const d = String(dataObjeto.getDate()).padStart(2, '0');
    const dataString = `${y}-${m}-${d}`;

    onAddDespesa({ 
      descricao: validacao.data.descricao, 
      valor: validacao.data.valor, 
      data: dataString 
    });
    
    toast.success("Despesa registrada! 💸");
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
      
      {/* Indicador de Data */}
      <div className="text-right text-[10px] text-zinc-400 px-1 font-bold uppercase tracking-widest">
        Visualizando: <span className="text-white">{formatarDataExibicao(dataFiltro)}</span>
      </div>

      {/* 📊 DASHBOARD FINANCEIRO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="p-4 bg-[#161616] border-zinc-800">
          <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-1">Entradas Hoje</p>
          <p className="text-2xl font-black text-white">R$ {formatarMoeda(faturamentoHoje)}</p>
        </Card>

        <Card className="p-4 bg-primary border-none shadow-lg shadow-primary/10">
          <p className="text-[10px] uppercase font-black text-black/60 tracking-widest mb-1">Lucro Real Hoje</p>
          <p className="text-2xl font-black text-black">R$ {formatarMoeda(lucroRealHoje)}</p>
        </Card>

        <Card className="p-4 bg-[#1A1A1A] border-primary/20 border-dashed border-2">
          <p className="text-[10px] uppercase font-black text-primary tracking-widest mb-1">Faturamento Mensal</p>
          <p className="text-xl font-black text-white">R$ {formatarMoeda(faturamentoMensal)}</p>
        </Card>

        <Card className="p-4 bg-[#1A1A1A] border-zinc-800">
          <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-1">Comissões Hoje</p>
          <p className="text-xl font-black text-white">R$ {formatarMoeda(comissoesAPagarHoje)}</p>
        </Card>
      </div>

      {/* ✂️ GESTÃO DE EQUIPE */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="font-black text-white uppercase text-sm tracking-tighter">Equipe</h3>
        </div>
        <Card className="p-4 bg-[#1A1A1A] border-zinc-800 space-y-3">
          <input 
            placeholder="Nome do Barbeiro" 
            className="w-full bg-zinc-900 border-zinc-800 rounded-md p-2 text-sm text-white focus:border-primary outline-none" 
            value={nBarbeiro.nome} 
            onChange={e => setNBarbeiro({...nBarbeiro, nome: e.target.value})} 
          />
          <div className="flex gap-2">
            <input 
              placeholder="Email de Login" 
              className="flex-1 bg-zinc-900 border-zinc-800 rounded-md p-2 text-sm text-white focus:border-primary outline-none" 
              value={nBarbeiro.email} 
              onChange={e => setNBarbeiro({...nBarbeiro, email: e.target.value})} 
            />
            <input 
              placeholder="%" 
              type="number" 
              className="w-20 bg-zinc-900 border-zinc-800 rounded-md p-2 text-sm text-white focus:border-primary outline-none" 
              value={nBarbeiro.comissao} 
              onChange={e => setNBarbeiro({...nBarbeiro, comissao: e.target.value})} 
            />
          </div>
          <input 
            placeholder="Senha (mínimo 6 caracteres)" 
            type="password"
            className="w-full bg-zinc-900 border-zinc-800 rounded-md p-2 text-sm text-white focus:border-primary outline-none" 
            value={nBarbeiro.senha} 
            onChange={e => setNBarbeiro({...nBarbeiro, senha: e.target.value})} 
          />
          <Button className="w-full bg-primary text-black font-black uppercase text-xs" onClick={handleAddBarbeiro}>
            Cadastrar Barbeiro
          </Button>
        </Card>
        
        <div className="grid gap-2">
          {barbeiros.map((b: any) => (
            <div key={b.id} className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
              <span className="text-sm font-bold text-white uppercase">{b.nome} <span className="text-zinc-500 text-[10px]">({b.comissao_pct}%)</span></span>
              <Button variant="ghost" size="sm" onClick={() => onRemoveBarbeiro(b.id)} className="text-zinc-600 hover:text-red-500"><Trash2 className="h-4 w-4"/></Button>
            </div>
          ))}
        </div>
      </section>

      {/* 💼 GESTÃO DE SERVIÇOS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Briefcase className="h-4 w-4 text-primary" />
          <h3 className="font-black text-white uppercase text-sm tracking-tighter">Serviços</h3>
        </div>
        <Card className="p-4 bg-[#1A1A1A] border-zinc-800 space-y-3">
          <div className="flex gap-2">
            <input 
              placeholder="Nome do Serviço" 
              className="flex-1 bg-zinc-900 border-zinc-800 rounded-md p-2 text-sm text-white focus:border-primary outline-none" 
              value={nServico.nome} 
              onChange={e => setNServico({...nServico, nome: e.target.value})} 
            />
            <input 
              placeholder="R$ Preço" 
              type="number" 
              className="w-24 bg-zinc-900 border-zinc-800 rounded-md p-2 text-sm text-white focus:border-primary outline-none" 
              value={nServico.preco} 
              onChange={e => setNServico({...nServico, preco: e.target.value})} 
            />
          </div>
          <Button className="w-full bg-primary text-black font-black uppercase text-xs" onClick={handleAddServico}>
            Adicionar Serviço
          </Button>
        </Card>

        <div className="grid grid-cols-1 gap-2">
          {servicos.map((s: any) => (
            <div key={s.id} className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
              <span className="text-sm font-bold text-white uppercase">
                {s.nome} <span className="text-primary ml-2">R$ {formatarMoeda(s.preco)}</span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => onRemoveServico(s.id)} className="text-zinc-600 hover:text-red-500">
                <Trash2 className="h-4 w-4"/>
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* 💸 LANÇAR DESPESA */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <TrendingDown className="h-4 w-4 text-red-500" />
          <h3 className="font-black text-white uppercase text-sm tracking-tighter">Lançar Despesa</h3>
        </div>
        <Card className="p-4 bg-[#1A1A1A] border-zinc-800 flex gap-2">
          <input placeholder="Ex: Aluguel, Luz..." className="flex-1 bg-zinc-900 border-zinc-800 rounded-md p-2 text-sm text-white focus:border-primary outline-none" 
            value={novaDesc} onChange={(e) => setNovaDesc(e.target.value)} />
          <input placeholder="R$" type="number" className="w-24 bg-zinc-900 border-zinc-800 rounded-md p-2 text-sm text-white focus:border-primary outline-none" 
            value={novoValor} onChange={(e) => setNovoValor(e.target.value)} />
          <Button className="bg-red-500 text-white font-black" onClick={handleAddDespesa}><Plus className="h-5 w-5"/></Button>
        </Card>
        
        <div className="space-y-1">
          {despesas.slice(0, 3).map((desp: any, idx: number) => (
            <div key={idx} className="flex justify-between items-center bg-zinc-900/30 p-2 rounded-md border border-white/5">
              <span className="text-xs text-zinc-300 uppercase font-bold">{desp.descricao}</span>
              <span className="text-sm text-red-400 font-black">- R$ {formatarMoeda(desp.valor)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 🏆 PERFORMANCE (PRODUÇÃO DE HOJE) */}
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