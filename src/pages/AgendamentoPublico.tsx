import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronLeft, ChevronRight, Loader2, Lock,
  CalendarX2, User, MessageCircle, CheckCircle2, Scissors, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { hexToRgba, contrastTextOnBrand } from "@/lib/branding";
import { WalletTicket, WALLET_TICKET_CAPTURE_ID } from "@/components/agendamento-publico/WalletTicket";
import { AppHeroBackdrop, APP_HERO_FALLBACK_BG } from "@/components/AppHeroBackdrop";

// ==========================================
// TIPAGENS
// ==========================================
interface BarbeariaRow {
  id?: string;
  nome?: string | null;
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
function gerarHorarios(
  abertura = "09:00",
  fechamento = "18:00",
  inicioAlmoco = "12:00",
  fimAlmoco = "13:00"
): string[] {
  const horarios: string[] = [];
  let [horaAtual, minAtual] = abertura.split(':').map(Number);
  const [horaFim, minFim] = fechamento.split(':').map(Number);
  const [horaIniAlmoco, minIniAlmoco] = inicioAlmoco.split(':').map(Number);
  const [horaFimAlmoco, minFimAlmoco] = fimAlmoco.split(':').map(Number);

  while (horaAtual < horaFim || (horaAtual === horaFim && minAtual < minFim)) {
    const isHoraAlmoco =
      (horaAtual > horaIniAlmoco || (horaAtual === horaIniAlmoco && minAtual >= minIniAlmoco)) &&
      (horaAtual < horaFimAlmoco || (horaAtual === horaFimAlmoco && minAtual < minFimAlmoco));

    if (!isHoraAlmoco) {
      horarios.push(`${String(horaAtual).padStart(2, '0')}:${String(minAtual).padStart(2, '0')}`);
    }

    minAtual += 30;
    if (minAtual >= 60) {
      minAtual -= 60;
      horaAtual += 1;
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

function formatarDataYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const DIAS_SEMANA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

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
      mes: MESES_CURTO[d.getMonth()]
    });
  }
  return dias;
}

function verificarDisponibilidadeHorario(
  horarioInicio: string,
  duracaoMinutos: number,
  ocupados: string[],
  horariosDisponiveis: string[]
): boolean {
  const [horaInicio, minInicio] = horarioInicio.split(':').map(Number);
  const blocosNecessarios = Math.ceil(duracaoMinutos / 30);
  const indiceInicio = horariosDisponiveis.indexOf(horarioInicio);
  if (indiceInicio === -1) return false;

  for (let i = 0; i < blocosNecessarios; i++) {
    const indiceBloco = indiceInicio + i;
    if (indiceBloco >= horariosDisponiveis.length) return false;
    const bloco = horariosDisponiveis[indiceBloco];
    if (ocupados.includes(bloco)) return false;
  }
  return true;
}

const listContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const listItem = { hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } };

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function AgendamentoPublico() {
  const { slug } = useParams();
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

  const [selecao, setSelecao] = useState<{
    servico: Servico | null;
    barbeiro: Barbeiro | null;
    data: string;
    horario: string;
    nome: string;
    whatsapp: string;
  }>({
    servico: null,
    barbeiro: null,
    data: "",
    horario: "",
    nome: "",
    whatsapp: "",
  });

  const brand = config?.cor_primaria?.trim() || "#D4AF37";
  const bg = config?.cor_secundaria?.trim() || "#18181B";
  const textHighlight = config?.cor_destaque?.trim() || "#FFFFFF";
  const ctaFg = contrastTextOnBrand(brand);

  const horariosDoDia = useMemo(
    () =>
      gerarHorarios(
        config?.horario_abertura || "09:00",
        config?.horario_fechamento || "18:00",
        config?.inicio_almoco || "12:00",
        config?.fim_almoco || "13:00"
      ),
    [config]
  );

  const diasTrabalho = config?.dias_trabalho || [1, 2, 3, 4, 5, 6];
  const datasFechadas = config?.datas_fechadas || [];
  const hojeYMD = formatarDataYMD(new Date());

  // Verificar se a barbearia está ativa e dentro do prazo
  const verificarStatusBarbearia = useCallback((barbearia: BarbeariaRow) => {
    if (barbearia.ativo === false) return false;
    if (barbearia.data_vencimento) {
      const vencimento = new Date(barbearia.data_vencimento);
      if (vencimento < new Date()) return false;
    }
    return true;
  }, []);

  // Carregar dados iniciais
  useEffect(() => {
    if (!slug) {
      setBarbeariaNaoEncontrada(true);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    async function carregarDados() {
      try {
        const { data: bInfo, error: barbError } = await supabase
          .from("barbearias")
          .select("*")
          .eq("slug", slug)
          .abortSignal(controller.signal)
          .single();

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
          supabase.from("barbeiros").select("*").eq("barbearia_slug", slug).eq("ativo", true).abortSignal(controller.signal),
          supabase.from("servicos").select("*").eq("barbearia_slug", slug).abortSignal(controller.signal)
        ]);

        if (!controller.signal.aborted) {
          setBarbeiros((barbs as Barbeiro[]) || []);
          setServicos((servs as Servico[]) || []);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error(err);
          toast.error("Erro ao carregar dados da barbearia.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    carregarDados();

    return () => {
      controller.abort();
      abortControllerRef.current = null;
    };
  }, [slug, verificarStatusBarbearia]);

  // Carregar ocupados quando data ou barbeiro mudam
  useEffect(() => {
    if (!selecao.data || !selecao.barbeiro || !slug) return;

    const controller = new AbortController();
    async function carregarOcupados() {
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
        const qtdeBlocos = Math.ceil((serv?.duracao_minutos || 30) / 30);
        let [h, m] = ag.horario.split(':').map(Number);
        for (let i = 0; i < qtdeBlocos; i++) {
          slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
          m += 30;
          if (m >= 60) {
            m -= 60;
            h += 1;
          }
        }
      });
      setOcupados(slots);
    }

    carregarOcupados();
    return () => controller.abort();
  }, [selecao.data, selecao.barbeiro, slug, servicos]);

  const salvarTicketComoImagem = useCallback(async () => {
    const el = document.getElementById(WALLET_TICKET_CAPTURE_ID);
    if (!el) return toast.error("Ticket não encontrado.");

    const wait = toast.loading("Gerando imagem...");
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: bg,
        logging: false
      });
      const link = document.createElement("a");
      link.download = `agendamento-${slug || 'caj'}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.dismiss(wait);
      toast.success("Imagem salva! 📸");
    } catch (err) {
      toast.dismiss(wait);
      console.error(err);
      toast.error("Erro ao salvar imagem.");
    }
  }, [slug, bg]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [etapa]);

  const handleFinalizar = async () => {
    if (!validarNome(selecao.nome)) {
      return toast.error("Nome inválido. Use apenas letras e espaços (mín. 3 caracteres).");
    }
    const zap = selecao.whatsapp.replace(/\D/g, '');
    if (!validarWhatsApp(selecao.whatsapp)) {
      return toast.error("WhatsApp inválido. Use DDD + número.");
    }
    if (!selecao.servico || !selecao.barbeiro) {
      return toast.error("Selecione serviço e profissional.");
    }

    if (!verificarDisponibilidadeHorario(selecao.horario, selecao.servico.duracao_minutos, ocupados, horariosDoDia)) {
      return toast.error("Este horário não está mais disponível. Escolha outro.");
    }

    const generatedTicket = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    // AQUI ESTÁ A CHAVE DE IDEMPOTÊNCIA QUE FALTAVA
    const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
    
    const toastId = toast.loading("Confirmando reserva...");

    const { error } = await supabase.from("agendamentos").insert({
      nome_cliente: selecao.nome.trim(),
      telefone_cliente: zap,
      servico_id: selecao.servico.id,
      barbeiro_id: selecao.barbeiro.id,
      data: selecao.data,
      horario: selecao.horario,
      barbearia_slug: slug,
      status: "Pendente",
      ticket_codigo: generatedTicket,
      idempotency_key: idempotencyKey // O BANCO EXIGIA ISSO!
    });

    toast.dismiss(toastId);
    if (error) {
      console.error(error);
      return toast.error("Erro ao confirmar. Tente novamente.");
    }

    setTicketCodigo(generatedTicket);
    setEtapa(5);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 space-y-4 text-white">
        <Loader2 className="h-10 w-10 animate-spin text-zinc-700" />
        <Skeleton className="h-10 w-48 bg-zinc-800" />
      </div>
    );
  }

  if (barbeariaNaoEncontrada) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-black uppercase">Barbearia não encontrada</h1>
        <p className="text-zinc-400 mt-2">O link que você acessou é inválido.</p>
        <Button className="mt-6" onClick={() => navigate('/')}>Voltar ao início</Button>
      </div>
    );
  }

  if (!isBarbeariaAtiva) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center">
        <Lock className="h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-black uppercase">Acesso Suspenso</h1>
        <p className="text-zinc-400 mt-2 max-w-md">
          Esta barbearia está temporariamente indisponível para agendamentos online.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] relative isolate font-sans overflow-x-hidden transition-colors duration-500" style={{ backgroundColor: bg }}>
      <AppHeroBackdrop imageUrl={config?.url_fundo || APP_HERO_FALLBACK_BG} />

      <div className="relative z-10 flex min-h-[100dvh] flex-col max-w-lg mx-auto">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-6 mb-2 rounded-[28px] p-6 border shadow-2xl"
          style={{ backgroundColor: hexToRgba(bg, 0.6), borderColor: hexToRgba(textHighlight, 0.08), backdropFilter: "blur(16px)" }}
        >
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-1" style={{ color: textHighlight }}>
            Agendamento Online
          </p>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic" style={{ color: textHighlight }}>
            {config?.nome || "Barbearia"}
          </h1>
        </motion.header>

        <main className="flex-1 px-4 pb-32 pt-2">
          <AnimatePresence mode="wait">
            {etapa < 5 ? (
              <motion.div
                key={etapa}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {etapa > 1 && (
                  <Button
                    variant="ghost"
                    onClick={() => setEtapa(e => e - 1)}
                    className="text-zinc-400 gap-2 font-bold uppercase text-[10px] tracking-widest px-0 hover:bg-transparent"
                  >
                    <ChevronLeft className="h-4 w-4" /> Voltar
                  </Button>
                )}

                {/* Etapa 1: Serviço */}
                {etapa === 1 && (
                  <section className="space-y-4">
                    <h2 className="text-lg font-black uppercase italic tracking-tighter ml-1" style={{ color: textHighlight }}>
                      1. Escolha o Serviço
                    </h2>
                    <motion.div className="space-y-3" variants={listContainer} initial="hidden" animate="show">
                      {servicos.map((s) => (
                        <motion.button
                          key={s.id}
                          variants={listItem}
                          onClick={() => {
                            setSelecao({ ...selecao, servico: s });
                            setEtapa(2);
                          }}
                          className="w-full rounded-[24px] border p-4 text-left flex items-center justify-between gap-4 transition-all active:scale-[0.98]"
                          style={{ backgroundColor: hexToRgba(bg, 0.4), borderColor: hexToRgba(textHighlight, 0.05) }}
                        >
                          <div className="flex items-center gap-4">
                            {s.url_imagem ? (
                              <img src={s.url_imagem} className="w-14 h-14 rounded-2xl object-cover" alt={s.nome} />
                            ) : (
                              <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                                <Scissors className="opacity-20 h-6 w-6" style={{ color: textHighlight }} />
                              </div>
                            )}
                            <div>
                              <span className="text-base font-bold block" style={{ color: textHighlight }}>
                                {s.nome}
                              </span>
                              <span className="text-[10px] font-black uppercase opacity-50" style={{ color: brand }}>
                                ⏱ {s.duracao_minutos} min
                              </span>
                            </div>
                          </div>
                          <span className="text-lg font-black tabular-nums" style={{ color: textHighlight }}>
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
                    <div className="grid grid-cols-1 gap-3">
                      {barbeiros.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => {
                            setSelecao({ ...selecao, barbeiro: b });
                            setEtapa(3);
                          }}
                          className="flex items-center gap-4 rounded-[24px] border p-4 transition-all active:scale-[0.98]"
                          style={{ backgroundColor: hexToRgba(bg, 0.4), borderColor: hexToRgba(textHighlight, 0.05) }}
                        >
                          <div className="h-14 w-14 rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/5 flex items-center justify-center">
                            {b.url_foto ? (
                              <img src={b.url_foto} className="h-full w-full object-cover" alt={b.nome} />
                            ) : (
                              <User className="text-zinc-700 h-6 w-6" />
                            )}
                          </div>
                          <span className="text-lg font-bold" style={{ color: textHighlight }}>
                            {b.nome}
                          </span>
                        </button>
                      ))}
                    </div>
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
                          <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: textHighlight }}>
                            Arraste
                          </span>
                          <ChevronRight className="h-3 w-3" style={{ color: textHighlight }} />
                        </div>
                      </div>
                      <div className="flex overflow-x-auto gap-2 pb-4 no-scrollbar snap-x">
                        {gerarProximosDias(30).map((dia) => {
                          const isTrabalho = diasTrabalho.includes(dia.dateObj.getDay());
                          const isFechado = datasFechadas.includes(dia.ymd);
                          const isSelected = selecao.data === dia.ymd;
                          return (
                            <button
                              key={dia.ymd}
                              disabled={!isTrabalho || isFechado}
                              onClick={() => setSelecao({ ...selecao, data: dia.ymd, horario: "" })}
                              className={cn(
                                "min-w-[70px] flex flex-col items-center p-4 rounded-[22px] border transition-all snap-center",
                                isSelected ? "shadow-xl" : "opacity-40"
                              )}
                              style={{
                                backgroundColor: isSelected ? brand : 'transparent',
                                borderColor: isSelected ? brand : hexToRgba(textHighlight, 0.1),
                                color: isSelected ? ctaFg : textHighlight
                              }}
                            >
                              <span className="text-[9px] font-black uppercase mb-1">{dia.diaSemana}</span>
                              <span className="text-xl font-black mb-1">{dia.diaMes}</span>
                              <span className="text-[9px] font-black uppercase">{dia.mes}</span>
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
                            const [hH, mM] = h.split(':').map(Number);
                            const passou = selecao.data === hojeYMD && (hH < new Date().getHours() || (hH === new Date().getHours() && mM <= new Date().getMinutes()));
                            const disponivel = !passou && verificarDisponibilidadeHorario(
                              h,
                              selecao.servico?.duracao_minutos || 30,
                              ocupados,
                              horariosDoDia
                            );
                            return (
                              <button
                                key={h}
                                disabled={!disponivel}
                                onClick={() => {
                                  if (disponivel) {
                                    setSelecao({ ...selecao, horario: h });
                                    setEtapa(4);
                                  }
                                }}
                                className={cn(
                                  "py-3 rounded-2xl border text-sm font-bold transition-all",
                                  disponivel ? "active:scale-90" : "opacity-10 line-through cursor-not-allowed"
                                )}
                                style={{ borderColor: hexToRgba(textHighlight, 0.1), color: textHighlight }}
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

                {/* Etapa 4: Dados do cliente */}
                {etapa === 4 && (
                  <section className="space-y-6">
                    <div className="text-center space-y-2 mb-8">
                      <h2 className="text-2xl font-black uppercase italic tracking-tighter" style={{ color: textHighlight }}>
                        Confirmar Dados
                      </h2>
                      <p className="text-sm opacity-50 font-medium" style={{ color: textHighlight }}>
                        Informe seu contato para receber os detalhes.
                      </p>
                    </div>
                    <div className="space-y-4">
                      <Input
                        placeholder="Seu Nome Completo"
                        className="h-14 rounded-2xl bg-white/5 border-white/10 text-center text-lg text-white"
                        value={selecao.nome}
                        onChange={(e) => setSelecao({ ...selecao, nome: e.target.value })}
                      />
                      <Input
                        placeholder="WhatsApp com DDD"
                        type="tel"
                        className="h-14 rounded-2xl bg-white/5 border-white/10 text-center text-lg text-white"
                        value={selecao.whatsapp}
                        onChange={(e) => setSelecao({ ...selecao, whatsapp: aplicarMascaraZap(e.target.value) })}
                      />
                      <Button
                        className="w-full h-16 rounded-[24px] font-black uppercase text-sm shadow-2xl mt-4"
                        style={{ backgroundColor: brand, color: ctaFg }}
                        onClick={handleFinalizar}
                      >
                        Finalizar Agendamento
                      </Button>
                    </div>
                  </section>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="sucesso"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-6 text-center"
              >
                <div className="p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-2">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter" style={{ color: textHighlight }}>
                  Tudo Certo!
                </h2>
                <p className="text-sm opacity-60 max-w-xs" style={{ color: textHighlight }}>
                  Seu horário foi reservado. Salve seu ticket abaixo.
                </p>

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
                  <Button
                    className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl"
                    style={{ backgroundColor: brand, color: ctaFg }}
                    onClick={salvarTicketComoImagem}
                  >
                    Salvar no Dispositivo
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-zinc-500 uppercase font-black text-[10px] tracking-widest"
                    onClick={() => window.location.reload()}
                  >
                    Fazer novo agendamento
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="p-8 text-center opacity-20">
          <p className="text-[9px] font-black uppercase tracking-[0.4em]" style={{ color: textHighlight }}>
            Powered by CAJ TECH
          </p>
        </footer>
      </div>
    </div>
  );
}