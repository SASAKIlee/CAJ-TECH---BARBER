import { useState } from "react";
import { DollarSign, TrendingDown, Users, Scissors, Briefcase, Plus, Trash2 } from "lucide-react";
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
  barbeiros = [], 
  servicos = [], 
  onAddBarbeiro, 
  onRemoveBarbeiro, 
  onAddServico, 
  onRemoveServico,
  faturamentoMensal = 0 
}: any) {
  
  const [nBarbeiro, setNBarbeiro] = useState({ nome: "", comissao: "50", email: "", senha: "" });
  const [nServico, setNServico] = useState({ nome: "", preco: "" });
  const [novaDesc, setNovaDesc] = useState("");
  const [novoValor, setNovoValor] = useState("");

  const formatarMoeda = (v: any) => Number(v || 0).toFixed(2);

  const handleAddBarbeiro = () => {
    // 1. Validação local antes de enviar
    const validacao = barbeiroSchema.safeParse({
      nome: nBarbeiro.nome,
      email: nBarbeiro.email,
      senha: nBarbeiro.senha,
      comissao: nBarbeiro.comissao
    });

    if (!validacao.success) {
      return toast.error(validacao.error.errors[0].message);
    }

    // 2. Envio dos dados (Ordem: nome, comissao, email, senha)
    onAddBarbeiro(
      validacao.data.nome, 
      Number(validacao.data.comissao), 
      validacao.data.email, 
      validacao.data.senha
    );

    setNBarbeiro({ nome: "", comissao: "50", email: "", senha: "" });
  };

  return (
    <div className="space-y-8 pb-20">
      
      {/* DASHBOARD FINANCEIRO */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 bg-[#161616] border-zinc-800">
          <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-1">Entradas Hoje</p>
          <p className="text-2xl font-black text-white">R$ {formatarMoeda(faturamentoHoje)}</p>
        </Card>
        <Card className="p-4 bg-primary border-none shadow-lg shadow-primary/20">
          <p className="text-[10px] uppercase font-black text-black/60 tracking-widest mb-1">Lucro Real Hoje</p>
          <p className="text-2xl font-black text-black">R$ {formatarMoeda(lucroRealHoje)}</p>
        </Card>
      </div>

      {/* GESTÃO DE EQUIPE */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="font-black text-white uppercase text-sm tracking-tighter">Equipe</h3>
        </div>
        
        <Card className="p-4 bg-[#1A1A1A] border-zinc-800 space-y-4">
          <div className="space-y-1.5">
             <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Nome do Barbeiro</label>
             <input className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-3 text-sm text-white focus:border-primary outline-none" 
              value={nBarbeiro.nome} onChange={e => setNBarbeiro({...nBarbeiro, nome: e.target.value})} />
          </div>

          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Email de Login</label>
              <input className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-3 text-sm text-white focus:border-primary outline-none" 
                value={nBarbeiro.email} onChange={e => setNBarbeiro({...nBarbeiro, email: e.target.value})} />
            </div>
            <div className="w-24 space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">%</label>
              <input type="number" className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-3 text-sm text-white focus:border-primary outline-none" 
                value={nBarbeiro.comissao} onChange={e => setNBarbeiro({...nBarbeiro, comissao: e.target.value})} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Senha (mínimo 6 caracteres)</label>
            <input type="password" className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-3 text-sm text-white focus:border-primary outline-none" 
              value={nBarbeiro.senha} onChange={e => setNBarbeiro({...nBarbeiro, senha: e.target.value})} />
          </div>

          <Button className="w-full bg-primary text-black font-black uppercase h-12 shadow-lg shadow-primary/10" onClick={handleAddBarbeiro}>
            Cadastrar Barbeiro
          </Button>
        </Card>

        {/* LISTAGEM DE BARBEIROS */}
        <div className="grid gap-2">
          {barbeiros.map((b: any) => (
            <div key={b.id} className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
              <span className="text-xs font-bold text-white uppercase">{b.nome} <span className="text-zinc-500 ml-1">({b.comissao_pct}%)</span></span>
              <Button variant="ghost" size="sm" onClick={() => onRemoveBarbeiro(b.id)} className="text-zinc-600 hover:text-red-500">
                <Trash2 className="h-4 w-4"/>
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Outras seções de Serviço e Despesa continuam aqui... */}
    </div>
  );
}