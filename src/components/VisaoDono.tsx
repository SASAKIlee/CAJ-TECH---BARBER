import { useState } from "react";
import { Users, Scissors, Trash2, Plus, DollarSign, Wallet, Power, PowerOff, UserCheck, UserX } from "lucide-react";
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
  onToggleBarbeiroStatus // Nova prop vinda do index.tsx
}: any) {
  
  const [nBarbeiro, setNBarbeiro] = useState({ nome: "", comissao: "50", email: "", senha: "" });
  const [nServico, setNServico] = useState({ nome: "", preco: "" });

  const formatarMoeda = (v: any) => Number(v || 0).toFixed(2);

  const handleAddBarbeiro = () => {
    const validacao = barbeiroSchema.safeParse(nBarbeiro);
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
      
      {/* 1. DASHBOARD FINANCEIRO */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 bg-[#161616] border-zinc-800">
          <p className="text-[10px] uppercase font-black text-zinc-500 mb-1">Entradas Hoje</p>
          <p className="text-2xl font-black text-white">R$ {formatarMoeda(faturamentoHoje)}</p>
        </Card>
        <Card className="p-4 bg-primary border-none shadow-lg shadow-primary/20">
          <p className="text-[10px] uppercase font-black text-black/60 mb-1">Lucro Real Hoje</p>
          <p className="text-2xl font-black text-black">R$ {formatarMoeda(lucroRealHoje)}</p>
        </Card>
        <Card className="p-4 bg-[#1A1A1A] border-zinc-800">
          <p className="text-[10px] uppercase font-black text-zinc-500 mb-1">Faturamento Mês</p>
          <p className="text-xl font-black text-white">R$ {formatarMoeda(faturamentoMensal)}</p>
        </Card>
        <Card className="p-4 bg-[#1A1A1A] border-zinc-800">
          <p className="text-[10px] uppercase font-black text-zinc-500 mb-1">Comissões Hoje</p>
          <p className="text-xl font-black text-white">R$ {formatarMoeda(comissoesAPagarHoje)}</p>
        </Card>
      </div>

      {/* 2. GESTÃO DE EQUIPE */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="font-black text-white uppercase text-sm italic tracking-tighter">Equipe</h3>
        </div>
        <Card className="p-4 bg-[#1A1A1A] border-zinc-800 space-y-4 shadow-2xl">
          <input placeholder="Nome do Barbeiro" className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-3 text-sm text-white outline-none focus:border-primary" 
            value={nBarbeiro.nome} onChange={e => setNBarbeiro({...nBarbeiro, nome: e.target.value})} />
          <div className="flex gap-2">
            <input placeholder="Email" className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md p-3 text-sm text-white outline-none focus:border-primary" 
              value={nBarbeiro.email} onChange={e => setNBarbeiro({...nBarbeiro, email: e.target.value})} />
            <input placeholder="%" type="number" className="w-20 bg-zinc-900 border border-zinc-800 rounded-md p-3 text-sm text-white outline-none focus:border-primary" 
              value={nBarbeiro.comissao} onChange={e => setNBarbeiro({...nBarbeiro, comissao: e.target.value})} />
          </div>
          <input placeholder="Senha" type="password" className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-3 text-sm text-white outline-none focus:border-primary" 
            value={nBarbeiro.senha} onChange={e => setNBarbeiro({...nBarbeiro, senha: e.target.value})} />
          <Button className="w-full bg-primary text-black font-black uppercase h-12" onClick={handleAddBarbeiro}>Cadastrar Barbeiro</Button>
        </Card>
        
        <div className="grid gap-2">
          {barbeiros.map((b: any) => (
            <div key={b.id} className={cn(
              "flex justify-between items-center bg-zinc-900/50 p-3 rounded-lg border border-zinc-800 transition-all",
              !b.ativo && "opacity-50 grayscale contrast-75"
            )}>
              <div className="flex items-center gap-3">
                {/* INDICADOR DE STATUS */}
                <div className={cn(
                  "h-2 w-2 rounded-full",
                  b.ativo ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500"
                )} />
                <span className="text-xs font-bold text-white uppercase">{b.nome} ({b.comissao_pct}%)</span>
              </div>

              <div className="flex items-center gap-1">
                {/* BOTÃO ATIVAR/DESATIVAR */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onToggleBarbeiroStatus(b.id, !b.ativo)} 
                  className={cn(
                    "h-8 w-8 p-0 rounded-full",
                    b.ativo ? "text-zinc-500 hover:text-red-500" : "text-green-500 hover:bg-green-500/10"
                  )}
                  title={b.ativo ? "Desativar Barbeiro" : "Ativar Barbeiro"}
                >
                  {b.ativo ? <PowerOff className="h-4 w-4"/> : <Power className="h-4 w-4"/>}
                </Button>

                {/* BOTÃO REMOVER (PROTEGIDO) */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onRemoveBarbeiro(b.id)} 
                  className={cn(
                    "h-8 w-8 p-0 rounded-full",
                    b.ativo ? "text-zinc-800 cursor-not-allowed" : "text-zinc-600 hover:text-red-500 hover:bg-red-500/10"
                  )}
                  disabled={b.ativo}
                  title={b.ativo ? "Desative antes de remover" : "Remover Barbeiro"}
                >
                  <Trash2 className="h-4 w-4"/>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. GESTÃO DE SERVIÇOS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Scissors className="h-4 w-4 text-primary" />
          <h3 className="font-black text-white uppercase text-sm italic tracking-tighter">Serviços e Preços</h3>
        </div>
        <Card className="p-4 bg-[#1A1A1A] border-zinc-800 flex gap-2 shadow-xl">
          <input placeholder="Nome do Serviço" className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md p-2 text-sm text-white outline-none" 
            value={nServico.nome} onChange={e => setNServico({...nServico, nome: e.target.value})} />
          <input placeholder="R$" type="number" className="w-24 bg-zinc-900 border border-zinc-800 rounded-md p-2 text-sm text-white outline-none" 
            value={nServico.preco} onChange={e => setNServico({...nServico, preco: e.target.value})} />
          <Button className="bg-primary text-black font-bold" onClick={handleAddServico}><Plus className="h-5 w-5"/></Button>
        </Card>
        <div className="grid grid-cols-2 gap-2">
          {servicos.map((s: any) => (
            <div key={s.id} className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
              <div className="text-[10px]">
                <p className="font-bold text-white uppercase">{s.nome}</p>
                <p className="text-primary font-black italic">R$ {formatarMoeda(s.preco)}</p>
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
        <div className="flex items-center gap-2 px-1">
          <Wallet className="h-4 w-4 text-primary" />
          <h3 className="font-black text-white uppercase text-sm italic tracking-tighter">Produção de Hoje</h3>
        </div>
        <div className="grid gap-2">
          {comissaoPorBarbeiroHoje.map((item: any) => (
            <Card key={item.barbeiro?.id} className={cn(
              "p-4 border-zinc-800 flex justify-between items-center shadow-lg transition-all",
              item.barbeiro?.ativo ? "bg-[#161616]" : "bg-zinc-900/30 opacity-60"
            )}>
              <div>
                <p className="font-bold text-white uppercase text-xs">
                  {item.barbeiro?.nome} {!item.barbeiro?.ativo && "(INATIVO)"}
                </p>
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">{item.cortes} atendimentos realizados</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-zinc-500 font-black uppercase mb-1">Comissão</p>
                <p className="text-lg font-black text-primary italic">R$ {formatarMoeda(item.total)}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}