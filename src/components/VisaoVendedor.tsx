import { useState } from "react";
import { 
  Users, 
  DollarSign, 
  Briefcase, 
  Search, 
  Plus, 
  MapPin, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  Target
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Mantemos o export nomeado
export function VisaoVendedor({ 
  vendedorNome = "Consultor CAJ", 
  clientesAtivos = [], 
  prospectos = [], 
  onAddLead 
}: any) {
  
  const [busca, setBusca] = useState("");
  
  const recorrenciaMensal = clientesAtivos.length * 25;
  const totalLeads = prospectos.length;
  const taxaConversao = totalLeads > 0 ? ((clientesAtivos.length / totalLeads) * 100).toFixed(0) : 0;

  const formatarMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-8 pb-32 w-full max-w-full overflow-x-hidden p-4 bg-black min-h-screen">
      
      <header className="flex flex-col gap-1 pt-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
          <span className="text-[10px] uppercase font-black text-primary tracking-[0.2em]">Partner Dashboard</span>
        </div>
        <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
          Olá, {vendedorNome.split(' ')[0]}
        </h1>
        <p className="text-zinc-500 text-xs font-bold uppercase">Sua performance na CAJ TECH hoje</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-5 bg-zinc-900/50 border-zinc-800 backdrop-blur-sm relative overflow-hidden text-card-foreground">
          <TrendingUp className="absolute -right-2 -bottom-2 h-16 w-16 text-primary/5 rotate-12" />
          <p className="text-[9px] uppercase font-black text-zinc-500 mb-1 tracking-widest">Recorrência Estimada</p>
          <p className="text-2xl font-black text-primary italic">{formatarMoeda(recorrenciaMensal)}</p>
          <p className="text-[8px] text-zinc-600 mt-1 uppercase">Pagamento todo dia 05</p>
        </Card>

        <Card className="p-5 bg-zinc-900/50 border-zinc-800 backdrop-blur-sm text-card-foreground">
          <Target className="absolute -right-2 -bottom-2 h-16 w-16 text-white/5 rotate-12" />
          <p className="text-[9px] uppercase font-black text-zinc-500 mb-1 tracking-widest">Taxa de Fechamento</p>
          <p className="text-2xl font-black text-white italic">{taxaConversao}%</p>
          <p className="text-[8px] text-zinc-600 mt-1 uppercase">{clientesAtivos.length} de {totalLeads} lojas</p>
        </Card>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-600" />
          <input 
            placeholder="Buscar barbearia..." 
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 pl-10 text-sm text-white outline-none focus:border-primary transition-all"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Button className="bg-primary text-black font-black h-12 w-12 rounded-xl shadow-lg shadow-primary/20">
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            <h3 className="font-black text-white uppercase text-sm italic tracking-tighter">Clientes Ativos</h3>
          </div>
          <span className="text-[10px] font-black bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
            {clientesAtivos.length} TOTAL
          </span>
        </div>

        <div className="grid gap-3">
          {clientesAtivos.filter((c:any) => c.nome.toLowerCase().includes(busca.toLowerCase())).map((cliente: any) => (
            <Card key={cliente.id} className="p-4 bg-gradient-to-r from-zinc-900 to-black border-zinc-800 hover:border-primary/30 transition-all group text-card-foreground">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-zinc-800 rounded-lg flex items-center justify-center font-black text-primary border border-zinc-700">
                    {cliente.nome.substring(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-white uppercase text-xs group-hover:text-primary transition-colors">{cliente.nome}</p>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-2 w-2 text-zinc-600" />
                      <p className="text-[9px] text-zinc-500 uppercase font-medium">{cliente.bairro || 'S.J. Rio Preto'}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end text-green-500">
                    <CheckCircle2 className="h-3 w-3" />
                    <span className="text-[10px] font-black uppercase italic">Em Dia</span>
                  </div>
                  <p className="text-[9px] text-zinc-600 font-bold mt-1 uppercase">Repasse: {formatarMoeda(25)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Clock className="h-4 w-4 text-amber-500" />
          <h3 className="font-black text-white uppercase text-sm italic tracking-tighter">Em Negociação</h3>
        </div>

        <div className="grid gap-2">
          {prospectos.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-zinc-900 rounded-2xl">
              <p className="text-zinc-600 text-[10px] font-black uppercase italic">Nenhuma visita registrada hoje.</p>
            </div>
          ) : (
            prospectos.map((lead: any) => (
              <div key={lead.id} className="flex justify-between items-center bg-zinc-900/30 p-3 rounded-xl border border-zinc-800/50 opacity-70">
                <div className="text-[11px]">
                  <p className="font-bold text-zinc-300 uppercase">{lead.nome}</p>
                  <p className="text-amber-500/80 text-[9px] font-black italic">Aguardando Fechamento</p>
                </div>
                <Button variant="ghost" size="sm" className="text-primary font-black uppercase text-[9px] h-7">
                  Atualizar
                </Button>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="p-6 text-center">
        <p className="text-zinc-700 text-[9px] font-black uppercase tracking-[0.3em]">
          CAJ TECH SOFTWARE SOLUTIONS © 2026
        </p>
      </div>

    </div>
  );
}

// 🚀 ADICIONE ISSO NO FINAL PARA MATAR O ERRO DO VERCEL
export default VisaoVendedor;