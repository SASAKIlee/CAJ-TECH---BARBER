import { useState, useEffect } from "react";
import { 
  Search, Plus, X, Loader2, Clock, CheckCircle, MapPin, Zap, Crown, Target, 
  AlertCircle, MessageCircle, Wallet, Share2, TrendingUp, BookOpen, ArrowRight, Activity, Calendar
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner"; 
import { cn } from "@/lib/utils";

// CONFIGURAÇÃO INICIAL DO FORMULÁRIO
const FORM_NOVO_LEAD_INICIAL = { 
  nome: "", bairro: "", email: "", senha: "", telefone: "", 
  plano: "pro", 
  cor_primaria: "#D4AF37", cor_secundaria: "#18181B", cor_destaque: "#FFFFFF" 
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface VisaoVendedorProps {
  vendedorId?: string; 
  vendedorNome?: string;
}

export function VisaoVendedor({
  vendedorId,
  vendedorNome = "Consultor CAJ",
}: VisaoVendedorProps) {
  const [busca, setBusca] = useState("");
  const [modalCadastroAberto, setModalCadastroAberto] = useState(false);
  const [tabAtiva, setTabAtiva] = useState<"visita" | "contrato">("visita");
  const [formNovoLead, setFormNovoLead] = useState(FORM_NOVO_LEAD_INICIAL);
  const [isSubmitting, setIsSubmitting] = useState(false); 

  const [meusLeads, setMeusLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  
  // ESTADOS DE PERFORMANCE & GAMIFICAÇÃO
  const [recorrenciaCalculada, setRecorrenciaCalculada] = useState(0);
  const [taxaConversao, setTaxaConversao] = useState(0);
  const META_MENSAL = 2000; // R$2000 de meta de comissão
  const progressoMeta = Math.min(100, (recorrenciaCalculada / META_MENSAL) * 100);

  // MODAIS EXTRAS (Kit de Guerra, FollowUp, Saque)
  const [modalKitAberto, setModalKitAberto] = useState(false);
  const [modalSaqueAberto, setModalSaqueAberto] = useState(false);
  const [modalFollowUpAberto, setModalFollowUpAberto] = useState(false);
  const [leadSelecionado, setLeadSelecionado] = useState<any>(null);
  const [textoFollowUp, setTextoFollowUp] = useState("");

  const carregarDadosPerformance = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const idReal = session?.user?.id || vendedorId;
      if (!idReal) return;

      // 1. BUSCA TODOS OS LEADS DO VENDEDOR
      const { data: leads, error: leadsError } = await supabase.from("leads").select("*").eq("vendedor_id", idReal);
      if (leadsError) throw leadsError;

      // 2. CRUZA COM BARBEARIAS PARA PEGAR CHURN E UPSELL (Inteligência)
      const nomesConvertidos = leads?.filter(l => l.status === 'convertido').map(l => l.nome_barbearia) || [];
      let barbeariasReais: any[] = [];
      
      if (nomesConvertidos.length > 0) {
        const { data: barbs } = await supabase.from("barbearias").select("nome, plano, ativo, data_vencimento").in("nome", nomesConvertidos);
        barbeariasReais = barbs || [];
      }

      let somaComissoes = 0;
      
      // Mapeia os leads injetando os dados reais do sistema para alertas
      const leadsEnriquecidos = leads?.map(lead => {
        if (lead.status === 'convertido') {
          const barbReal = barbeariasReais.find(b => b.nome === lead.nome_barbearia);
          if (barbReal && barbReal.ativo) {
            if (barbReal.plano === 'starter') somaComissoes += (50 * 0.30);
            if (barbReal.plano === 'pro')     somaComissoes += (99.90 * 0.40);
            if (barbReal.plano === 'elite')   somaComissoes += (497 * 0.50);
          }
          return { ...lead, barbearia_real: barbReal };
        }
        return lead;
      }) || [];

      setMeusLeads(leadsEnriquecidos);
      setRecorrenciaCalculada(somaComissoes);

      // CÁLCULO DA TAXA DE CONVERSÃO
      const total = leadsEnriquecidos.length;
      const convertidos = leadsEnriquecidos.filter(l => l.status === 'convertido').length;
      setTaxaConversao(total > 0 ? Math.round((convertidos / total) * 100) : 0);

    } catch (error) {
      console.error("Erro na performance:", error);
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => { carregarDadosPerformance(); }, [vendedorId]);

  const handleRegistrarLead = async () => {
    if (!formNovoLead.nome) return toast.error("O nome da barbearia é obrigatório.");
    if (tabAtiva === "contrato" && (!formNovoLead.email || !formNovoLead.senha)) {
      return toast.error("E-mail e senha são obrigatórios para fechar contrato.");
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const idReal = session?.user?.id || vendedorId;

      const payload = {
        nome_barbearia: formNovoLead.nome,
        bairro: formNovoLead.bairro,
        status: tabAtiva === "visita" ? "visita" : "pendente",
        vendedor_id: idReal,
        dados_adicionais: {
          cidade: formNovoLead.bairro,
          plano_escolhido: formNovoLead.plano,
          email_dono: formNovoLead.email,
          senha_temp: formNovoLead.senha,
          telefone: formNovoLead.telefone.replace(/\D/g, ''), // Salva só números
          cor_primaria: formNovoLead.cor_primaria,
          cor_secundaria: formNovoLead.cor_secundaria,
          cor_destaque: formNovoLead.cor_destaque,
          historico: [] // Array para as anotações do vendedor
        }
      };

      const { error } = await supabase.from("leads").insert([payload]);
      if (error) throw error;

      toast.success(tabAtiva === "visita" ? "Visita registrada no funil!" : "Contrato enviado ao CEO!");
      
      if (tabAtiva === "contrato") {
        const numeroCEO = "5517992051576"; 
        const mensagem = `Fala César! 🚀\n\nAcabei de fechar um novo contrato:\n💈 *${formNovoLead.nome}*\n💎 Plano: *${formNovoLead.plano.toUpperCase()}*\n📍 Local: ${formNovoLead.bairro}\n\nJá está no sistema, aprova lá! 🔥`;
        window.open(`https://api.whatsapp.com/send?phone=${numeroCEO}&text=${encodeURIComponent(mensagem)}`, "_blank");
      }

      setModalCadastroAberto(false);
      setFormNovoLead(FORM_NOVO_LEAD_INICIAL);
      carregarDadosPerformance();

    } catch (error) {
      toast.error("Erro ao salvar. Verifique sua conexão.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSalvarFollowUp = async () => {
    if (!textoFollowUp) return;
    setIsSubmitting(true);
    try {
      const novoHistorico = [
        { data: new Date().toISOString(), texto: textoFollowUp },
        ...(leadSelecionado.dados_adicionais?.historico || [])
      ];
      
      const dadosAtualizados = { ...leadSelecionado.dados_adicionais, historico: novoHistorico };
      
      const { error } = await supabase.from("leads").update({ dados_adicionais: dadosAtualizados }).eq("id", leadSelecionado.id);
      if (error) throw error;

      toast.success("Anotação salva com sucesso!");
      setTextoFollowUp("");
      setModalFollowUpAberto(false);
      carregarDadosPerformance();
    } catch(e) {
      toast.error("Erro ao salvar anotação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMudarStatusLead = async (lead: any, novoStatus: string) => {
    const tId = toast.loading("Movendo no funil...");
    try {
      const { error } = await supabase.from("leads").update({ status: novoStatus }).eq("id", lead.id);
      if (error) throw error;
      toast.success("Lead avançou no funil! 🚀", { id: tId });
      carregarDadosPerformance();
    } catch(e) {
      toast.error("Erro ao mover lead.", { id: tId });
    }
  };

  const copiarLinkAfiliado = () => {
    const link = `${window.location.origin}/convite/${vendedorId || 'parceiro'}`;
    navigator.clipboard.writeText(link);
    toast.success("Link de afiliado copiado! Envie para o barbeiro assinar.");
  };

  const leadsFiltrados = meusLeads.filter(lead => 
    lead.nome_barbearia.toLowerCase().includes(busca.toLowerCase()) || 
    (lead.bairro && lead.bairro.toLowerCase().includes(busca.toLowerCase()))
  );

  const leadsVisita = leadsFiltrados.filter(l => l.status === 'visita');
  const leadsPendente = leadsFiltrados.filter(l => l.status === 'pendente');
  const leadsConvertido = leadsFiltrados.filter(l => l.status === 'convertido');

  return (
    <div className="space-y-6 pb-32 w-full max-w-full overflow-x-hidden p-4 bg-black min-h-screen relative font-sans">
      
      {/* HEADER GAMIFICADO */}
      <header className="flex flex-col gap-3 pt-2">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
              <span className="text-[10px] uppercase font-black text-emerald-500 tracking-[0.2em]">Partner Hub</span>
            </div>
            <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">Fala, {vendedorNome.split(" ")[0]} 🚀</h1>
          </div>
          
          <Button onClick={copiarLinkAfiliado} className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black border border-emerald-500/30 h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
            <Share2 className="h-4 w-4 mr-2" /> Meu Link
          </Button>
        </div>

        {/* BARRA DE META MENSAL */}
        <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-2xl">
           <div className="flex justify-between text-[10px] font-black uppercase text-zinc-500 mb-2">
             <span>Progresso da Meta</span>
             <span className="text-emerald-500">{formatarMoeda(recorrenciaCalculada)} / {formatarMoeda(META_MENSAL)}</span>
           </div>
           <div className="h-3 w-full bg-black rounded-full overflow-hidden border border-zinc-800">
             <motion.div 
                initial={{ width: 0 }} animate={{ width: `${progressoMeta}%` }} transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full relative"
             >
                <div className="absolute top-0 right-0 bottom-0 left-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30" />
             </motion.div>
           </div>
           <p className="text-[9px] text-zinc-600 mt-2 font-bold italic text-right">
             {progressoMeta >= 100 ? "🏆 META BATIDA! VOCÊ É ELITE!" : `Faltam ${formatarMoeda(META_MENSAL - recorrenciaCalculada)} para o bônus.`}
           </p>
        </div>
      </header>

      {/* METRICAS E CARTEIRA (WALLET) */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 bg-zinc-900/50 border-zinc-800 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:rotate-12 transition-transform duration-500">
            <Wallet className="h-24 w-24" />
          </div>
          <p className="text-[9px] uppercase font-black text-zinc-500 mb-1 flex items-center gap-1"><Zap className="h-3 w-3 text-emerald-500" /> MRR (Sua Parte)</p>
          <p className="text-2xl font-black text-white italic">{formatarMoeda(recorrenciaCalculada)}</p>
          <Button onClick={() => setModalSaqueAberto(true)} variant="link" className="text-[9px] text-emerald-500 p-0 h-auto mt-2 uppercase font-black tracking-widest hover:text-emerald-400">Solicitar Saque ➔</Button>
        </Card>

        <Card className="p-4 bg-zinc-900/50 border-zinc-800 backdrop-blur-md relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-[0.03]">
            <Target className="h-24 w-24" />
          </div>
          <p className="text-[9px] uppercase font-black text-zinc-500 mb-1 flex items-center gap-1"><TrendingUp className="h-3 w-3 text-blue-500" /> Conversão</p>
          <p className="text-2xl font-black text-white italic">{taxaConversao}%</p>
          <p className="text-[9px] text-zinc-600 mt-2 uppercase font-bold italic">{meusLeads.length} leads no funil</p>
        </Card>
      </div>

      {/* BARRA DE AÇÕES E BUSCA */}
      <div className="flex gap-2 sticky top-2 z-40 bg-black/80 backdrop-blur-md p-1 -mx-1 rounded-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
          <input placeholder="Buscar barbearia..." className="w-full bg-zinc-900 border border-zinc-800 rounded-xl h-12 pl-10 pr-4 text-sm text-white outline-none focus:border-emerald-500 transition-all shadow-inner" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Button onClick={() => toast.info("📍 Buscando leads num raio de 5km... (Em breve)")} className="bg-zinc-800 text-white hover:bg-zinc-700 font-black h-12 w-12 rounded-xl shrink-0 border border-zinc-700">
          <MapPin className="h-5 w-5" />
        </Button>
        <Button onClick={() => { setTabAtiva("contrato"); setModalCadastroAberto(true); }} className="bg-emerald-600 hover:bg-emerald-500 text-black font-black h-12 w-12 rounded-xl shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          <Plus className="h-6 w-6 stroke-[3px]" />
        </Button>
      </div>

      {/* 🚀 NOVO FUNIL KANBAN HORIZONTAL */}
      <section className="space-y-4">
        <h3 className="font-black text-white uppercase text-sm italic px-1 flex items-center gap-2 border-b border-zinc-800 pb-2">
          <Target className="h-4 w-4 text-emerald-500" /> Pipeline de Vendas
        </h3>
        
        {loadingLeads ? (
          <div className="text-emerald-500 text-xs font-black uppercase text-center py-20 flex flex-col items-center gap-3 animate-pulse">
            <Loader2 className="h-8 w-8 animate-spin" /> Carregando Funil...
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-6 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            
            {/* COLUNA 1: VISITAS / PROSPECÇÃO */}
            <div className="min-w-[85vw] sm:min-w-[320px] bg-zinc-900/30 rounded-[28px] p-2 border border-zinc-800/50 snap-center flex flex-col max-h-[60vh]">
              <div className="flex justify-between items-center px-3 py-3 mb-2">
                 <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2"><MapPin className="h-4 w-4" /> Prospecção ({leadsVisita.length})</h4>
                 <Button onClick={() => { setTabAtiva("visita"); setModalCadastroAberto(true); }} size="icon" variant="ghost" className="h-6 w-6 text-zinc-500 bg-zinc-800 rounded-full"><Plus className="h-3 w-3" /></Button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 px-1 hide-scrollbar">
                {leadsVisita.map(lead => <LeadCard key={lead.id} lead={lead} onFollowUp={() => { setLeadSelecionado(lead); setModalFollowUpAberto(true); }} onMover={() => handleMudarStatusLead(lead, 'pendente')} nextLabel="Aprovar" />)}
                {leadsVisita.length === 0 && <div className="text-center py-10 text-[10px] text-zinc-600 font-bold uppercase border border-dashed border-zinc-800 rounded-2xl mx-2">Vazio</div>}
              </div>
            </div>

            {/* COLUNA 2: NEGOCIAÇÃO / PENDENTE */}
            <div className="min-w-[85vw] sm:min-w-[320px] bg-blue-900/5 rounded-[28px] p-2 border border-blue-900/20 snap-center flex flex-col max-h-[60vh]">
              <div className="flex justify-between items-center px-3 py-3 mb-2">
                 <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest flex items-center gap-2"><Clock className="h-4 w-4" /> Negociação ({leadsPendente.length})</h4>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 px-1 hide-scrollbar">
                {leadsPendente.map(lead => <LeadCard key={lead.id} lead={lead} onFollowUp={() => { setLeadSelecionado(lead); setModalFollowUpAberto(true); }} onMover={() => handleMudarStatusLead(lead, 'convertido')} nextLabel="Fechar" />)}
                {leadsPendente.length === 0 && <div className="text-center py-10 text-[10px] text-blue-900/50 font-bold uppercase border border-dashed border-blue-900/20 rounded-2xl mx-2">Vazio</div>}
              </div>
            </div>

            {/* COLUNA 3: ATIVOS / CONVERTIDOS */}
            <div className="min-w-[85vw] sm:min-w-[320px] bg-emerald-900/5 rounded-[28px] p-2 border border-emerald-900/20 snap-center flex flex-col max-h-[60vh]">
              <div className="flex justify-between items-center px-3 py-3 mb-2">
                 <h4 className="text-xs font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2"><Crown className="h-4 w-4" /> Carteira Ativa ({leadsConvertido.length})</h4>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 px-1 hide-scrollbar">
                {leadsConvertido.map(lead => <LeadCard key={lead.id} lead={lead} onFollowUp={() => { setLeadSelecionado(lead); setModalFollowUpAberto(true); }} isFinal />)}
                {leadsConvertido.length === 0 && <div className="text-center py-10 text-[10px] text-emerald-900/50 font-bold uppercase border border-dashed border-emerald-900/20 rounded-2xl mx-2">Vazio</div>}
              </div>
            </div>

          </div>
        )}
      </section>

      {/* 🚀 BOTAO FLUTUANTE: KIT DE GUERRA */}
      <div className="fixed bottom-6 right-4 z-50">
        <Button onClick={() => setModalKitAberto(true)} className="h-16 w-16 rounded-full bg-emerald-600 text-black shadow-[0_10px_30px_rgba(16,185,129,0.4)] border-2 border-emerald-400 p-0 flex items-center justify-center hover:scale-105 transition-transform">
           <BookOpen className="h-7 w-7 stroke-[2.5px]" />
        </Button>
      </div>

      {/* ========================================================
          MODAIS DO SISTEMA
      ======================================================== */}

      {/* MODAL CADASTRO / CONTRATO (MANTIDO E MELHORADO) */}
      {modalCadastroAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-[2rem] p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto hide-scrollbar">
            <div className="flex justify-between items-center sticky top-0 bg-zinc-900 pb-2 z-10">
              <h2 className="text-white font-black uppercase italic text-xl flex items-center gap-2">
                {tabAtiva === 'visita' ? <MapPin className="text-zinc-500" /> : <Crown className="text-emerald-500" />}
                {tabAtiva === 'visita' ? 'Nova Visita' : 'Fechar Contrato'}
              </h2>
              <button onClick={() => setModalCadastroAberto(false)} className="text-zinc-600 hover:text-white bg-zinc-800 p-2 rounded-full"><X className="h-4 w-4" /></button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black text-zinc-500 ml-1">Identificação</label>
                <Input className="bg-black border-zinc-800 text-white h-14 rounded-xl text-base" placeholder="Nome da Barbearia" value={formNovoLead.nome} onChange={e => setFormNovoLead({ ...formNovoLead, nome: e.target.value })} />
                <Input className="bg-black border-zinc-800 text-white h-14 rounded-xl text-base mt-2" placeholder="Bairro / Cidade" value={formNovoLead.bairro} onChange={e => setFormNovoLead({ ...formNovoLead, bairro: e.target.value })} />
                <Input className="bg-black border-zinc-800 text-white h-14 rounded-xl text-base mt-2" placeholder="WhatsApp (DDD + Número)" type="tel" value={formNovoLead.telefone} onChange={e => setFormNovoLead({ ...formNovoLead, telefone: e.target.value })} />
              </div>
              
              {tabAtiva === "contrato" && (
                <div className="space-y-5 pt-4 border-t border-zinc-800/50">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-500 uppercase italic ml-1">Plano Escolhido</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['starter', 'pro', 'elite'].map((p) => (
                        <button key={p} onClick={() => setFormNovoLead({...formNovoLead, plano: p})}
                          className={cn("py-3 rounded-xl text-[10px] font-black uppercase border transition-all", formNovoLead.plano === p ? "bg-emerald-600 border-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600")}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] uppercase font-black text-zinc-500 ml-1">Acesso do Dono</label>
                    <Input type="email" className="bg-black border-zinc-800 text-white h-14 rounded-xl text-base" placeholder="E-mail" value={formNovoLead.email} onChange={e => setFormNovoLead({ ...formNovoLead, email: e.target.value })} />
                    <Input className="bg-black border-zinc-800 text-white h-14 rounded-xl text-base" placeholder="Senha Provisória" value={formNovoLead.senha} onChange={e => setFormNovoLead({ ...formNovoLead, senha: e.target.value })} />
                  </div>

                  {/* PALETA DE CORES */}
                  <div className="space-y-2 pb-4">
                    <label className="text-[10px] font-black text-zinc-500 uppercase italic ml-1">Cores do App</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-black border border-zinc-800 p-2 rounded-xl flex flex-col items-center">
                        <span className="text-[8px] text-zinc-500 font-black uppercase mb-1">Destaque</span>
                        <input type="color" value={formNovoLead.cor_primaria} onChange={e => setFormNovoLead({ ...formNovoLead, cor_primaria: e.target.value })} className="h-8 w-full cursor-pointer bg-transparent border-none rounded" />
                      </div>
                      <div className="bg-black border border-zinc-800 p-2 rounded-xl flex flex-col items-center">
                        <span className="text-[8px] text-zinc-500 font-black uppercase mb-1">Fundo</span>
                        <input type="color" value={formNovoLead.cor_secundaria} onChange={e => setFormNovoLead({ ...formNovoLead, cor_secundaria: e.target.value })} className="h-8 w-full cursor-pointer bg-transparent border-none rounded" />
                      </div>
                      <div className="bg-black border border-zinc-800 p-2 rounded-xl flex flex-col items-center">
                        <span className="text-[8px] text-zinc-500 font-black uppercase mb-1">Textos</span>
                        <input type="color" value={formNovoLead.cor_destaque} onChange={e => setFormNovoLead({ ...formNovoLead, cor_destaque: e.target.value })} className="h-8 w-full cursor-pointer bg-transparent border-none rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button onClick={handleRegistrarLead} disabled={isSubmitting} className="w-full bg-emerald-600 text-black font-black h-16 rounded-2xl text-lg uppercase italic shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform sticky bottom-0">
              {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : tabAtiva === 'visita' ? "Salvar Visita" : "Finalizar Instalação"}
            </Button>
          </div>
        </div>
      )}

      {/* MODAL FOLLOW-UP (ANOTAÇÕES) */}
      {modalFollowUpAberto && leadSelecionado && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-[2rem] p-6 space-y-6 shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95">
            <div className="flex justify-between items-center">
              <h2 className="text-white font-black uppercase italic text-lg flex items-center gap-2"><Calendar className="text-emerald-500 h-5 w-5" /> Histórico</h2>
              <button onClick={() => setModalFollowUpAberto(false)} className="text-zinc-600 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <div className="bg-black p-4 rounded-xl border border-zinc-800">
               <p className="font-bold text-white uppercase text-sm">{leadSelecionado.nome_barbearia}</p>
               <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-1">Registro de contatos</p>
            </div>
            
            <div className="max-h-40 overflow-y-auto space-y-2 border-l-2 border-zinc-800 pl-3 ml-2">
              {leadSelecionado.dados_adicionais?.historico?.length > 0 ? (
                 leadSelecionado.dados_adicionais.historico.map((h: any, i: number) => (
                   <div key={i} className="relative">
                      <div className="absolute -left-[19px] top-1.5 h-3 w-3 bg-zinc-800 rounded-full border-2 border-zinc-900" />
                      <p className="text-[9px] text-emerald-500 font-black mb-0.5">{new Date(h.data).toLocaleDateString('pt-BR')} às {new Date(h.data).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
                      <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-800/50 p-2 rounded-lg">{h.texto}</p>
                   </div>
                 ))
              ) : (
                <p className="text-xs text-zinc-600 font-medium italic py-4">Nenhuma anotação registrada ainda.</p>
              )}
            </div>

            <div className="space-y-2">
              <Input placeholder="O que foi conversado hoje?" className="bg-black border-zinc-800 text-white h-12 rounded-xl" value={textoFollowUp} onChange={e => setTextoFollowUp(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSalvarFollowUp()} />
              <Button onClick={handleSalvarFollowUp} disabled={isSubmitting || !textoFollowUp} className="w-full bg-zinc-800 text-white font-black h-12 rounded-xl uppercase tracking-widest text-[10px]">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Anotação"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DA CARTEIRA (SAQUE) */}
      {modalSaqueAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-[2rem] p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95">
            <button onClick={() => setModalSaqueAberto(false)} className="absolute top-6 right-6 text-zinc-600 hover:text-white"><X className="h-5 w-5" /></button>
            <Wallet className="h-16 w-16 text-emerald-500 mx-auto opacity-80" />
            <div>
              <h2 className="text-white font-black uppercase italic text-2xl tracking-tighter">Seu Saldo</h2>
              <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mt-1">Disponível para Saque</p>
            </div>
            <div className="bg-black border border-zinc-800 py-6 rounded-3xl">
               <p className="text-4xl font-black text-emerald-500 italic">{formatarMoeda(recorrenciaCalculada)}</p>
            </div>
            <Button onClick={() => {
              const msg = `Fala Cesar! Solicito o saque das minhas comissões no valor de ${formatarMoeda(recorrenciaCalculada)}. Minha chave PIX é: [COLOQUE SUA CHAVE AQUI]`;
              window.open(`https://wa.me/5517992051576?text=${encodeURIComponent(msg)}`, '_blank');
              setModalSaqueAberto(false);
            }} className="w-full bg-emerald-600 text-black font-black h-14 rounded-2xl uppercase italic tracking-widest shadow-lg shadow-emerald-500/20">
              Pedir PIX ao CEO
            </Button>
            <p className="text-[9px] text-zinc-600 uppercase font-bold italic">O pagamento é realizado em até 2h úteis.</p>
          </div>
        </div>
      )}

      {/* MODAL KIT DE GUERRA (PLAYBOOK) */}
      {modalKitAberto && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-[2rem] p-6 space-y-6 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
              <div>
                <h2 className="text-white font-black uppercase italic text-2xl tracking-tighter flex items-center gap-2"><BookOpen className="text-emerald-500 h-6 w-6" /> Playbook</h2>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mt-1">Arsenal de Vendas</p>
              </div>
              <button onClick={() => setModalKitAberto(false)} className="text-zinc-600 hover:text-white bg-zinc-800 p-3 rounded-full"><X className="h-4 w-4" /></button>
            </div>
            
            <div className="space-y-3">
               <a href="#" onClick={(e) => { e.preventDefault(); toast.info("Baixando PDF..."); }} className="flex items-center justify-between p-4 bg-black border border-zinc-800 rounded-2xl hover:border-emerald-500 transition-colors group">
                  <div className="flex items-center gap-4">
                     <div className="h-10 w-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center"><FileText className="h-5 w-5" /></div>
                     <div>
                       <p className="text-sm font-black text-white uppercase italic">Apresentação Oficial</p>
                       <p className="text-[10px] text-zinc-500 font-bold uppercase">PDF para mostrar ao cliente</p>
                     </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-emerald-500 transition-transform group-hover:translate-x-1" />
               </a>

               <button onClick={() => {
                 const script = "Fala [Nome], tudo bem? Vi que você é dono da barbearia. Hoje como você gerencia seus agendamentos? O caderno tá te fazendo perder dinheiro. Posso te mostrar como meus clientes aumentaram 30% a receita só trocando pro nosso App?";
                 navigator.clipboard.writeText(script);
                 toast.success("Script copiado para a área de transferência!");
               }} className="w-full flex items-center justify-between p-4 bg-black border border-zinc-800 rounded-2xl hover:border-emerald-500 transition-colors group text-left">
                  <div className="flex items-center gap-4">
                     <div className="h-10 w-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center"><MessageCircle className="h-5 w-5" /></div>
                     <div>
                       <p className="text-sm font-black text-white uppercase italic">Script Quebra-Gelo</p>
                       <p className="text-[10px] text-zinc-500 font-bold uppercase">Toque para copiar texto de WhatsApp</p>
                     </div>
                  </div>
                  <Copy className="h-4 w-4 text-zinc-600 group-hover:text-emerald-500" />
               </button>
            </div>
            <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl text-center">
              <p className="text-xs text-emerald-500 font-bold italic leading-relaxed">"O cliente não compra o sistema, ele compra o tempo e o dinheiro que o sistema vai dar pra ele."</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/** * COMPONENTE ISOLADO DO CARD DO LEAD (KABAN) 
 * Traz a inteligência de Churn, Upsell e Ações 1-Click
 */
function LeadCard({ lead, onFollowUp, onMover, isFinal = false }: { lead: any, onFollowUp: () => void, onMover?: () => void, isFinal?: boolean }) {
  const telefone = lead.dados_adicionais?.telefone;
  const planoAtual = lead.dados_adicionais?.plano_escolhido || 'pro';
  
  // INTELIGÊNCIA: Verifica se é um lead convertido que está inativo no banco real (CHURN)
  const isChurn = lead.status === 'convertido' && lead.barbearia_real && lead.barbearia_real.ativo === false;
  // INTELIGÊNCIA: Verifica se é um lead ativo, mas num plano baixo (UPSELL)
  const isUpsell = lead.status === 'convertido' && !isChurn && planoAtual === 'starter';

  const zapLink = telefone ? `https://wa.me/55${telefone}?text=${encodeURIComponent(`Fala mestre, tudo bem? Aqui é da CAJ TECH...`)}` : '#';

  return (
    <Card className={cn(
      "p-4 bg-zinc-900/60 border-zinc-800 relative overflow-hidden transition-all group hover:border-zinc-600 flex flex-col gap-3",
      isChurn && "border-red-500/50 bg-red-500/5",
      isUpsell && "border-yellow-500/30"
    )}>
      {isChurn && <div className="absolute top-0 right-0 bg-red-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-bl-lg flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Fatura Vencida</div>}
      {isUpsell && <div className="absolute top-0 right-0 bg-yellow-500 text-black text-[8px] font-black uppercase px-2 py-0.5 rounded-bl-lg flex items-center gap-1"><Zap className="h-3 w-3" /> Vender PRO</div>}

      <div>
        <h4 className={cn("font-black uppercase italic text-sm tracking-tight", isChurn ? "text-red-400" : "text-white")}>{lead.nome_barbearia}</h4>
        <div className="flex items-center gap-3 mt-1.5 opacity-70 text-[9px] font-bold uppercase tracking-widest text-zinc-400">
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {lead.bairro || '---'}</span>
          <span className="flex items-center gap-1"><Crown className={cn("h-3 w-3", planoAtual === 'starter' ? 'text-zinc-400' : 'text-emerald-500')} /> {planoAtual}</span>
        </div>
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-zinc-800/50">
        <div className="flex gap-2">
          {telefone && (
            <Button onClick={() => window.open(zapLink, '_blank')} size="icon" variant="ghost" className="h-8 w-8 text-green-500 bg-green-500/10 hover:bg-green-500/20 rounded-lg" title="Chamar no WhatsApp">
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}
          <Button onClick={onFollowUp} size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 bg-zinc-800/50 hover:bg-zinc-800 hover:text-white rounded-lg" title="Anotar Follow-up">
            <Calendar className="h-4 w-4" />
          </Button>
        </div>

        {!isFinal && onMover && (
          <Button onClick={onMover} className="h-8 bg-zinc-800 hover:bg-zinc-700 text-white text-[9px] font-black uppercase tracking-widest rounded-lg px-3">
            Avançar <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>
    </Card>
  );
}