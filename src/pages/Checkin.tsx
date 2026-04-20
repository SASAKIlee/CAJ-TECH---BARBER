import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Calendar, Clock, User, Scissors, MapPin } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { contrastTextOnBrand } from "@/lib/branding";

interface AgendamentoCheckinRaw {
  id: string;
  nome_cliente: string;
  data: string;
  horario: string;
  status: string;
  ticket_codigo: string;
  barbeiro: { id: string; nome: string } | { id: string; nome: string }[] | null;
  servico: { id: string; nome: string; preco: number; duracao_minutos: number } | { id: string; nome: string; preco: number; duracao_minutos: number }[] | null;
  barbearia: { nome: string; slug: string; cor_primaria: string; checkin_habilitado: boolean } | { nome: string; slug: string; cor_primaria: string; checkin_habilitado: boolean }[] | null;
}

interface AgendamentoCheckin {
  id: string;
  nome_cliente: string;
  data: string;
  horario: string;
  status: string;
  ticket_codigo: string;
  barbeiro: { id: string; nome: string } | null;
  servico: { id: string; nome: string; preco: number; duracao_minutos: number } | null;
  barbearia: { nome: string; slug: string; cor_primaria: string; checkin_habilitado: boolean } | null;
}

export default function Checkin() {
  const { slug, ticket } = useParams<{ slug: string; ticket: string }>();
  const navigate = useNavigate();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [loading, setLoading] = useState(true);
  const [agendamento, setAgendamento] = useState<AgendamentoCheckin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pin, setPin] = useState("");

  // Gera PIN de 4 dígitos a partir do ticket_codigo (determinístico)
  const gerarPin = (codigo: string) => {
    let hash = 0;
    for (let i = 0; i < codigo.length; i++) {
      hash = (hash << 5) - hash + codigo.charCodeAt(i);
      hash |= 0;
    }
    return String(Math.abs(hash) % 10000).padStart(4, '0');
  };

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    async function verificarTicket() {
      try {
        // 1. Verifica se a barbearia tem check-in habilitado
        const { data: barbeariaData, error: barbeariaError } = await supabase
          .from("barbearias")
          .select("checkin_habilitado")
          .eq("slug", slug)
          .abortSignal(controller.signal)
          .single();

        if (controller.signal.aborted) return;

        if (barbeariaError || !barbeariaData) {
          setError("Barbearia não encontrada.");
          setLoading(false);
          return;
        }

        if (!barbeariaData.checkin_habilitado) {
          setError("O check-in digital não está disponível para esta barbearia.");
          setLoading(false);
          return;
        }

        // 2. Busca o agendamento
        const { data, error } = await supabase
          .from("agendamentos")
          .select(`
            id, nome_cliente, data, horario, status, ticket_codigo,
            barbeiro:barbeiros(id, nome),
            servico:servicos(id, nome, preco, duracao_minutos),
            barbearia:barbearias(nome, slug, cor_primaria, checkin_habilitado)
          `)
          .eq("ticket_codigo", ticket)
          .eq("barbearia_slug", slug)
          .abortSignal(controller.signal)
          .single();

        if (controller.signal.aborted) return;

        if (error || !data) {
          setError("Ticket inválido ou agendamento não encontrado.");
          setLoading(false);
          return;
        }

        if (data.status === "Cancelado") {
          setError("Este agendamento foi cancelado.");
          setLoading(false);
          return;
        }

        if (data.status === "Finalizado" || data.status === "Check-in") {
          setError("Check-in já realizado anteriormente.");
          setLoading(false);
          return;
        }

        // Normaliza os dados (Supabase pode retornar array devido a relações)
        const raw = data as AgendamentoCheckinRaw;
        const agendamentoNormalizado: AgendamentoCheckin = {
          id: raw.id,
          nome_cliente: raw.nome_cliente,
          data: raw.data,
          horario: raw.horario,
          status: raw.status,
          ticket_codigo: raw.ticket_codigo,
          barbeiro: Array.isArray(raw.barbeiro) ? raw.barbeiro[0] || null : raw.barbeiro,
          servico: Array.isArray(raw.servico) ? raw.servico[0] || null : raw.servico,
          barbearia: Array.isArray(raw.barbearia) ? raw.barbearia[0] || null : raw.barbearia,
        };

        setAgendamento(agendamentoNormalizado);
        setPin(gerarPin(agendamentoNormalizado.ticket_codigo));
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error(err);
        setError("Erro ao verificar o ticket. Tente novamente.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    verificarTicket();

    return () => {
      controller.abort();
      abortControllerRef.current = null;
    };
  }, [slug, ticket]);

  const handleConfirmarCheckin = async () => {
    if (!agendamento || isSubmitting) return;

    setIsSubmitting(true);
    const toastId = toast.loading("Confirmando check-in...");

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
        .update({ status: "Check-in", comissao_ganha: comissaoGanha })
        .eq("id", agendamento.id)
        .eq("ticket_codigo", ticket)
        .eq("barbearia_slug", slug ?? "");

      if (error) throw error;

      toast.dismiss(toastId);
      setSuccess(true);
      toast.success("Check-in realizado! Aguarde seu atendimento.");
    } catch (err) {
      toast.dismiss(toastId);
      console.error(err);
      toast.error("Erro ao confirmar check-in. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const brand = agendamento?.barbearia?.cor_primaria || "#D4AF37";
  const buttonTextColor = contrastTextOnBrand(brand);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-white/40" />
          <p className="text-sm uppercase tracking-widest text-zinc-500">Verificando ticket...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Card className="bg-zinc-900 border-zinc-800 text-white p-6 rounded-3xl shadow-2xl">
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tighter text-white">Ops!</h2>
              <p className="text-center text-zinc-400 text-sm">{error}</p>
              <Button
                className="mt-4 bg-zinc-800 hover:bg-zinc-700 text-white"
                onClick={() => navigate("/")}
                aria-label="Voltar ao início"
              >
                Voltar ao início
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <Card className="bg-zinc-900 border-zinc-800 text-white p-6 rounded-3xl shadow-2xl">
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tighter text-white">Check-in Confirmado!</h2>
              <p className="text-center text-zinc-400 text-sm">
                {agendamento?.nome_cliente}, você está na fila de atendimento.
              </p>
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5 w-full mt-2">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Seu PIN de check-in</p>
                <p className="text-4xl font-black tabular-nums tracking-widest" style={{ color: brand }}>
                  {pin}
                </p>
                <p className="text-[10px] text-zinc-500 mt-2">Mostre este código ao barbeiro se solicitado.</p>
              </div>
              <Button
                className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white"
                onClick={() => navigate("/")}
                aria-label="Fechar e voltar ao início"
              >
                Fechar
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <Card className="bg-zinc-900 border-zinc-800 text-white p-6 rounded-3xl shadow-2xl">
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

            <div className="bg-black/40 p-5 rounded-2xl border border-white/5 text-center">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Seu PIN de check-in</p>
              <p className="text-4xl font-black tabular-nums tracking-widest" style={{ color: brand }}>
                {pin}
              </p>
              <p className="text-[10px] text-zinc-500 mt-2">Mostre este código ao chegar na barbearia.</p>
            </div>

            <Button
              className="w-full h-14 rounded-2xl font-black uppercase text-sm shadow-xl transition-transform active:scale-[0.98]"
              style={{ backgroundColor: brand, color: buttonTextColor }}
              onClick={handleConfirmarCheckin}
              disabled={isSubmitting}
              aria-label="Confirmar chegada"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <MapPin className="h-5 w-5 mr-2" />
              )}
              Confirmar Chegada
            </Button>

            <Button
              variant="ghost"
              className="w-full text-zinc-500 hover:text-white uppercase font-black text-[10px] tracking-widest"
              onClick={() => navigate("/")}
              aria-label="Cancelar e voltar"
            >
              Cancelar
            </Button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}