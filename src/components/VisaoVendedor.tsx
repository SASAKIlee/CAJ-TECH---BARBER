import { useState, useEffect } from "react";
import { Search, Plus, X, Loader2, Clock, CheckCircle, MapPin, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner"; 

// 🚀 AGORA TEM AS 3 CORES INICIAIS
const FORM_NOVO_LEAD_INICIAL = { 
  nome: "", bairro: "", email: "", senha: "", telefone: "", 
  cor_primaria: "#D4AF37", cor_secundaria: "#18181B", cor_destaque: "#FFFFFF" 
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface VisaoVendedorProps {
  vendedorId?: string; 
  vendedorNome?: string;
  clientesAtivos?: unknown[];
}

export function VisaoVendedor({
  vendedorId,
  vendedorNome = "Consultor CAJ",
  clientesAtivos = [],
}: VisaoVendedorProps) {
  const [busca, setBusca] = useState("");
  const [modalCadastroAberto, setModalCadastroAberto] = useState(false);
  const [tabAtiva, setTabAtiva] = useState<"visita" | "contrato">("visita");
  const [formNovoLead, setFormNovoLead] = useState(FORM_NOVO_LEAD_INICIAL);
  const [isSubmitting, setIsSubmitting] = useState(false); 

  const [meusLeads, setMeusLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);

  const carregarMeusLeads = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const idReal = session?.user?.id || vendedorId;
      if (!idReal) return;
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("vendedor_id", idReal)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMeusLeads(data || []);
    } catch (error) {
      console.error("Erro ao buscar leads:", error);
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => { carregarMeusLeads(); }, [vendedorId]);

  const recorrenciaMensal = clientesAtivos.length * 25;
  const totalLeads = meusLeads.length; 
  const taxaConversao = totalLeads > 0 ? ((clientesAtivos.length / totalLeads) * 100).toFixed(0) : 0;

  const handleRegistrarVisita = async () => {
    if (!formNovoLead.nome) return toast.error("O nome da barbearia é obrigatório.");
    if (tabAtiva === "contrato" && (!formNovoLead.email || !formNovoLead.senha)) {
      return toast.error("E-mail e senha são obrigatórios para fechar contrato.");
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const idReal = session?.user?.id || vendedorId;

      if (!idReal) {
        toast.error("Erro de autenticação. Faça login novamente.");
        setIsSubmitting(false); return;
      }

      // 🚀 AS 3 CORES VÃO PARA O BANCO DE DADOS AQUI
      const payload = {
        nome_barbearia: formNovoLead.nome,
        bairro: formNovoLead.bairro,
        status: tabAtiva === "visita" ? "visita" : "pendente",
        vendedor_id: idReal,
        dados_adicionais: tabAtiva === "contrato" ? {
          email_dono: formNovoLead.email,
          senha_temp: formNovoLead.senha,
          telefone: formNovoLead.telefone,
          cor_primaria: formNovoLead.cor_primaria,
          cor_secundaria: formNovoLead.cor_secundaria,
          cor_destaque: formNovoLead.cor_destaque
        } : {}
      };

      const { error } = await supabase.from("leads").insert([payload]);
      if (error) throw error;

      toast.success(tabAtiva === "visita" ? "Visita registrada na sua rota!" : "Contrato enviado para aprovação do CEO!");
      
      // DISPARA O WHATSAPP SE FOR CONTRATO
      if (tabAtiva === "contrato") {
        // ⚠️ LEMBRE-SE DE COLOCAR SEU NÚMERO AQUI
        const numeroCEO = "5517992051576"; 
        const mensagem = `Fala César! 🚀\n\nAcabei de fechar com uma barbearia nova:\n💈 *${formNovoLead.nome}*\n📍 Bairro: ${formNovoLead.bairro || "Não informado"}\n📱 WhatsApp: ${formNovoLead.telefone || "Não informado"}\n\nJá subi o contrato e a paleta de cores no sistema, pode aprovar lá! 🔥`;
        window.open(`https://api.whatsapp.com/send?phone=${numeroCEO}&text=${encodeURIComponent(mensagem)}`, "_blank");
      }

      setModalCadastroAberto(false);
      setFormNovoLead(FORM_NOVO_LEAD_INICIAL);
      carregarMeusLeads();

    } catch (error) {
      toast.error("Falha ao registrar visita. Verifique sua conexão.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const leadsFiltrados = meusLeads.filter(lead => 
    lead.nome_barbearia.toLowerCase().includes(busca.toLowerCase()) || 
    (lead.bairro && lead.bairro.toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <div className="space-y-8 pb-32 w-full max-w-full overflow-x-hidden p-4 bg-black min-h-screen relative">
      <header className="flex flex-col gap-1 pt-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
          <span className="text-[10px] uppercase font-black text-primary tracking-[0.2em]">Partner Dashboard</span>
        </div>
        <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">Olá, {vendedorNome.split(" ")[0]}</h1>
        <p className="text-zinc-500 text-xs font-bold uppercase">Sua performance na CAJ TECH hoje</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-5 bg-zinc-900/50 border-zinc-800 backdrop-blur-md">
          <p className="text-[9px] uppercase font-black text-zinc-500 mb-1">Recorrência</p>
          <p className="text-2xl font-black text-primary italic">{formatarMoeda(recorrenciaMensal)}</p>
        </Card>
        <Card className="p-5 bg-zinc-900/50 border-zinc-800 backdrop-blur-md">
          <p className="text-[9px] uppercase font-black text-zinc-500 mb-1">Fechamento</p>
          <p className="text-2xl font-black text-white italic">{taxaConversao}%</p>
        </Card>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-zinc-600" />
          <input placeholder="Buscar barbearia..." className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 pl-10 text-sm text-white outline-none focus:border-primary transition-colors" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Button onClick={() => { setTabAtiva("visita"); setModalCadastroAberto(true); }} className="bg-zinc-800 text-white font-black h-12 w-12 rounded-xl active:scale-95 transition-transform">
          <MapPin className="h-5 w-5" />
        </Button>
        <Button onClick={() => { setTabAtiva("contrato"); setModalCadastroAberto(true); }} className="bg-primary text-black font-black h-12 w-12 rounded-xl active:scale-95 transition-transform shadow-lg shadow-primary/20">
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-black text-white uppercase text-sm italic text-blue-400">Meu Funil (Prospecções)</h3>
          <span className="text-[10px] font-black text-zinc-500 bg-zinc-900 px-2 py-1 rounded-full">{leadsFiltrados.length}</span>
        </div>
        
        <div className="grid gap-3">
          {loadingLeads ? (
            <div className="text-zinc-600 text-[10px] uppercase font-bold text-center py-4 italic animate-pulse">Carregando radar de clientes...</div>
          ) : leadsFiltrados.length === 0 ? (
            <p className="text-zinc-600 text-[10px] uppercase font-bold text-center py-4 italic bg-zinc-900/30 rounded-2xl border border-zinc-800/50 border-dashed">Nenhuma prospecção encontrada.</p>
          ) : (
            leadsFiltrados.map((lead) => (
              <div key={lead.id} className="bg-zinc-900/40 border border-zinc-800 backdrop-blur-md rounded-2xl p-4 flex justify-between items-center hover:border-primary/30 transition-colors">
                <div>
                  <h4 className="font-bold text-white text-sm uppercase italic">{lead.nome_barbearia}</h4>
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3 text-zinc-500" />
                    <span className="text-[9px] text-zinc-400 font-bold uppercase">{lead.bairro || 'Sem Localização'}</span>
                  </div>
                </div>
                <div>
                  {lead.status === 'visita' ? (
                    <span className="px-2 py-1 rounded-full bg-zinc-800/50 text-zinc-400 text-[9px] font-black uppercase flex items-center gap-1 border border-zinc-700">Visita</span>
                  ) : lead.status === 'pendente' ? (
                    <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-500 text-[9px] font-black uppercase flex items-center gap-1 border border-blue-500/20"><Clock className="h-3 w-3" /> Em Aprovação</span>
                  ) : (
                    <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase flex items-center gap-1 border border-primary/20"><CheckCircle className="h-3 w-3" /> Convertido</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* MODAL INTELIGENTE (VISITA OU CONTRATO) */}
      {modalCadastroAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm transition-all">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-3xl p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center">
              <h2 className="text-white font-black uppercase italic text-xl">
                {tabAtiva === 'visita' ? 'Registrar Visita' : 'Fechar Contrato'}
              </h2>
              <button onClick={() => setModalCadastroAberto(false)} className="text-zinc-500"><X /></button>
            </div>

            <div className="space-y-4">
              <Input className="bg-black border-zinc-800 text-white h-12 rounded-xl" placeholder="Nome da Barbearia" value={formNovoLead.nome} onChange={e => setFormNovoLead({ ...formNovoLead, nome: e.target.value })} />
              <Input className="bg-black border-zinc-800 text-white h-12 rounded-xl" placeholder="Bairro / Localização" value={formNovoLead.bairro} onChange={e => setFormNovoLead({ ...formNovoLead, bairro: e.target.value })} />
              
              {tabAtiva === "contrato" && (
                <div className="space-y-4 pt-4 border-t border-zinc-800/50">
                  <p className="text-[10px] font-black text-primary uppercase italic">Dados de Acesso do Cliente</p>
                  <Input type="email" className="bg-black border-zinc-800 text-white h-12 rounded-xl" placeholder="E-mail do Proprietário" value={formNovoLead.email} onChange={e => setFormNovoLead({ ...formNovoLead, email: e.target.value })} />
                  <Input className="bg-black border-zinc-800 text-white h-12 rounded-xl" placeholder="Senha Temporária (Min 6 dig.)" value={formNovoLead.senha} onChange={e => setFormNovoLead({ ...formNovoLead, senha: e.target.value })} />
                  <Input className="bg-black border-zinc-800 text-white h-12 rounded-xl" placeholder="WhatsApp" value={formNovoLead.telefone} onChange={e => setFormNovoLead({ ...formNovoLead, telefone: e.target.value })} />
                  
                  {/* 🚀 AS 3 CORES AQUI */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col items-center justify-center bg-black border border-zinc-800 p-2 rounded-xl">
                      <span className="text-[9px] text-zinc-400 font-bold uppercase mb-1">Destaque</span>
                      <input type="color" value={formNovoLead.cor_primaria} onChange={e => setFormNovoLead({ ...formNovoLead, cor_primaria: e.target.value })} className="h-6 w-full cursor-pointer bg-transparent border-none outline-none" />
                    </div>
                    <div className="flex flex-col items-center justify-center bg-black border border-zinc-800 p-2 rounded-xl">
                      <span className="text-[9px] text-zinc-400 font-bold uppercase mb-1">Fundo</span>
                      <input type="color" value={formNovoLead.cor_secundaria} onChange={e => setFormNovoLead({ ...formNovoLead, cor_secundaria: e.target.value })} className="h-6 w-full cursor-pointer bg-transparent border-none outline-none" />
                    </div>
                    <div className="flex flex-col items-center justify-center bg-black border border-zinc-800 p-2 rounded-xl">
                      <span className="text-[9px] text-zinc-400 font-bold uppercase mb-1">Textos</span>
                      <input type="color" value={formNovoLead.cor_destaque} onChange={e => setFormNovoLead({ ...formNovoLead, cor_destaque: e.target.value })} className="h-6 w-full cursor-pointer bg-transparent border-none outline-none" />
                    </div>
                  </div>

                </div>
              )}
            </div>

            <Button onClick={handleRegistrarVisita} disabled={isSubmitting} className="w-full bg-primary text-black font-black h-14 rounded-2xl text-lg uppercase italic shadow-lg shadow-primary/20">
              {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : tabAtiva === 'visita' ? "Salvar Visita" : "Enviar para o CEO"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}