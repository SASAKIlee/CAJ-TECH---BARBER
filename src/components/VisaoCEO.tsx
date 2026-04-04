import { useState, useEffect } from "react";
import { 
  TrendingUp, Users, Store, DollarSign, ChevronDown, ChevronUp,
  BarChart3, Activity, ShieldCheck, Zap,
  ArrowUpRight, Target, ClipboardList, Clock, CheckCircle
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js"; // Usado para a Mágica do Auth
import { format } from "date-fns";
import { toast } from "sonner"; 

// Variáveis de ambiente para a criação silenciosa de usuários
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export function VisaoCEO({ totalLojas = 0, vendedores = [] }: any) {
  const [leadsRecentes, setLeadsRecentes] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [ranking, setRanking] = useState<any[]>([]);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [slugs, setSlugs] = useState<Record<string, string>>({});

  useEffect(() => {
    async function carregarDados() {
      try {
        const { data: leads } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
        setLeadsRecentes(leads || []);

        const { data: vendasConvertidas } = await supabase.from('leads').select('vendedor_id').eq('status', 'convertido');
        const rankingCalculado = vendedores.map((v: any) => ({
          ...v, total_lojas: vendasConvertidas?.filter(lead => lead.vendedor_id === v.id).length || 0
        }));
        setRanking(rankingCalculado.sort((a, b) => b.total_lojas - a.total_lojas));
      } catch (err) {} finally { setLoadingLeads(false); }
    }
    carregarDados();
  }, [vendedores]);

  // 🚀 A MÁGICA DE APROVAÇÃO (CRIA O USUÁRIO E A LOJA)
  const handleAprovarContrato = async (lead: any) => {
    const slugDesejado = slugs[lead.id];
    const extras = lead.dados_adicionais || {};

    if (!slugDesejado) return toast.error("Defina o Link Personalizado (Slug) antes de aprovar.");
    if (!extras.email_dono || !extras.senha_temp) return toast.error("Este lead não possui e-mail e senha de onboarding.");

    toast.loading("Criando sistema do cliente...", { id: "aprovacao" });

    try {
      // 1. Cria o Usuário no Auth Silenciosamente (Não desloga o CEO)
      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({ 
        email: extras.email_dono, password: extras.senha_temp 
      });
      if (authError) throw new Error("Erro ao criar usuário: " + authError.message);
      const novoDonoId = authData.user!.id;

      // 2. Define a Permissão como 'dono'
      await supabase.from("user_roles").insert({ user_id: novoDonoId, role: "dono" });

      // 3. Cria a Barbearia Oficial vinculando o dono_id
      // 🔥 CORREÇÃO: Removida a linha do telefone que dava erro no banco!
      const { error: barbError } = await supabase.from("barbearias").insert({
        nome: lead.nome_barbearia,
        slug: slugDesejado,
        dono_id: novoDonoId,
        cor_primaria: extras.cor_primaria || "#D4AF37"
      });
      if (barbError) throw new Error("Erro ao criar barbearia: " + barbError.message);

      // 4. Marca o Lead como Convertido e paga a comissão
      await supabase.from("leads").update({ status: 'convertido' }).eq('id', lead.id);

      toast.success("✅ Sucesso! Cliente criado e comissão gerada.", { id: "aprovacao" });
      
      // Atualiza as listas na tela na hora
      setLeadsRecentes(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'convertido' } : l));
      setRanking(prev => prev.map(v => v.id === lead.vendedor_id ? { ...v, total_lojas: v.total_lojas + 1 } : v).sort((a,b) => b.total_lojas - a.total_lojas));
      setExpandido(null);
    } catch (err: any) {
      toast.error(err.message, { id: "aprovacao" });
    }
  };

  const getNomeVendedor = (id: string) => vendedores.find((v: any) => v.id === id)?.nome || "Consultor Interno";
  const formatarMoeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-8 pb-32 w-full max-w-full overflow-x-hidden p-4 bg-black min-h-screen">
      <header className="flex flex-col gap-1 pt-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span className="text-[10px] uppercase font-black text-emerald-500 tracking-[0.2em]">CAJ TECH Command Center</span>
        </div>
        <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">CENTRAL ESTRATÉGICA</h1>
      </header>

      {/* DASHBOARD GERAL */}
      <div className="grid grid-cols-1 gap-3">
        <Card className="p-6 bg-gradient-to-br from-zinc-900 to-black border-emerald-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="h-20 w-20 text-emerald-500" /></div>
          <p className="text-[10px] uppercase font-black text-zinc-500 mb-1 tracking-widest">Previsão de MRR (Recorrência)</p>
          <div className="flex items-end gap-2">
            <p className="text-4xl font-black text-white italic">{formatarMoeda((ranking.reduce((a, v) => a + v.total_lojas, 0)) * 50)}</p>
            <span className="text-emerald-500 text-xs font-bold mb-2 flex items-center"><ArrowUpRight className="h-3 w-3" /> 100%</span>
          </div>
        </Card>
      </div>

      {/* ONBOARDING (ACORDEÃO) */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center gap-2 px-1 text-zinc-400">
          <ClipboardList className="h-4 w-4 text-blue-500" />
          <h3 className="font-black uppercase text-sm italic tracking-tighter text-blue-500">Aprovações Pendentes (Contratos)</h3>
        </div>
        
        <div className="grid gap-3">
          {leadsRecentes.filter(l => l.status === 'pendente').map((lead) => (
            <Card key={lead.id} className="bg-zinc-900/50 border-zinc-800 overflow-hidden transition-all">
              <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-zinc-800/30" onClick={() => setExpandido(expandido === lead.id ? null : lead.id)}>
                <div>
                  <h4 className="font-bold text-white text-sm uppercase italic">{lead.nome_barbearia}</h4>
                  <p className="text-[9px] text-zinc-400 font-bold uppercase mt-1">
                    📍 {lead.bairro || 'Sem Bairro'} • 👤 {getNomeVendedor(lead.vendedor_id)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[8px] font-black uppercase border border-blue-500/20">Aguardando</span>
                  {expandido === lead.id ? <ChevronUp className="text-zinc-500" /> : <ChevronDown className="text-zinc-500" />}
                </div>
              </div>

              {/* CONTEÚDO EXPANDIDO */}
              {expandido === lead.id && (
                <div className="p-4 bg-black/40 border-t border-zinc-800 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-[10px] font-black uppercase text-zinc-400 bg-black p-3 rounded-xl border border-zinc-800/50">
                    <div>E-mail: <span className="text-white lowercase">{lead.dados_adicionais?.email_dono}</span></div>
                    <div>Senha: <span className="text-white">{lead.dados_adicionais?.senha_temp}</span></div>
                    <div>Tel: <span className="text-white">{lead.dados_adicionais?.telefone || '---'}</span></div>
                    <div className="flex items-center gap-2">Cor da Marca: <div className="h-3 w-3 rounded-full border border-zinc-700" style={{ backgroundColor: lead.dados_adicionais?.cor_primaria }}/></div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-primary uppercase ml-1">Personalizar Link do Cliente</label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-bold text-zinc-600 italic hidden md:block">cajtech.net.br/</span>
                      <Input placeholder="ex: barbearia-do-monicao" className="bg-zinc-900 border-zinc-700 text-white font-bold h-12 rounded-xl focus:border-primary" value={slugs[lead.id] || ""} onChange={e => setSlugs({ ...slugs, [lead.id]: e.target.value.toLowerCase().replace(/\s+/g, '-') })} />
                    </div>
                  </div>

                  <Button onClick={() => handleAprovarContrato(lead)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black h-14 rounded-2xl text-lg uppercase italic shadow-lg shadow-emerald-600/20">
                    Aprovar & Criar Barbearia
                  </Button>
                </div>
              )}
            </Card>
          ))}
          
          {leadsRecentes.filter(l => l.status === 'pendente').length === 0 && (
             <div className="p-6 text-center text-xs font-bold text-zinc-600 uppercase italic">Caixa de entrada vazia. Nenhuma venda pendente.</div>
          )}
        </div>
      </section>

      {/* RANKING */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center gap-2 px-1 text-zinc-400">
          <BarChart3 className="h-4 w-4" />
          <h3 className="font-black uppercase text-sm italic tracking-tighter">Performance de Consultores</h3>
        </div>
        <div className="grid gap-3">
          {ranking.map((v: any, index: number) => (
            <Card key={v.id} className="p-4 bg-zinc-900/40 border-zinc-800 flex justify-between items-center group">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center font-black text-sm text-zinc-500">#{index + 1}</div>
                <div>
                  <p className="font-bold text-white text-sm uppercase italic">{v.nome}</p>
                  <p className="text-[9px] text-zinc-500 uppercase font-bold">{v.total_lojas} Contratos Fechados</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-white italic">{formatarMoeda(v.total_lojas * 25)}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

export default VisaoCEO;