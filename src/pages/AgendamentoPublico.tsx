import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  X,
  User,
  CheckCircle2,
  Scissors,
  AlertTriangle,
  Clock,
  CalendarX2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { hexToRgba, contrastTextOnBrand } from "@/lib/branding";
import { WalletTicket, WALLET_TICKET_CAPTURE_ID } from "@/components/agendamento-publico/WalletTicket";
import { AppHeroBackdrop, APP_HERO_FALLBACK_BG } from "@/components/AppHeroBackdrop";

// ==========================================
// TIPAGENS
// ==========================================
interface BarbeariaRow {
  id: string;
  nome: string;
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
  cor_destaque?: string | null;
  url_fundo?: string | null;
  url_logo?: string | null;
  horario_abertura?: string | null;
  horario_fechamento?: string | null;
  dias_trabalho?: number[] | null;
  inicio_almoco?: string | null;
  fim_almoco?: string | null;
  datas_fechadas?: string[] | null;
  ativo?: boolean | null;
  data_vencimento?: string | null;
  checkin_habilitado?: boolean | null;
}

interface Barbeiro {
  id: string;
  nome: string;
  url_foto?: string | null;
  ativo?: boolean;
}

interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao_minutos: number;
  url_imagem?: string | null;
}

interface AgendamentoExistente {
  horario: string;
  servico_id: string;
}

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================
const DIAS_SEMANA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatarDataYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatarDataVisual(ymd: string): string {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

function gerarProximosDias(quantidade = 30) {
  const dias = [];
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  for (let i = 0; i < quantidade; i++) {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() + i);
    dias.push({
      dateObj: d,
      ymd: formatarDataYMD(d),
      diaSemana: DIAS_SEMANA_CURTO[d.getDay()],
      diaMes: String(d.getDate()).padStart(2, '0'),
      mes: MESES_CURTO[d.getMonth()],
    });
  }
  return dias;
}

function gerarHorarios(
  abertura = "09:00",
  fechamento = "18:00",
  inicioAlmoco = "12:00",
  fimAlmoco = "13:00"
): string[] {
  const horarios: string[] = [];
  let [hora, minuto] = abertura.split(":").map(Number);
  const [horaFim, minutoFim] = fechamento.split(":").map(Number);
  const [horaInicioAlmoco, minInicioAlmoco] = inicioAlmoco.split(":").map(Number);
  const [horaFimAlmoco, minFimAlmoco] = fimAlmoco.split(":").map(Number);

  while (hora < horaFim || (hora === horaFim && minuto < minutoFim)) {
    const isAlmoco =
      (hora > horaInicioAlmoco || (hora === horaInicioAlmoco && minuto >= minInicioAlmoco)) &&
      (hora < horaFimAlmoco || (hora === horaFimAlmoco && minuto < minFimAlmoco));

    if (!isAlmoco) {
      horarios.push(`${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`);
    }

    minuto += 30;
    if (minuto >= 60) {
      minuto = 0;
      hora += 1;
    }
  }
  return horarios;
}

