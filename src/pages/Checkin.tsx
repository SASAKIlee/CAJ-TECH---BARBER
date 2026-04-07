import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2, Loader2, UserCircle2, Clock, Calendar, Scissors, AlertTriangle } from "lucide-react";

export default function Checkin() {
  const { slug, ticket } = useParams();
  const [loading, setLoading] = useState(true);
  const [confirmando, setConfirmando] = useState(false);
  const [agendamento, setAgendamento] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function buscarAgendamento() {
      try {
        // Busca a barbearia
        const { data: barbearia } = await supabase
          .from("barbearias")
          .select("id, nome, cor_primaria")
          .eq("slug", slug)
          .single();

        if (!barbearia) throw new Error("Barbearia não encontrada.");

        // Como o ticket gerado na página pública é aleatório, na vida real 
        // precisaríamos salvar ele no banco. Para o teste agora, vamos buscar
        // o último agendamento Pendente dessa barbearia (simulando a leitura).
        const { data: agendamentoEncontrado, error: erroAgendamento } = await supabase
          .from("agendamentos")
          .select(`*, servicos (nome, preco), barbeiros (nome)`)
          .eq("barbearia_slug", slug)
          .eq("status", "Pendente")
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (erroAgendamento || !agendamentoEncontrado) {
          throw new Error("Agendamento não encontrado ou já baixado.");
        }

        setAgendamento({ ...agendamentoEncontrado, barbearia });
      } catch (err: any) {
        setErro(err.message);
      } finally {
        setLoading(false);
      }
    }

    buscarAgendamento();
  }, [slug, ticket]);

  const handleConfirmarCheckin = async () => {
    setConfirmando(true);
    try {
      // Muda o status para Concluído no banco de dados
      const { error } = await supabase
        .from("agendamentos")
        .update({ status: "Concluído" })
        .eq("id", agendamento.id);

      if (error) throw error;

      toast.success("✅ Check-in realizado com sucesso!");
      
      // Atualiza a tela para mostrar o sucesso
      setAgendamento((prev: any) => ({ ...prev, status: "Concluído" }));
    } catch (error) {
      toast.error("Erro ao confirmar check-in.");
    } finally {
      setConfirmando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#18181B] flex flex-col items-center justify-center p-6">
        <Loader2 className="h-10 w-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Buscando ticket...</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen bg-[#18181B] flex flex-col items-center justify-center p-6 text-center">
        <div className="h-20 w-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-white uppercase italic mb-2">Ticket Inválido</h2>
        <p className="text-zinc-400 text-sm mb-8">{erro}</p>
      </div>
    );
  }

  const brand = agendamento.barbearia?.cor_primaria || "#D4AF37";

  return (
    <div className="min-h-screen bg-[#18181B] flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-sm bg-zinc-900 border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl relative">
        {/* Barra superior de cor da barbearia */}
        <div className="h-2 w-full" style={{ backgroundColor: brand }} />

        <div className="p-6 text-center border-b border-zinc-800/50">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">Painel do Profissional</p>
          <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase">{agendamento.barbearia?.nome}</h1>
        </div>

        <div className="p-6 space-y-6">
          {/* Ficha do Cliente */}
          <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-zinc-800/50">
            <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center">
              <UserCircle2 className="h-8 w-8 text-zinc-500" />
            </div>
            <div className="text-left">
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Cliente</p>
              <p className="text-lg font-black text-white uppercase tracking-tight">{agendamento.nome_cliente}</p>
            </div>
          </div>

          {/* Dados do Corte */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/20 p-3 rounded-2xl border border-zinc-800/50">
              <Calendar className="h-4 w-4 text-zinc-500 mb-2" />
              <p className="text-white font-bold text-sm">{agendamento.data.split('-').reverse().join('/')}</p>
            </div>
            <div className="bg-black/20 p-3 rounded-2xl border border-zinc-800/50">
              <Clock className="h-4 w-4 text-zinc-500 mb-2" />
              <p className="text-white font-bold text-sm">{agendamento.horario}</p>
            </div>
          </div>

          <div className="bg-black/20 p-4 rounded-2xl border border-zinc-800/50 flex items-center gap-3">
             <Scissors className="h-5 w-5 text-zinc-500" />
             <div>
               <p className="text-sm font-bold text-white uppercase">{agendamento.servicos?.nome || "Serviço"}</p>
               <p className="text-xs text-zinc-400">com {agendamento.barbeiros?.nome || "Profissional"}</p>
             </div>
          </div>

          {/* AÇÃO */}
          {agendamento.status === "Concluído" ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl text-center flex flex-col items-center gap-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              <p className="text-emerald-500 font-black uppercase tracking-widest text-sm">Check-in Confirmado!</p>
            </div>
          ) : (
            <Button 
              onClick={handleConfirmarCheckin} 
              disabled={confirmando}
              className="w-full h-16 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wide text-lg rounded-2xl shadow-xl shadow-emerald-600/20"
            >
              {confirmando ? <Loader2 className="animate-spin h-6 w-6" /> : "Dar Baixa no Sistema"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}