import { useState } from "react";
import { Search, Plus, X, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client"; // Certifique-se de que o caminho do seu supabase está correto
import { toast } from "sonner"; // Assumindo que você usa o sonner do Shadcn para os alertas bonitos

const FORM_NOVO_LEAD_INICIAL = { nome: "", bairro: "" };

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface VisaoVendedorProps {
  vendedorId?: string; // Adicionamos o ID para rastrear quem fez a venda
  vendedorNome?: string;
  clientesAtivos?: unknown[];
  prospectos?: unknown[];
}

export function VisaoVendedor({
  vendedorId,
  vendedorNome = "Consultor CAJ",
  clientesAtivos = [],
  prospectos = [],
}: VisaoVendedorProps) {
  const [busca, setBusca] = useState("");
  const [modalCadastroAberto, setModalCadastroAberto] = useState(false);
  const [formNovoLead, setFormNovoLead] = useState(FORM_NOVO_LEAD_INICIAL);
  const [isSubmitting, setIsSubmitting] = useState(false); // Estado para o loading do botão

  const recorrenciaMensal = clientesAtivos.length * 25;
  const totalLeads = prospectos.length;
  const taxaConversao =
    totalLeads > 0 ? ((clientesAtivos.length / totalLeads) * 100).toFixed(0) : 0;

  const handleRegistrarVisita = async () => {
    if (!formNovoLead.nome) {
      toast.error("O nome da barbearia é obrigatório.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Inserção no banco de dados (Tabela leads)
      const { data, error } = await supabase
        .from("leads")
        .insert([
          {
            nome_barbearia: formNovoLead.nome,
            bairro: formNovoLead.bairro,
            status: "pendente",
            vendedor_id: vendedorId, // Pega o ID de quem está logado
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // 2. Simulação de Webhook (Aviso para o CEO)
      // Aqui no futuro você coloca um fetch() para o N8N, Make ou API do WhatsApp
      console.log(`🚀 [WEBHOOK] Avisando o César (CEO): Novo lead ${formNovoLead.nome} cadastrado pelo vendedor ${vendedorNome}!`);

      // 3. Feedback visual padrão Apple
      toast.success("Visita registrada! O CEO já foi notificado.");
      setModalCadastroAberto(false);
      setFormNovoLead(FORM_NOVO_LEAD_INICIAL);

    } catch (error) {
      console.error("Erro ao salvar lead:", error);
      toast.error("Falha ao registrar visita. Verifique sua conexão.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-32 w-full max-w-full overflow-x-hidden p-4 bg-black min-h-screen relative">
      <header className="flex flex-col gap-1 pt-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
          <span className="text-[10px] uppercase font-black text-primary tracking-[0.2em]">
            Partner Dashboard
          </span>
        </div>
        <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
          Olá, {vendedorNome.split(" ")[0]}
        </h1>
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
          <input
            placeholder="Buscar barbearia..."
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 pl-10 text-sm text-white outline-none focus:border-primary transition-colors"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Button
          onClick={() => setModalCadastroAberto(true)}
          className="bg-primary text-black font-black h-12 w-12 rounded-xl active:scale-95 transition-transform"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      <section className="space-y-4">
        <h3 className="font-black text-white uppercase text-sm italic px-1">Clientes Ativos</h3>
        <div className="grid gap-3">
          {clientesAtivos.length === 0 && (
            <p className="text-zinc-600 text-[10px] uppercase font-bold text-center py-4 italic">
              Nenhum cliente ativo ainda.
            </p>
          )}
        </div>
      </section>

      {modalCadastroAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm transition-all">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-3xl p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-white font-black uppercase italic text-xl">Novo Lead</h2>
              <button type="button" onClick={() => setModalCadastroAberto(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Nome da Barbearia</label>
                <Input
                  className="bg-black border-zinc-800 text-white h-12 rounded-xl focus:border-primary transition-colors"
                  placeholder="Ex: Barbearia do Jotta"
                  value={formNovoLead.nome}
                  onChange={(e) => setFormNovoLead({ ...formNovoLead, nome: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Bairro / Localização</label>
                <Input
                  className="bg-black border-zinc-800 text-white h-12 rounded-xl focus:border-primary transition-colors"
                  placeholder="Ex: Redentora"
                  value={formNovoLead.bairro}
                  onChange={(e) => setFormNovoLead({ ...formNovoLead, bairro: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <Button
              onClick={handleRegistrarVisita}
              disabled={isSubmitting}
              className="w-full bg-primary text-black font-black h-14 rounded-2xl text-lg uppercase italic shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                "Registrar Visita"
              )}
            </Button>
          </div>
        </div>
      )}

      <div className="p-6 text-center">
        <p className="text-zinc-700 text-[9px] font-black uppercase tracking-[0.3em]">
          CAJ TECH SOFTWARE SOLUTIONS © 2026
        </p>
      </div>
    </div>
  );
}