function aplicarMascaraZap(v: string): string {
  const digits = v.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function validarWhatsApp(valor: string): boolean {
  const digits = valor.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 11;
}

function validarNome(nome: string): boolean {
  return nome.trim().length >= 3 && /^[A-Za-zÀ-ÿ\s]+$/.test(nome.trim());
}

function verificarDisponibilidadeHorario(
  horarioInicio: string,
  duracaoMinutos: number,
  ocupados: string[],
  horariosDisponiveis: string[]
): boolean {
  const blocosNecessarios = Math.ceil(duracaoMinutos / 30);
  const indiceInicio = horariosDisponiveis.indexOf(horarioInicio);
  if (indiceInicio === -1) return false;

  for (let i = 0; i < blocosNecessarios; i++) {
    const indiceBloco = indiceInicio + i;
    if (indiceBloco >= horariosDisponiveis.length) return false;
    if (ocupados.includes(horariosDisponiveis[indiceBloco])) return false;
  }
  return true;
}

const listContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const listItem = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function AgendamentoPublico() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const abortControllerRef = useRef<AbortController | null>(null);

  const [etapa, setEtapa] = useState(1);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<BarbeariaRow | null>(null);
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [ocupados, setOcupados] = useState<string[]>([]);
  const [ticketCodigo, setTicketCodigo] = useState("");
  const [isBarbeariaAtiva, setIsBarbeariaAtiva] = useState(true);
  const [barbeariaNaoEncontrada, setBarbeariaNaoEncontrada] = useState(false);

  const [selecao, setSelecao] = useState({
    servico: null as Servico | null,
    barbeiro: null as Barbeiro | null,
    data: "",
    horario: "",
    nome: "",
    whatsapp: "",
  });

  const brand = config?.cor_primaria?.trim() || "#D4AF37";
  const bg = config?.cor_secundaria?.trim() || "#18181B";
  const textHighlight = config?.cor_destaque?.trim() || "#FFFFFF";
  const ctaFg = contrastTextOnBrand(brand);

  const horariosDoDia = useMemo(() => {
    return gerarHorarios(
      config?.horario_abertura || "09:00",
      config?.horario_fechamento || "18:00",
      config?.inicio_almoco || "12:00",
      config?.fim_almoco || "13:00"
    );
  }, [config]);

  const diasTrabalho = config?.dias_trabalho || [1, 2, 3, 4, 5, 6];
  const datasFechadas = config?.datas_fechadas || [];
  const hojeYMD = formatarDataYMD(new Date());

  const verificarStatusBarbearia = useCallback((barbearia: BarbeariaRow) => {
    if (barbearia.ativo === false) return false;
    if (barbearia.data_vencimento) {
      const vencimento = new Date(barbearia.data_vencimento);
      if (vencimento < new Date()) return false;
    }
    return true;
  }, []);

  // Carregar dados da barbearia
  useEffect(() => {
    if (!slug) {
      setBarbeariaNaoEncontrada(true);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const carregarDados = async () => {
      try {
        const { data: bInfo, error: barbError } = await supabase
          .from("barbearias")
          .select("*")
          .eq("slug", slug)
          .abortSignal(controller.signal)
          .maybeSingle();

        if (controller.signal.aborted) return;

        if (barbError || !bInfo) {
          setBarbeariaNaoEncontrada(true);
          setLoading(false);
          return;
        }

        const barbearia = bInfo as BarbeariaRow;
        setConfig(barbearia);
        setIsBarbeariaAtiva(verificarStatusBarbearia(barbearia));

        const [{ data: barbs }, { data: servs }] = await Promise.all([
          supabase
            .from("barbeiros")
            .select("*")
            .eq("barbearia_slug", slug)
            .eq("ativo", true)
            .abortSignal(controller.signal),
          supabase
            .from("servicos")
            .select("*")
            .eq("barbearia_slug", slug)
            .abortSignal(controller.signal),
        ]);

        if (!controller.signal.aborted) {
          setBarbeiros(barbs || []);
          setServicos(servs || []);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error(err);
          toast.error("Erro ao carregar dados da barbearia.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    carregarDados();

    return () => {
      controller.abort();
      abortControllerRef.current = null;
    };
  }, [slug, verificarStatusBarbearia]);

  // Carregar horários ocupados
  useEffect(() => {
    if (!selecao.data || !selecao.barbeiro?.id || !slug) {
      setOcupados([]);
      return;
    }

    const controller = new AbortController();

    const carregarOcupados = async () => {
      const { data } = await supabase
        .from("agendamentos")
        .select("horario, servico_id")
        .eq("barbeiro_id", selecao.barbeiro!.id)
        .eq("data", selecao.data)
        .neq("status", "Cancelado")
        .abortSignal(controller.signal);

      if (!data || controller.signal.aborted) return;

      const slots: string[] = [];
      data.forEach((ag: AgendamentoExistente) => {
        const serv = servicos.find((s) => s.id === ag.servico_id);
        const duracao = serv?.duracao_minutos || 30;
        const blocos = Math.ceil(duracao / 30);

        let [h, m] = ag.horario.split(":").map(Number);
        for (let i = 0; i < blocos; i++) {
          slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
          m += 30;
          if (m >= 60) {
            m = 0;
            h += 1;
          }
        }
      });
      setOcupados(slots);
    };

    carregarOcupados();
    return () => controller.abort();
  }, [selecao.data, selecao.barbeiro, slug, servicos]);

  const salvarTicketComoImagem = useCallback(async () => {
    const el = document.getElementById(WALLET_TICKET_CAPTURE_ID);
    if (!el) return toast.error("Ticket não encontrado.");

    const toastId = toast.loading("Gerando imagem...");
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: bg,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `agendamento-${slug || "caj"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Imagem salva! 📸", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar imagem.", { id: toastId });
    }
  }, [slug, bg]);

  const handleFinalizar = async () => {
    if (!validarNome(selecao.nome)) {
      return toast.error("Nome inválido. Use apenas letras e espaços (mín. 3 caracteres).");
    }
    if (!validarWhatsApp(selecao.whatsapp)) {
      return toast.error("WhatsApp inválido. Use DDD + número.");
    }
    if (!selecao.servico || !selecao.barbeiro) {
      return toast.error("Selecione serviço e profissional.");
    }
    if (!selecao.data || !selecao.horario) {
      return toast.error("Selecione data e horário.");
    }

    const generatedTicket = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const idempotencyKey = crypto.randomUUID?.() ?? Date.now().toString();

    const toastId = toast.loading("Confirmando reserva...");

    const { error } = await supabase.from("agendamentos").insert({
      nome_cliente: selecao.nome.trim(),
      telefone_cliente: selecao.whatsapp.replace(/\D/g, ""),
      servico_id: selecao.servico.id,
      barbeiro_id: selecao.barbeiro.id,
      data: selecao.data,
      horario: selecao.horario,
      barbearia_slug: slug!,
      status: "Pendente",
      ticket_codigo: generatedTicket,
      idempotency_key: idempotencyKey,
      observacao: "",
    });

    toast.dismiss(toastId);

    if (error) {
      console.error(error);
      return toast.error("Erro ao confirmar agendamento. Tente novamente.");
    }

    setTicketCodigo(generatedTicket);
    setEtapa(5);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 space-y-4 text-white">
        <Loader2 className="h-10 w-10 animate-spin text-zinc-700" />
        <p className="text-zinc-500 text-sm font-medium">Carregando barbearia...</p>
      </div>
    );
  }

  if (barbeariaNaoEncontrada) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-black uppercase">Barbearia não encontrada</h1>
        <p className="text-zinc-400 mt-2">O link que você acessou não existe.</p>
        <Button className="mt-6" onClick={() => navigate("/")}>Voltar ao início</Button>
      </div>
    );
  }

  if (!isBarbeariaAtiva) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center">
        <Lock className="h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-black uppercase">Acesso Suspenso</h1>
        <p className="text-zinc-400 mt-2 max-w-md">Esta barbearia está temporariamente indisponível para agendamentos online.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] relative isolate font-sans overflow-x-hidden transition-colors duration-500" style={{ backgroundColor: bg }}>
      <AppHeroBackdrop imageUrl={config?.url_fundo || APP_HERO_FALLBACK_BG} />

      <div className="relative z-10 flex min-h-[100dvh] flex-col max-w-lg mx-auto">
        {/* HEADER PREMIUM */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="mx-4 mt-6 mb-2 rounded-[28px] p-6 border shadow-2xl text-center relative overflow-hidden"
          style={{ backgroundColor: hexToRgba(bg, 0.7), borderColor: hexToRgba(textHighlight, 0.08), backdropFilter: "blur(20px)" }}
        >
          <div className="absolute inset-0 opacity-[0.03]" style={{ background: `radial-gradient(circle at 50% 0%, ${brand}, transparent 70%)` }} aria-hidden="true" />

          {config?.url_logo ? (
            <div className="relative mx-auto mb-4 h-20 w-20 rounded-2xl overflow-hidden border-2 shadow-lg" style={{ borderColor: hexToRgba(brand, 0.4) }}>
              <img src={config.url_logo} alt={config.nome} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="relative mx-auto mb-4 h-20 w-20 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: hexToRgba(brand, 0.15) }}>
              <span className="text-4xl font-black" style={{ color: brand }}>{config?.nome?.charAt(0)?.toUpperCase() || "B"}</span>
            </div>
          )}

          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-1 relative" style={{ color: textHighlight }}>
            Agendamento Online
          </p>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic relative" style={{ color: textHighlight }}>
            {config?.nome || "Barbearia"}
          </h1>
        </motion.header>

        <main className="flex-1 px-4 pb-32 pt-2">
          <AnimatePresence mode="wait">
            {etapa < 5 ? (
              <motion.div key={etapa} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="space-y-6">

                {etapa > 1 && (
                  <Button variant="ghost" onClick={() => setEtapa((e) => e - 1)} className="text-zinc-400 gap-2 font-bold uppercase text-[10px] tracking-widest px-0 hover:bg-transparent hover:text-white transition-colors">
                    <ChevronLeft className="h-4 w-4" /> Voltar
                  </Button>
                )}

                {/* Etapa 1: Serviço */}
                {etapa === 1 && (
                  <section className="space-y-4">
                    <h2 className="text-lg font-black uppercase italic tracking-tighter ml-1" style={{ color: textHighlight }}>
                      1. Escolha o Serviço
                    </h2>
                    <motion.div className="space-y-3" initial="hidden" animate="show" variants={listContainer}>
                      {servicos.map((s) => (
                        <motion.button
                          key={s.id}
                          variants={listItem}
                          onClick={() => { setSelecao({ ...selecao, servico: s }); setEtapa(2); }}
                          className="w-full rounded-[24px] border p-4 text-left flex items-center justify-between gap-4 transition-all hover:scale-[1.02] active:scale-[0.98] group"
                          style={{ backgroundColor: hexToRgba(bg, 0.4), borderColor: hexToRgba(textHighlight, 0.05) }}
                        >
                          <div className="flex items-center gap-4">
                            {s.url_imagem ? (
                              <img src={s.url_imagem} className="w-14 h-14 rounded-2xl object-cover border border-white/5" alt={s.nome} />
                            ) : (
                              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-white/10 transition-colors">
                                <Scissors className="opacity-20 h-6 w-6" style={{ color: textHighlight }} />
                              </div>
                            )}
                            <div>
                              <span className="text-base font-bold block" style={{ color: textHighlight }}>{s.nome}</span>
                              <span className="text-[10px] font-black uppercase opacity-50 flex items-center gap-1" style={{ color: brand }}>
                                <Clock className="h-3 w-3" /> {s.duracao_minutos} min
                              </span>
                            </div>
                          </div>
                          <span className="text-lg font-black tabular-nums" style={{ color: brand }}>
                            R$ {s.preco.toFixed(2)}
                          </span>
                        </motion.button>
                      ))}
                    </motion.div>
                  </section>
                )}

                {/* Etapa 2: Barbeiro */}
                {etapa === 2 && (
                  <section className="space-y-4">
                    <h2 className="text-lg font-black uppercase italic tracking-tighter ml-1" style={{ color: textHighlight }}>
                      2. Quem vai te atender?
                    </h2>
                    <motion.div className="space-y-3" initial="hidden" animate="show" variants={listContainer}>
                      {barbeiros.map((b) => (
                        <motion.button
                          key={b.id}
                          variants={listItem}
                          onClick={() => { setSelecao({ ...selecao, barbeiro: b }); setEtapa(3); }}
                          className="w-full flex items-center gap-4 rounded-[24px] border p-4 transition-all hover:scale-[1.02] active:scale-[0.98] group"
                          style={{ backgroundColor: hexToRgba(bg, 0.4), borderColor: hexToRgba(textHighlight, 0.05) }}
                        >
                          <div className="h-14 w-14 rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/5 flex items-center justify-center group-hover:border-white/20 transition-colors">
                            {b.url_foto ? (
                              <img src={b.url_foto} className="h-full w-full object-cover" alt={b.nome} />
                            ) : (
                              <User className="text-zinc-700 h-6 w-6" />
                            )}
                          </div>
                          <span className="text-lg font-bold" style={{ color: textHighlight }}>{b.nome}</span>
                        </motion.button>
                      ))}
                    </motion.div>
                  </section>
                )}

                {/* Etapa 3: Data e Horário */}
                {etapa === 3 && (
                  <section className="space-y-8">
                    <div>
                      <div className="flex justify-between items-end mb-4 px-1">
                        <h2 className="text-lg font-black uppercase italic tracking-tighter" style={{ color: textHighlight }}>
                          3. Quando?
                        </h2>
                        <div className="flex items-center gap-1 opacity-40 animate-pulse">
                          <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: textHighlight }}>Arraste</span>
                          <ChevronRight className="h-3 w-3" style={{ color: textHighlight }} />
                        </div>
                      </div>

                      <div className="flex overflow-x-auto gap-2 pb-4 no-scrollbar snap-x" style={{ scrollbarWidth: 'none' }}>
                        {gerarProximosDias(30).map((dia) => {
                          const isTrabalho = diasTrabalho.includes(dia.dateObj.getDay());
                          const isFechado = datasFechadas.includes(dia.ymd);
                          const isDisabled = !isTrabalho || isFechado;
                          const isSelected = selecao.data === dia.ymd;

                          return (
                            <button
                              key={dia.ymd}
                              disabled={isDisabled}
                              onClick={() => !isDisabled && setSelecao({ ...selecao, data: dia.ymd, horario: "" })}
                              className={cn(
                                "min-w-[70px] flex flex-col items-center p-4 rounded-[22px] border transition-all snap-center relative",
                                isSelected ? "shadow-xl scale-105" : isDisabled ? "opacity-30" : "opacity-70 hover:opacity-100 hover:scale-105"
                              )}
                              style={{
                                backgroundColor: isSelected ? brand : "transparent",
                                borderColor: isSelected ? brand : isDisabled ? hexToRgba("#ef4444", 0.15) : hexToRgba(textHighlight, 0.1),
                                color: isSelected ? ctaFg : textHighlight,
                              }}
                              aria-label={`${dia.diaSemana} ${dia.diaMes} ${dia.mes}${isDisabled ? " - Indisponível" : ""}`}
                            >
                              {isDisabled && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <X className="h-6 w-6 text-red-500/70" aria-hidden="true" />
                                </div>
                              )}
                              <span className={cn("text-[9px] font-black uppercase mb-1 relative", isDisabled && "line-through")}>{dia.diaSemana}</span>
                              <span className={cn("text-xl font-black mb-1 relative", isDisabled && "line-through")}>{dia.diaMes}</span>
                              <span className={cn("text-[9px] font-black uppercase relative", isDisabled && "line-through")}>{dia.mes}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {selecao.data && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-widest opacity-50 px-1" style={{ color: textHighlight }}>
                          Horários Disponíveis
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                          {horariosDoDia.map((h) => {
                            const [hH, mM] = h.split(":").map(Number);
                            const passou = selecao.data === hojeYMD && (hH < new Date().getHours() || (hH === new Date().getHours() && mM <= new Date().getMinutes()));
                            const disponivel = !passou && verificarDisponibilidadeHorario(h, selecao.servico?.duracao_minutos || 30, ocupados, horariosDoDia);
                            const isSelecionado = selecao.horario === h;

                            return (
                              <button
                                key={h}
                                disabled={!disponivel}
                                onClick={() => { if (disponivel) { setSelecao({ ...selecao, horario: h }); setEtapa(4); } }}
                                className={cn(
                                  "py-3.5 rounded-2xl border text-sm font-bold transition-all",
                                  isSelecionado ? "scale-105 shadow-lg" : disponivel ? "active:scale-90 hover:scale-105 hover:opacity-100 opacity-70" : "opacity-10 line-through cursor-not-allowed"
                                )}
                                style={{
                                  backgroundColor: isSelecionado ? brand : "transparent",
                                  borderColor: isSelecionado ? brand : hexToRgba(textHighlight, 0.1),
                                  color: isSelecionado ? ctaFg : textHighlight,
                                }}
                                aria-label={`Horário ${h}${!disponivel ? " - Indisponível" : ""}`}
                              >
                                {h}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {/* Etapa 4: Dados do cliente + RESUMO */}
                {etapa === 4 && (
                  <section className="space-y-6">
                    <div className="text-center space-y-2 mb-6">
                      <h2 className="text-2xl font-black uppercase italic tracking-tighter" style={{ color: textHighlight }}>
                        Confirmar Dados
                      </h2>
                      <p className="text-sm opacity-60 max-w-xs mx-auto" style={{ color: textHighlight }}>
                        Revise seu agendamento e informe seu contato.
                      </p>
                    </div>

                    {/* CARD DE RESUMO */}
                    <div className="rounded-[24px] border p-5 space-y-3 relative overflow-hidden" style={{ backgroundColor: hexToRgba(bg, 0.6), borderColor: hexToRgba(brand, 0.15) }}>
                      <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: brand }} aria-hidden="true" />

                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase opacity-40" style={{ color: textHighlight }}>Serviço</span>
                        <span className="text-sm font-bold" style={{ color: textHighlight }}>{selecao.servico?.nome}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase opacity-40" style={{ color: textHighlight }}>Profissional</span>
                        <span className="text-sm font-bold" style={{ color: textHighlight }}>{selecao.barbeiro?.nome}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase opacity-40" style={{ color: textHighlight }}>Data</span>
                        <span className="text-sm font-bold" style={{ color: textHighlight }}>{formatarDataVisual(selecao.data)}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase opacity-40" style={{ color: textHighlight }}>Horário</span>
                        <span className="text-sm font-bold" style={{ color: brand }}>{selecao.horario}</span>
                      </div>

                      <div className="pt-3 mt-2 border-t flex justify-between items-center" style={{ borderColor: hexToRgba(textHighlight, 0.1) }}>
                        <span className="text-[10px] font-black uppercase opacity-40" style={{ color: textHighlight }}>Valor</span>
                        <span className="text-xl font-black" style={{ color: brand }}>R$ {selecao.servico?.preco.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      <Input placeholder="Seu Nome Completo" className="h-14 rounded-2xl bg-white/5 border-white/10 text-center text-lg text-white placeholder:opacity-30" value={selecao.nome} onChange={(e) => setSelecao({ ...selecao, nome: e.target.value })} aria-label="Seu nome completo" />
                      <Input placeholder="WhatsApp com DDD" type="tel" className="h-14 rounded-2xl bg-white/5 border-white/10 text-center text-lg text-white placeholder:opacity-30" value={selecao.whatsapp} onChange={(e) => setSelecao({ ...selecao, whatsapp: aplicarMascaraZap(e.target.value) })} aria-label="WhatsApp com DDD" />

                      <Button className="w-full h-16 rounded-[24px] font-black uppercase text-sm shadow-2xl mt-4 transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ backgroundColor: brand, color: ctaFg }} onClick={handleFinalizar}>
                        Confirmar Agendamento
                      </Button>
                    </div>
                  </section>
                )}
              </motion.div>
            ) : (
              <motion.div key="sucesso" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20 }} className="flex flex-col items-center gap-6 text-center">
                <div className="p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-2">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter" style={{ color: textHighlight }}>Tudo Certo!</h2>
                <p className="text-sm opacity-60 max-w-xs" style={{ color: textHighlight }}>Seu horário foi reservado. Salve seu ticket abaixo.</p>

                <WalletTicket
                  config={config}
                  selecao={selecao}
                  slug={slug}
                  ticketCodigo={ticketCodigo}
                  servicos={selecao.servico ? [selecao.servico] : []}
                  precoTotal={Number(selecao.servico?.preco || 0)}
                  duracaoTotal={Number(selecao.servico?.duracao_minutos || 30)}
                  checkinHabilitado={config?.checkin_habilitado ?? false}
                />

                <div className="w-full space-y-3 pt-4">
                  <Button className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ backgroundColor: brand, color: ctaFg }} onClick={salvarTicketComoImagem}>
                    Salvar no Dispositivo
                  </Button>
                  <Button variant="ghost" className="w-full text-zinc-500 uppercase font-black text-[10px] tracking-widest hover:text-white transition-colors" onClick={() => window.location.reload()}>
                    Fazer novo agendamento
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="p-8 text-center opacity-20">
          <p className="text-[9px] font-black uppercase tracking-[0.4em]" style={{ color: textHighlight }}>Powered by CAJ TECH</p>
        </footer>
      </div>
    </div>
  );
}