import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Calendar, Clock, User, Scissors } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

// Interface ajustada para refletir o retorno real do Supabase
interface AgendamentoCheckinRaw {
  id: string;
  nome_cliente: string;
  data: string;
  horario: string;
  status: string;
  barbeiro: { id: string; nome: string } | { id: string; nome: string }[] | null;
  servico: { id: string; nome: string; preco: number; duracao_minutos: number } | { id: string; nome: string; preco: number; duracao_minutos: number }[] | null;
  barbearia: { nome: string; slug: string; cor_primaria: string } | { nome: string; slug: string; cor_primaria: string }[] | null;
}

interface AgendamentoCheckin {
  id: string;
  nome_cliente: string;
  data: string;
  horario: string;
  status: string;
  barbeiro: { id: string; nome: string } | null;
  servico: { id: string; nome: string; preco: number; duracao_minutos: number } | null;
  barbearia: { nome: string; slug: string; cor_primaria: string } | null;
}

export default function Checkin() {
  const { slug, ticket } = useParams<{ slug: string; ticket: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [agendamento, setAgendamento] = useState<AgendamentoCheckin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate(`/auth?redirect=/checkin/${slug}/${ticket}`);
      return;
    }

    async function verificarTicket() {
      try {
        const { data, error } = await supabase
          .from("agendamentos")
          .select(`
            id, nome_cliente, data, horario, status,
            barbeiro:barbeiros(id, nome),
            servico:servicos(id, nome, preco, duracao_minutos),
            barbearia:barbearias(nome, slug, cor_primaria)
          `)
          .eq("ticket_codigo", ticket)
          .eq("barbearia_slug", slug)
          .single();

        if (error || !data) {
          setError("Ticket inválido ou agendamento não encontrado.");
          setLoading(false);
          return;
        }

        // Verifica se o status ainda é Pendente
        if (data.status !== "Pendente") {
          setError(`Este agendamento já foi ${data.status.toLowerCase()}.`);
          setLoading(false);
          return;
        }

        // Normaliza os dados para a interface AgendamentoCheckin
        const raw = data as AgendamentoCheckinRaw;
        const agendamentoNormalizado: AgendamentoCheckin = {
          id: raw.id,
          nome_cliente: raw.nome_cliente,
          data: raw.data,
          horario: raw.horario,
          status: raw.status,
          barbeiro: Array.isArray(raw.barbeiro) ? raw.barbeiro[0] || null : raw.barbeiro,
          servico: Array.isArray(raw.servico) ? raw.servico[0] || null : raw.servico,
          barbearia: Array.isArray(raw.barbearia) ? raw.barbearia[0] || null : raw.barbearia,
        };

        setAgendamento(agendamentoNormalizado);
      } catch (err) {
        console.error(err);
        setError("Erro ao verificar o ticket. Tente novamente.");
      } finally {
        setLoading(false);
      }
    }

    verificarTicket();
  }, [slug, ticket, user, navigate]);

  const handleConfirmarCheckin = async () => {
    if (!agendamento || !user) return;

    setIsSubmitting(true);
    try {
      const servico = agendamento.servico;
      const barbeiro = agendamento.barbeiro;
      let comissaoGanha = 0;

      if (servico && barbeiro) {
        const { data: barbeiroData } = await supabase
          .from("barbeiros")
          .select("comissao_pct")
          .eq("id", barbeiro.id)
          .single();
        const comissaoPct = barbeiroData?.comissao_pct || 0;
        comissaoGanha = (servico.preco * comissaoPct) / 100;
      }

      const { error } = await supabase
        .from("agendamentos")
        .update({ status: "Finalizado", comissao_ganha: comissaoGanha })
        .eq("ticket_codigo", ticket);

      if (error) throw error;

      setSuccess(true);
      toast.success("Check-in realizado com sucesso! 🎉");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao confirmar check-in. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  const brand = agendamento?.barbearia?.cor_primaria || "#D4AF37";

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="bg-zinc-900 border-zinc-800 text-white p-6 rounded-3xl shadow-2xl">
          {loading ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="h-10 w-10 animate-spin text-white/40" />
              <p className="text-sm uppercase tracking-widest text-zinc-500">Verificando ticket...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tighter text-white">Ops!</h2>
              <p className="text-center text-zinc-400 text-sm">{error}</p>
              <Button
                className="mt-4 bg-zinc-800 hover:bg-zinc-700 text-white"
                onClick={() => navigate("/")}
              >
                Voltar ao início
              </Button>
            </div>
          ) : success ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tighter text-white">Check-in Confirmado!</h2>
              <p className="text-center text-zinc-400 text-sm">
                O cliente {agendamento?.nome_cliente} foi registrado.
              </p>
              <Button
                className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white"
                onClick={() => navigate("/")}
              >
                Ir para Agenda
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter" style={{ color: brand }}>
                  {agendamento?.barbearia?.nome}
                </h2>
                <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mt-1">Check-in de Cliente</p>
              </div>

              <div className="space-y-4">
                <div className="bg-black/40 p-5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3 mb-3">
                    <User className="h-5 w-5 text-white/40" />
                    <span className="text-lg font-bold text-white">{agendamento?.nome_cliente}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {agendamento?.data.split("-").reverse().join("/")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">{agendamento?.horario}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-black/40 p-5 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex items-center gap-3">
                    <Scissors className="h-5 w-5 text-white/40" />
                    <div>
                      <p className="text-sm font-bold text-white">{agendamento?.servico?.nome}</p>
                      <p className="text-xs text-zinc-500">
                        R$ {agendamento?.servico?.preco.toFixed(2)} • {agendamento?.servico?.duracao_minutos} min
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                    <User className="h-5 w-5 text-white/40" />
                    <p className="text-sm text-white">{agendamento?.barbeiro?.nome}</p>
                  </div>
                </div>

                <Button
                  className="w-full h-14 rounded-2xl font-black uppercase text-sm shadow-xl"
                  style={{ backgroundColor: brand, color: "#000" }}
                  onClick={handleConfirmarCheckin}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                  )}
                  Confirmar Check-in
                </Button>

                <Button
                  variant="ghost"
                  className="w-full text-zinc-500 hover:text-white uppercase font-black text-[10px] tracking-widest"
                  onClick={() => navigate("/")}
                >
                  Cancelar
                </Button>
              </div>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  );
}