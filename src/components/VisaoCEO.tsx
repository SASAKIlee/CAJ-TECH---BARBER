import { useState, useEffect } from "react";
import { 
  TrendingUp, Users, Store, DollarSign, 
  BarChart3, Activity, ShieldCheck, Zap,
  ArrowUpRight, Target, ClipboardList, Clock, CheckCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner"; 

export function VisaoCEO({ 
  totalLojas = 0, 
  faturamentoTotal = 0, 
  vendedores = [] // O Index já nos manda quem são os vendedores
}: any) {
  
  const [leadsRecentes, setLeadsRecentes] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);

  useEffect(() => {
    async function buscarLeads() {
      try {
        // 🔥 REMOVEMOS O JOIN. Buscamos a tabela pura!
        const { data, error } = await supabase
          .from('leads')
          .select('*') 
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setLeadsRecentes(data || []);
      } catch (err) {
        console.error("Erro ao buscar leads:", err);
      } finally {
        setLoadingLeads(false);
      }
    }

    buscarLeads();
  }, []);

  const handleAprovarLead = async (leadId: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: 'convertido' })
        .eq('id', leadId);

      if (error) throw error;

      toast.success("Venda confirmada! Agora ela conta para as metas.");
      
      setLeadsRecentes(prev => 
        prev.map(l => l.id === leadId ? { ...l, status: 'convertido' } : l)
      );
    } catch (err) {
      console.error("Erro ao aprovar lead:", err);
      toast.error("Erro ao confirmar venda. Tente novamente.");
    }
  };

  const formatarMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // 🚀 Função inteligente que acha o nome do vendedor baseada no ID
  const getNomeVendedor = (idDesteLead: string) => {
    if (!idDesteLead) return "Desconhecido";
    const vendedorEncontrado = vendedores.find((v: any) => v.id === idDesteLead);
    return vendedorEncontrado ? vendedorEncontrado.nome : "Consultor Interno";
  };

  return (
    <div className="space-y-8 pb-32 w-full max-w-full overflow-x-hidden p-4 bg-black min-h-screen">
      
      {/* 1. HEADER HQ */}
      <header className="flex flex-col gap-1 pt-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span className="text-[10px] uppercase font-black text-emerald-500 tracking-[0.2em]">CAJ TECH Command Center</span>
        </div>
        <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
          CENTRAL ESTRATÉGICA
        </h1>
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Monitoramento Global de Operações</p>
      </header>

      {/* 2. MÉTRICAS GLOBAIS */}
      <div className="grid grid-cols-1 gap-3">
        <Card className="p-6 bg-gradient-to-br from-zinc-900 to-black border-emerald-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="h-20 w-20 text-emerald-500" />
          </div>
          <p className="text-[10px] uppercase font-black text-zinc-500 mb-1 tracking-widest">Previsão de MRR (Recorrência)</p>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-black text-white italic">{formatarMoeda(totalLojas * 50)}</p>
            <span className="text-emerald-500 text-xs font-bold mb-2 flex items-center">
              <ArrowUpRight className="h-3 w-3" /> 100%
            </span>
          </div>
          <p className="text-[8px] text-zinc-600 mt-2 uppercase font-bold tracking-tighter">Base calculada em R$ 50,00 / loja ativa</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-5 bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
          <Store className="h-4 w-4 text-primary mb-2" />
          <p className="text-[9px] uppercase font-black text-zinc-500 mb-1">Market Share</p>
          <p className="text-2xl font-black text-white italic">{totalLojas}</p>
          <p className="text-[8px] text-zinc-600 uppercase mt-1 italic">Lojas na Base</p>
        </Card>

        <Card className="p-5 bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
          <Target className="h-4 w-4 text-amber-500 mb-2" />
          <p className="text-[9px] uppercase font-black text-zinc-500 mb-1">Vendedores</p>
          <p className="text-2xl font-black text-white italic">{vendedores.length}</p>
          <p className="text-[8px] text-zinc-600 uppercase mt-1 italic">Equipe Ativa</p>
        </Card>
      </div>

      {/* NOVA SEÇÃO: FUNIL DE EXPANSÃO (LEADS) */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center gap-2 px-1 text-zinc-400">
          <ClipboardList className="h-4 w-4 text-blue-500" />
          <h3 className="font-black uppercase text-sm italic tracking-tighter text-blue-500">Funil de Expansão (Leads)</h3>
        </div>
        
        <Card className="p-1 bg-zinc-900/30 border-zinc-800 backdrop-blur-sm overflow-hidden">
          {loadingLeads ? (
             <div className="p-6 text-center text-xs font-bold text-zinc-500 uppercase animate-pulse">
               Buscando radar de leads...
             </div>
          ) : leadsRecentes.length === 0 ? (
             <div className="p-6 text-center text-xs font-bold text-zinc-600 uppercase italic">
               Nenhum lead registrado recentemente. A equipe precisa prospectar!
             </div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {leadsRecentes.map((lead) => (
                <div key={lead.id} className="p-4 hover:bg-zinc-800/30 transition-colors flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-white text-sm uppercase italic">{lead.nome_barbearia}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-zinc-400 font-bold uppercase">{lead.bairro || 'Sem Bairro'}</span>
                      <span className="text-zinc-700">•</span>
                      <span className="text-[9px] text-amber-500 font-bold uppercase flex items-center gap-1">
                        <Users className="h-3 w-3" /> 
                        {/* 🚀 Chama a função que descobre o nome do Vendedor */}
                        {getNomeVendedor(lead.vendedor_id)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-[8px] text-zinc-500 font-bold uppercase">
                      {format(new Date(lead.created_at), "dd/MM 'às' HH:mm")}
                    </span>
                    
                    {lead.status === 'pendente' ? (
                      <Button 
                        size="sm" 
                        onClick={() => handleAprovarLead(lead.id)}
                        className="h-7 bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-black uppercase px-3 rounded-lg shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                      >
                        Confirmar Venda
                      </Button>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase flex items-center gap-1 border border-emerald-500/20">
                        <CheckCircle className="h-2 w-2" /> Convertido
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* 3. RANKING DE VENDEDORES */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center gap-2 px-1 text-zinc-400">
          <BarChart3 className="h-4 w-4" />
          <h3 className="font-black uppercase text-sm italic tracking-tighter">Performance de Consultores</h3>
        </div>
        
        <div className="grid gap-3">
          {vendedores.map((v: any, index: number) => (
            <Card key={v.id} className="p-4 bg-zinc-900/40 border-zinc-800 flex justify-between items-center group hover:border-primary/50 transition-all">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center font-black text-sm text-zinc-500 border border-zinc-700 group-hover:text-primary group-hover:border-primary/50">
                  #{index + 1}
                </div>
                <div>
                  <p className="font-bold text-white text-sm uppercase italic">{v.nome}</p>
                  <div className="flex items-center gap-1">
                    <Zap className="h-2 w-2 text-amber-500 fill-amber-500" />
                    <p className="text-[9px] text-zinc-500 uppercase font-bold">{v.total_lojas} Contratos Fechados</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-white italic">{formatarMoeda(v.total_lojas * 25)}</p>
                <p className="text-[8px] text-zinc-600 uppercase font-black">Sua Margem</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 4. STATUS DA INFRAESTRUTURA */}
      <section className="space-y-4 pt-4">
        <div className="flex items-center gap-2 px-1 text-zinc-400">
          <Activity className="h-4 w-4 text-emerald-500" />
          <h3 className="font-black uppercase text-sm italic tracking-tighter">Status da Rede</h3>
        </div>
        <Card className="p-4 bg-zinc-950 border-zinc-900 border-dashed">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping" />
                <span className="text-[10px] font-bold text-zinc-500 uppercase">Cloud Database (Supabase)</span>
            </div>
            <span className="text-[10px] font-black text-emerald-500 uppercase italic">Estável</span>
          </div>
        </Card>
      </section>

      <div className="p-10 text-center opacity-20">
        <p className="text-zinc-500 text-[8px] font-black uppercase tracking-[0.6em]">
          CAJ TECH HQ - SECURITY LEVEL 4
        </p>
      </div>

    </div>
  );
}

export default VisaoCEO;