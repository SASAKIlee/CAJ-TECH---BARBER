import { useState, useEffect } from "react";
import { Search, Plus, X, Loader2, Clock, CheckCircle, MapPin, Zap, Crown, Target, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner"; 
import { cn } from "@/lib/utils";

// CONFIGURAÇÃO INICIAL DO FORMULÁRIO
const FORM_NOVO_LEAD_INICIAL = { 
  nome: "", bairro: "", email: "", senha: "", telefone: "", 
  plano: "pro", // Plano padrão ao abrir o modal
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
  
  // ESTADOS DE PERFORMANCE REALTIME
  const [recorrenciaCalculada, setRecorrenciaCalculada] = useState(0);
  const [taxaConversao, setTaxaConversao] = useState(0);

  const carregarDadosPerformance = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const idReal = session?.user?.id || vendedorId;
      if (!idReal) return;

      // 1. BUSCA TODOS OS LEADS DO VENDEDOR
      const { data: leads, error: leadsError } = await supabase
        .from("leads")
        .select("*")
        .eq("vendedor_id", idReal);

      if (leadsError) throw leadsError;
      setMeusLeads(leads || []);

      // 2. CÁLCULO DA TAXA DE CONVERSÃO
      const total = leads?.length || 0;
      const convertidos = leads?.filter(l => l.status === 'convertido').length || 0;
      setTaxaConversao(total > 0 ? Math.round((convertidos / total) * 100) : 0);

      // 3. 🚀 CÁLCULO DA RECORRÊNCIA ATIVA (NET MRR)
      // Buscamos as barbearias reais para ver quem está ATIVO e qual o PLANO
      const nomesConvertidos = leads?.filter(l => l.status === 'convertido').map(l => l.nome_barbearia) || [];
      
      if (nomesConvertidos.length > 0) {
        const { data: barbearias } = await supabase
          .from("barbearias")
          .select("plano, ativo")
          .in("nome", nomesConvertidos);

        let somaComissoes = 0;
        barbearias?.forEach(barb => {
          // 🛡️ SÓ SOMA SE O CLIENTE ESTIVER ATIVO (PAGANDO)
          if (barb.ativo) {
            if (barb.plano === 'starter') somaComissoes += (50 * 0.30);   // R$ 15,00
            if (barb.plano === 'pro')     somaComissoes += (99.90 * 0.40); // R$ 39,96
            if (barb.plano === 'elite')   somaComissoes += (497 * 0.50);   // R$ 248,50
          }
        });
        setRecorrenciaCalculada(somaComissoes);
      } else {
        setRecorrenciaCalculada(0);
      }

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
          cidade: formNovoLead.bairro, // Usando campo bairro como cidade nos extras
          plano_escolhido: formNovoLead.plano,
          email_dono: formNovoLead.email,
          senha_temp: formNovoLead.senha,
          telefone: formNovoLead.telefone,
          cor_primaria: formNovoLead.cor_primaria,
          cor_secundaria: formNovoLead.cor_secundaria,
          cor_destaque: formNovoLead.cor_destaque
        }
      };

      const { error } = await supabase.from("leads").insert([payload]);
      if (error) throw error;

      toast.success(tabAtiva === "visita" ? "Visita registrada!" : "Contrato enviado ao CEO!");
      
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

  const leadsFiltrados = meusLeads.filter(lead => 
    lead.nome_barbearia.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-32 w-full max-w-full overflow-x-hidden p-4 bg-black min-h-screen relative">
      <header className="flex flex-col gap-1 pt-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] uppercase font-black text-emerald-500 tracking-[0.2em]">Partner Dashboard</span>
        </div>
        <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">Olá, {vendedorNome.split(" ")[0]}</h1>
        <p className="text-zinc-500 text-xs font-bold uppercase">Sua carteira de clientes ativos</p>
      </header>

      {/* METRICAS INTELIGENTES */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-5 bg-zinc-900/50 border-zinc-800 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute -right-2 -top-2 opacity-10 group-hover:rotate-12 transition-transform">
            <Zap className="h-16 w-16 text-emerald-500" />
          </div>
          <p className="text-[9px] uppercase font-black text-zinc-500 mb-1">Recorrência Real</p>
          <p className="text-2xl font-black text-emerald-500 italic">{formatarMoeda(recorrenciaCalculada)}</p>
          <p className="text-[7px] text-zinc-600 mt-1 uppercase font-bold italic">*Apenas pagantes</p>
        </Card>
        <Card className="p-5 bg-zinc-900/50 border-zinc-800 backdrop-blur-md">
          <p className="text-[9px] uppercase font-black text-zinc-500 mb-1">Conversão</p>
          <p className="text-2xl font-black text-white italic">{taxaConversao}%</p>
          <p className="text-[7px] text-zinc-600 mt-1 uppercase font-bold italic">{meusLeads.length} leads no funil</p>
        </Card>
      </div>

      {/* BUSCA E AÇÕES */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-600" />
          <input placeholder="Buscar no meu funil..." className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 pl-10 text-sm text-white outline-none focus:border-emerald-500 transition-colors" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Button onClick={() => { setTabAtiva("visita"); setModalCadastroAberto(true); }} className="bg-zinc-800 text-white font-black h-12 w-12 rounded-xl active:scale-95 transition-transform">
          <MapPin className="h-5 w-5" />
        </Button>
        <Button onClick={() => { setTabAtiva("contrato"); setModalCadastroAberto(true); }} className="bg-emerald-600 text-black font-black h-12 w-12 rounded-xl active:scale-95 transition-transform shadow-lg shadow-emerald-500/20">
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* LISTAGEM DO FUNIL */}
      <section className="space-y-4">
        <h3 className="font-black text-white uppercase text-sm italic px-1 flex items-center gap-2">
          <Target className="h-4 w-4 text-emerald-500" /> Meu Funil de Vendas
        </h3>
        
        <div className="grid gap-3">
          {loadingLeads ? (
            <div className="text-zinc-600 text-[10px] uppercase font-bold text-center py-10 italic animate-pulse">Sincronizando com a base...</div>
          ) : leadsFiltrados.length === 0 ? (
            <div className="text-zinc-600 text-[10px] uppercase font-bold text-center py-10 italic border border-dashed border-zinc-800 rounded-3xl">Nenhum lead encontrado.</div>
          ) : (
            leadsFiltrados.map((lead) => (
              <div key={lead.id} className="bg-zinc-900/40 border border-zinc-800 backdrop-blur-md rounded-2xl p-4 flex justify-between items-center group">
                <div>
                  <h4 className="font-bold text-white text-sm uppercase italic group-hover:text-emerald-400 transition-colors">{lead.nome_barbearia}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-zinc-600" />
                      <span className="text-[9px] text-zinc-500 font-bold uppercase">{lead.bairro || 'S. Localização'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-emerald-600" />
                      <span className="text-[9px] text-emerald-600/80 font-black uppercase">{lead.dados_adicionais?.plano_escolhido || 'Pro'}</span>
                    </div>
                  </div>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-lg text-[9px] font-black uppercase border italic",
                  lead.status === 'visita' && "bg-zinc-800 text-zinc-400 border-zinc-700",
                  lead.status === 'pendente' && "bg-blue-500/10 text-blue-500 border-blue-500/20",
                  lead.status === 'convertido' && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                )}>
                  {lead.status === 'visita' ? 'Visita' : lead.status === 'pendente' ? 'Aprovação' : 'Ativo'}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* MODAL DE CADASTRO COM SELEÇÃO DE PLANO */}
      {modalCadastroAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-[2rem] p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-white font-black uppercase italic text-xl flex items-center gap-2">
                {tabAtiva === 'visita' ? <MapPin className="text-zinc-500" /> : <Crown className="text-emerald-500" />}
                {tabAtiva === 'visita' ? 'Nova Visita' : 'Fechar Contrato'}
              </h2>
              <button onClick={() => setModalCadastroAberto(false)} className="text-zinc-600 hover:text-white"><X /></button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] uppercase font-black text-zinc-500 ml-1">Identificação</label>
                <Input className="bg-black border-zinc-800 text-white h-12 rounded-xl" placeholder="Nome da Barbearia" value={formNovoLead.nome} onChange={e => setFormNovoLead({ ...formNovoLead, nome: e.target.value })} />
                <Input className="bg-black border-zinc-800 text-white h-12 rounded-xl mt-2" placeholder="Bairro / Cidade" value={formNovoLead.bairro} onChange={e => setFormNovoLead({ ...formNovoLead, bairro: e.target.value })} />
              </div>
              
              {tabAtiva === "contrato" && (
                <div className="space-y-4 pt-4 border-t border-zinc-800/50">
                  
                  {/* SELETOR DE PLANOS */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-500 uppercase italic ml-1">Plano Escolhido pelo Cliente</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['starter', 'pro', 'elite'].map((p) => (
                        <button
                          key={p}
                          onClick={() => setFormNovoLead({...formNovoLead, plano: p})}
                          className={cn(
                            "py-2 rounded-xl text-[9px] font-black uppercase border transition-all",
                            formNovoLead.plano === p 
                              ? "bg-emerald-600 border-emerald-500 text-black shadow-lg shadow-emerald-500/20" 
                              : "bg-black border-zinc-800 text-zinc-500"
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] uppercase font-black text-zinc-500 ml-1">Acesso e Contato</label>
                    <Input type="email" className="bg-black border-zinc-800 text-white h-12 rounded-xl" placeholder="E-mail do Proprietário" value={formNovoLead.email} onChange={e => setFormNovoLead({ ...formNovoLead, email: e.target.value })} />
                    <Input className="bg-black border-zinc-800 text-white h-12 rounded-xl" placeholder="Senha Provisória" value={formNovoLead.senha} onChange={e => setFormNovoLead({ ...formNovoLead, senha: e.target.value })} />
                    <Input className="bg-black border-zinc-800 text-white h-12 rounded-xl" placeholder="WhatsApp (DDD)" value={formNovoLead.telefone} onChange={e => setFormNovoLead({ ...formNovoLead, telefone: e.target.value })} />
                  </div>

                  {/* PALETA DE CORES */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase italic ml-1">Identidade Visual (Cores)</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-black border border-zinc-800 p-2 rounded-xl flex flex-col items-center">
                        <span className="text-[8px] text-zinc-500 font-black uppercase mb-1">Destaque</span>
                        <input type="color" value={formNovoLead.cor_primaria} onChange={e => setFormNovoLead({ ...formNovoLead, cor_primaria: e.target.value })} className="h-6 w-full cursor-pointer bg-transparent border-none" />
                      </div>
                      <div className="bg-black border border-zinc-800 p-2 rounded-xl flex flex-col items-center">
                        <span className="text-[8px] text-zinc-500 font-black uppercase mb-1">Fundo</span>
                        <input type="color" value={formNovoLead.cor_secundaria} onChange={e => setFormNovoLead({ ...formNovoLead, cor_secundaria: e.target.value })} className="h-6 w-full cursor-pointer bg-transparent border-none" />
                      </div>
                      <div className="bg-black border border-zinc-800 p-2 rounded-xl flex flex-col items-center">
                        <span className="text-[8px] text-zinc-500 font-black uppercase mb-1">Textos</span>
                        <input type="color" value={formNovoLead.cor_destaque} onChange={e => setFormNovoLead({ ...formNovoLead, cor_destaque: e.target.value })} className="h-6 w-full cursor-pointer bg-transparent border-none" />
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>

            <Button onClick={handleRegistrarLead} disabled={isSubmitting} className="w-full bg-emerald-600 text-black font-black h-14 rounded-2xl text-lg uppercase italic shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform">
              {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : tabAtiva === 'visita' ? "Confirmar Visita" : "Finalizar e Instalar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}