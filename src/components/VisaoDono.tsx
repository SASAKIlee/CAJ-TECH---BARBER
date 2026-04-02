import { useState } from "react";
import { Users, Scissors, Trash2, Plus, Power, PowerOff, Link as LinkIcon, Copy } from "lucide-react";
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
      
      {/* 0. LINK DE AGENDAMENTO (NOVO) */}
      <section>
        <Card className="p-5 bg-gradient-to-br from-zinc-900 to-black border-primary/20 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-10">
            <Scissors className="h-24 w-24 text-primary rotate-12" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
              <p className="text-[10px] uppercase font-black text-primary tracking-widest">Link de Agendamento Online</p>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="bg-black/50 border border-zinc-800 rounded-xl p-3 flex items-center justify-between group hover:border-primary/50 transition-colors">
                <code className="text-[11px] text-zinc-300 font-mono truncate mr-2">
                  cajtech.net.br/agendar/{barbeiros[0]?.barbearia_slug || 'seu-slug'}
                </code>
                
                <Button 
                  size="sm" 
                  className="bg-primary text-black font-bold uppercase text-[10px] h-8 px-4 rounded-lg active:scale-95 transition-transform shrink-0"
                  onClick={() => {
                    const slugAtivo = barbeiros[0]?.barbearia_slug || 'seu-slug';
                    const linkCompleto = `https://cajtech.net.br/agendar/${slugAtivo}`;
                    navigator.clipboard.writeText(linkCompleto);
                    toast.success("Link copiado!");
                  }}
                >
                  <Copy className="h-3 w-3 mr-2" /> Copiar
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </section>

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
              !b.ativo && "opacity-50 grayscale"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn("h-2 w-2 rounded-full", b.ativo ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500")} />
                <span className="text-xs font-bold text-white uppercase">{b.nome} ({b.comissao_pct}%)</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => onToggleBarbeiroStatus(b.id, !b.ativo)} className={cn("h-8 w-8 p-0 rounded-full", b.ativo ? "text-zinc-500 hover:text-red-500" : "text-green-500")}>
                  {b.ativo ? <PowerOff className="h-4 w-4"/> : <Power className="h-4 w-4"/>}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onRemoveBarbeiro(b.id)} className="h-8 w-8 p-0 rounded-full text-zinc-600 hover:text-red-500" disabled={b.ativo}>
                  <Trash2 className="h-4 w-4"/>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. GESTÃO DE SERVIÇOS (CORRIGIDO PARA MOBILE) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Scissors className="h-4 w-4 text-primary" />
          <h3 className="font-black text-white uppercase text-sm italic tracking-tighter">Serviços e Preços</h3>
        </div>
        
        <Card className="p-4 bg-[#1A1A1A] border-zinc-800 shadow-xl space-y-3">
          <input 
            placeholder="Nome do Serviço" 
            className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-3 text-sm text-white outline-none focus:border-primary" 
            value={nServico.nome} 
            onChange={e => setNServico({...nServico, nome: e.target.value})} 
          />
          
          <div className="flex gap-2">
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
            <Button 
              className="bg-primary text-black font-bold h-12 w-14 shrink-0" 
              onClick={handleAddServico}
            >
              <Plus className="h-6 w-6 stroke-[3px]"/>
            </Button>
          </div>
        </Card>

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
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <LinkIcon className="h-4 w-4 text-primary" />
          <h3 className="font-black text-white uppercase text-sm italic tracking-tighter">Produção de Hoje</h3>
        </div>
        <div className="grid gap-2">
          {comissaoPorBarbeiroHoje.map((item: any) => (
            <Card key={item.barbeiro?.id} className={cn(
              "p-4 border-zinc-800 flex justify-between items-center shadow-lg bg-[#161616]",
              !item.barbeiro?.ativo && "opacity-60"
            )}>
              <div>
                <p className="font-bold text-white uppercase text-xs">{item.barbeiro?.nome}</p>
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tighter">{item.cortes} atendimentos</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-primary italic">R$ {formatarMoeda(item.total)}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

    </div>
  );
}