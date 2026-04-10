import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronLeft,
  Loader2,
  CheckCircle2,
  Scissors,
  User,
  RefreshCw,
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
// FUNÇÕES AUXILIARES
// ==========================================
function gerarHorarios(abertura = "09:00", fechamento = "18:00", inicioAlmoco = "12:00", fimAlmoco = "13:00") {
  const horarios = [];
  let [horaAtual, minAtual] = abertura.split(":").map(Number);
  const [horaFim, minFim] = fechamento.split(":").map(Number);
  const [horaIniAlmoco, minIniAlmoco] = inicioAlmoco.split(":").map(Number);
  const [horaFimAlmoco, minFimAlmoco] = fimAlmoco.split(":").map(Number);

  while (horaAtual < horaFim || (horaAtual === horaFim && minAtual < minFim)) {
    const isHoraAlmoco =
      (horaAtual > horaIniAlmoco || (horaAtual === horaIniAlmoco && minAtual >= minIniAlmoco)) &&
      (horaAtual < horaFimAlmoco || (horaAtual === horaFimAlmoco && minAtual < minFimAlmoco));

    if (!isHoraAlmoco) {
      horarios.push(`${String(horaAtual).padStart(2, "0")}:${String(minAtual).padStart(2, "0")}`);
    }

    minAtual += 30;
    if (minAtual >= 60) { minAtual -= 60; horaAtual += 1; }
  }
  return horarios;
}

const aplicarMascaraZap = (v: string) => {
  const digits = v.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

const validarNomeRegex = (nome: string) => /^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]*$/.test(nome);

const DIAS_SEMANA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES_CURTO = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function formatarDataYMD(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function gerarProximosDias(quantidade = 30) {
  const dias = [];
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  for (let i = 0; i < quantidade; i++) {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() + i);
    dias.push({
      dateObj: d, ymd: formatarDataYMD(d),
      diaSemana: DIAS_SEMANA_CURTO[d.getDay()],
      diaMes: String(d.getDate()).padStart(2, "0"),
      mes: MESES_CURTO[d.getMonth()]
    });
  }
  return dias;
}

const getDiaLabel = (ymd: string) => {
  const hoje = formatarDataYMD(new Date());
  const amanha = formatarDataYMD(new Date(Date.now() + 86400000));
  if (ymd === hoje) return "Hoje";
  if (ymd === amanha) return "Amanhã";
  return null;
};

const listContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const listItem = { hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } };

type BarbeariaRow = {
  id?: string; nome?: string | null; cor_primaria?: string | null; cor_secundaria?: string | null;
  cor_destaque?: string | null; url_fundo?: string | null; url_logo?: string | null;
  horario_abertura?: string | null; horario_fechamento?: string | null;
  dias_trabalho?: number[] | null; inicio_almoco?: string | null; fim_almoco?: string | null;
  datas_fechadas?: string[] | null; ativo?: boolean | null; data_vencimento?: string | null;
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function AgendamentoPublico() {
  const { slug } = useParams();
  const [etapa, setEtapa] = useState(1);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<BarbeariaRow | null>(null);
  const [barbeiros, setBarbeiros] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [ocupados, setOcupados] = useState<string[]>([]);
  const [ticketCodigo, setTicketCodigo] = useState("");
  const [loadingHorarios, setLoadingHorarios] = useState(false);
  const [quantidadeDias, setQuantidadeDias] = useState(14);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [servicosSelecionadosIds, setServicosSelecionadosIds] = useState<string[]>([]);
  const [selecao, setSelecao] = useState({
    barbeiro: null as any, data: "", horario: "", nome: "", whatsapp: "",
  });

  const [erroNome, setErroNome] = useState(false);
  const [erroWhatsapp, setErroWhatsapp] = useState(false);

  const etapaRef = useRef<HTMLDivElement>(null);

  const brand = config?.cor_primaria?.trim() || "#D4AF37";
  const bg = config?.cor_secundaria?.trim() || "#18181B";
  const textHighlight = config?.cor_destaque?.trim() || "#FFFFFF";
  const ctaFg = contrastTextOnBrand(brand);

  const servicosSelecionados = useMemo(() => {
    return servicos.filter((s) => servicosSelecionadosIds.includes(s.id));
  }, [servicos, servicosSelecionadosIds]);

  const duracaoTotal = useMemo(() => {
    return servicosSelecionados.reduce((acc, s) => acc + (s.duracao_minutos || 30), 0);
  }, [servicosSelecionados]);

  const precoTotal = useMemo(() => {
    return servicosSelecionados.reduce((acc, s) => acc + Number(s.preco || 0), 0);
  }, [servicosSelecionados]);

  const salvarTicketComoImagem = useCallback(async () => {
    const el = document.getElementById(WALLET_TICKET_CAPTURE_ID);
    if (!el) return toast.error("Ticket não encontrado.");
    const wait = toast.loading("Gerando imagem...");
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: bg, logging: false });
      const link = document.createElement("a");
      link.download = `agendamento-${slug || "caj"}.png`;
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
    etapaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [etapa]);

  useEffect(() => {
    async function carregarDados() {
      try {
        const { data: bInfo } = await supabase.from("barbearias").select("*").eq("slug", slug).single();
        if (bInfo) setConfig(bInfo as BarbeariaRow);
        const { data: barbs } = await supabase.from("barbeiros").select("*").eq("barbearia_slug", slug).eq("ativo", true);
        const { data: servs } = await supabase.from("servicos").select("*").eq("barbearia_slug", slug);
        setBarbeiros(barbs || []);
        setServicos(servs || []);
        setLoading(false);
      } catch (error) {
        toast.error("Erro ao carregar dados da barbearia.");
        setLoading(false);
      }
    }
    carregarDados();
  }, [slug]);

  useEffect(() => {
    if (!selecao.data || !selecao.barbeiro) return;

    async function fetchOcupados() {
      setLoadingHorarios(true);
      try {
        const { data, error } = await supabase
          .from("agendamentos")
          .select("horario, servico_id")
          .eq("barbeiro_id", selecao.barbeiro.id)
          .eq("data", selecao.data)
          .neq("status", "Cancelado");

        if (error) {
          toast.error("Erro ao carregar horários disponíveis.");
          return;
        }

        const slots: string[] = [];
        data?.forEach((ag) => {
          const serv = servicos.find((s: any) => s.id === ag.servico_id);
          const qtdeBlocos = Math.ceil((serv?.duracao_minutos || 30) / 30);
          let [h, m] = ag.horario.split(":").map(Number);
          for (let i = 0; i < qtdeBlocos; i++) {
            slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
            m += 30;
            if (m >= 60) { m -= 60; h += 1; }
          }
        });
        setOcupados(slots);
      } catch (err) {
        toast.error("Falha na conexão ao verificar horários.");
      } finally {
        setLoadingHorarios(false);
      }
    }

    fetchOcupados();
  }, [selecao.data, selecao.barbeiro, servicos]);

  useEffect(() => {
    const nomeSalvo = localStorage.getItem("cliente_nome");
    const whatsappSalvo = localStorage.getItem("cliente_whatsapp");
    if (nomeSalvo) setSelecao((prev) => ({ ...prev, nome: nomeSalvo }));
    if (whatsappSalvo) setSelecao((prev) => ({ ...prev, whatsapp: whatsappSalvo }));
  }, []);

  const validarNome = (nome: string) => nome.trim().length >= 3;
  const validarWhatsapp = (whatsapp: string) => whatsapp.replace(/\D/g, "").length >= 10;

  const handleNomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    if (!validarNomeRegex(valor)) return;
    setSelecao((prev) => ({ ...prev, nome: valor }));
    setErroNome(!validarNome(valor));
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = aplicarMascaraZap(e.target.value);
    setSelecao((prev) => ({ ...prev, whatsapp: valor }));
    setErroWhatsapp(!validarWhatsapp(valor));
  };

  const handleFinalizar = async () => {
    const nomeOk = validarNome(selecao.nome);
    const zapOk = validarWhatsapp(selecao.whatsapp);
    setErroNome(!nomeOk);
    setErroWhatsapp(!zapOk);
    if (!nomeOk) return toast.error("Digite seu nome completo (mínimo 3 caracteres).");
    if (!zapOk) return toast.error("WhatsApp inválido (mínimo 10 dígitos).");
    if (servicosSelecionados.length === 0) return toast.error("Selecione pelo menos um serviço.");

    setIsSubmitting(true);
    const toastId = toast.loading("Verificando disponibilidade...");

    try {
      // Verificação reativa de disponibilidade
      const { data: conflitantes, error: erroConsulta } = await supabase
        .from("agendamentos")
        .select("horario, servico_id")
        .eq("barbeiro_id", selecao.barbeiro.id)
        .eq("data", selecao.data)
        .neq("status", "Cancelado");

      if (erroConsulta) {
        toast.dismiss(toastId);
        setIsSubmitting(false);
        console.error("Erro ao verificar horários:", erroConsulta);
        return toast.error("Erro ao verificar disponibilidade. Tente novamente.");
      }

      const slotsOcupadosAtuais: string[] = [];
      conflitantes?.forEach((ag) => {
        const serv = servicos.find((s) => s.id === ag.servico_id);
        const qtdeBlocos = Math.ceil((serv?.duracao_minutos || 30) / 30);
        let [h, m] = ag.horario.split(":").map(Number);
        for (let i = 0; i < qtdeBlocos; i++) {
          slotsOcupadosAtuais.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
          m += 30;
          if (m >= 60) { m -= 60; h += 1; }
        }
      });

      const [horaInicio, minInicio] = selecao.horario.split(":").map(Number);
      const duracaoTotalMinutos = servicosSelecionados.reduce((acc, s) => acc + (s.duracao_minutos || 30), 0);
      const blocosNecessarios = Math.ceil(duracaoTotalMinutos / 30);

      let conflito = false;
      for (let i = 0; i < blocosNecessarios; i++) {
        let h = horaInicio;
        let m = minInicio + i * 30;
        if (m >= 60) { h += Math.floor(m / 60); m %= 60; }
        const slot = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        if (slotsOcupadosAtuais.includes(slot)) {
          conflito = true;
          break;
        }
      }

      if (conflito) {
        toast.dismiss(toastId);
        setIsSubmitting(false);
        return toast.error("Este horário foi ocupado enquanto você preenchia os dados. Por favor, escolha outro.");
      }

      toast.loading("Confirmando reserva...", { id: toastId });

      localStorage.setItem("cliente_nome", selecao.nome.trim());
      localStorage.setItem("cliente_whatsapp", selecao.whatsapp);

      const codigo = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setTicketCodigo(codigo);

      const agendamentosParaInserir = servicosSelecionados.map((servico) => ({
        nome_cliente: selecao.nome.trim(),
        telefone_cliente: selecao.whatsapp.replace(/\D/g, ""),
        servico_id: servico.id,
        barbeiro_id: selecao.barbeiro.id,
        data: selecao.data,
        horario: selecao.horario,
        barbearia_slug: slug,
        status: "Pendente",
        ticket_codigo: codigo,
      }));

      const { error: erroInsercao } = await supabase.from("agendamentos").insert(agendamentosParaInserir);

      toast.dismiss(toastId);
      setIsSubmitting(false);

      if (erroInsercao) {
        console.error("Erro detalhado do Supabase:", erroInsercao);
        if (erroInsercao.code === "23505") {
          return toast.error("Já existe um agendamento com este código de ticket. Tente novamente.");
        }
        if (erroInsercao.message?.includes("violates row-level security")) {
          return toast.error("Erro de permissão no servidor. Contate o suporte.");
        }
        return toast.error("Não foi possível confirmar o agendamento. Tente novamente.");
      }

      setEtapa(5);
    } catch (err) {
      toast.dismiss(toastId);
      setIsSubmitting(false);
      console.error("Erro inesperado:", err);
      toast.error("Ocorreu um erro inesperado. Por favor, tente novamente.");
    }
  };

  const handleCancelarAgendamento = async () => {
    if (!ticketCodigo) return;
    if (!confirm("Deseja realmente cancelar este agendamento?")) return;
    const { error } = await supabase
      .from("agendamentos")
      .update({ status: "Cancelado" })
      .eq("ticket_codigo", ticketCodigo);
    if (error) {
      toast.error("Não foi possível cancelar. Entre em contato com a barbearia.");
    } else {
      toast.success("Agendamento cancelado.");
      window.location.reload();
    }
  };

  const toggleServico = (servicoId: string) => {
    setServicosSelecionadosIds((prev) =>
      prev.includes(servicoId) ? prev.filter((id) => id !== servicoId) : [...prev, servicoId]
    );
  };

  const prosseguirParaBarbeiro = () => {
    if (servicosSelecionadosIds.length === 0) {
      toast.error("Selecione pelo menos um serviço.");
      return;
    }
    setEtapa(2);
  };

  const diasGerados = useMemo(() => gerarProximosDias(quantidadeDias), [quantidadeDias]);
  const diasTrabalho = config?.dias_trabalho || [1, 2, 3, 4, 5, 6];
  const datasFechadas = config?.datas_fechadas || [];
  const hojeYMD = formatarDataYMD(new Date());
  const horariosDoDia = useMemo(
    () => gerarHorarios(
      config?.horario_abertura || "09:00",
      config?.horario_fechamento || "18:00",
      config?.inicio_almoco || "12:00",
      config?.fim_almoco || "13:00"
    ),
    [config]
  );

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 space-y-4 text-white">
      <Loader2 className="h-10 w-10 animate-spin text-zinc-700" />
      <Skeleton className="h-10 w-48 bg-zinc-800" />
    </div>
  );

  return (
    <div className="min-h-[100dvh] relative isolate font-sans overflow-x-hidden transition-colors duration-500" style={{ backgroundColor: bg }}>
      <AppHeroBackdrop imageUrl={config?.url_fundo || APP_HERO_FALLBACK_BG} />
      <div className="relative z-10 flex min-h-[100dvh] flex-col max-w-lg mx-auto">
        <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mx-4 mt-6 mb-2 rounded-[28px] p-6 border shadow-2xl"
          style={{ backgroundColor: hexToRgba(bg, 0.6), borderColor: hexToRgba(textHighlight, 0.08), backdropFilter: "blur(16px)" }}>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-1" style={{ color: textHighlight }}>Agendamento Online</p>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic" style={{ color: textHighlight }}>{config?.nome || "Barbearia"}</h1>
        </motion.header>

        <main className="flex-1 px-4 pb-32 pt-2">
          <div ref={etapaRef} />
          <AnimatePresence mode="wait">
            {etapa < 5 ? (
              <motion.div key={etapa} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                {etapa > 1 && (
                  <Button variant="ghost" onClick={() => setEtapa((e) => e - 1)} className="text-zinc-400 gap-2 font-bold uppercase text-[10px] tracking-widest px-0 hover:bg-transparent">
                    <ChevronLeft className="h-4 w-4" /> Voltar
                  </Button>
                )}

                {/* ETAPA 1: SERVIÇOS */}
                {etapa === 1 && (
                  <section className="space-y-4">
                    <h2 className="text-lg font-black uppercase italic tracking-tighter ml-1" style={{ color: textHighlight }}>1. Escolha os Serviços</h2>
                    {servicos.length === 0 ? (
                      <div className="text-center p-8 rounded-2xl border" style={{ backgroundColor: hexToRgba(bg, 0.4), borderColor: hexToRgba(textHighlight, 0.05) }}>
                        <Scissors className="mx-auto h-8 w-8 opacity-30 mb-2" style={{ color: textHighlight }} />
                        <p style={{ color: textHighlight }}>Nenhum serviço disponível no momento.</p>
                      </div>
                    ) : (
                      <>
                        <motion.div className="space-y-3" variants={listContainer} initial="hidden" animate="show">
                          {servicos.map((s) => {
                            const selecionado = servicosSelecionadosIds.includes(s.id);
                            return (
                              <motion.button
                                key={s.id}
                                variants={listItem}
                                onClick={() => toggleServico(s.id)}
                                className={cn("w-full rounded-[24px] border p-4 text-left flex items-center justify-between gap-4 transition-all active:scale-[0.98]", selecionado && "ring-2")}
                                style={{
                                  backgroundColor: hexToRgba(bg, 0.4),
                                  borderColor: selecionado ? brand : hexToRgba(textHighlight, 0.05),
                                  ...(selecionado && { boxShadow: `0 0 0 2px ${brand}` })
                                }}
                              >
                                <div className="flex items-center gap-4">
                                  {s.url_imagem && (
                                    <img src={s.url_imagem} className="w-14 h-14 rounded-2xl object-cover shrink-0" alt="" />
                                  )}
                                  <div>
                                    <span className="text-base font-bold block" style={{ color: textHighlight }}>{s.nome}</span>
                                    <span className="text-[10px] font-black uppercase opacity-50" style={{ color: brand }}>⏱ {s.duracao_minutos} min</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-lg font-black tabular-nums" style={{ color: textHighlight }}>R$ {s.preco}</span>
                                  {selecionado && <CheckCircle2 className="h-5 w-5" style={{ color: brand }} />}
                                </div>
                              </motion.button>
                            );
                          })}
                        </motion.div>
                        <div className="flex justify-between items-center mt-4">
                          <p style={{ color: textHighlight }} className="text-sm font-medium">Total: R$ {precoTotal.toFixed(2)} • {duracaoTotal} min</p>
                          <Button onClick={prosseguirParaBarbeiro} className="rounded-full px-6" style={{ backgroundColor: brand, color: ctaFg }} disabled={servicosSelecionadosIds.length === 0}>Continuar</Button>
                        </div>
                      </>
                    )}
                  </section>
                )}

                {/* ETAPA 2: BARBEIROS */}
                {etapa === 2 && (
                  <section className="space-y-4">
                    <h2 className="text-lg font-black uppercase italic tracking-tighter ml-1" style={{ color: textHighlight }}>2. Quem vai te atender?</h2>
                    {barbeiros.length === 0 ? (
                      <div className="text-center p-8 rounded-2xl border" style={{ backgroundColor: hexToRgba(bg, 0.4), borderColor: hexToRgba(textHighlight, 0.05) }}>
                        <User className="mx-auto h-8 w-8 opacity-30 mb-2" style={{ color: textHighlight }} />
                        <p style={{ color: textHighlight }}>Nenhum profissional disponível no momento.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {barbeiros.map((b) => (
                          <button key={b.id} onClick={() => { setSelecao({ ...selecao, barbeiro: b }); setEtapa(3); }}
                            className="flex items-center gap-4 rounded-[24px] border p-4 transition-all active:scale-[0.98]"
                            style={{ backgroundColor: hexToRgba(bg, 0.4), borderColor: hexToRgba(textHighlight, 0.05) }}>
                            {b.url_foto ? (
                              <img src={b.url_foto} className="h-14 w-14 rounded-2xl object-cover shrink-0" alt={b.nome} />
                            ) : (
                              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/5 flex items-center justify-center shrink-0">
                                <User className="text-zinc-700 h-6 w-6" />
                              </div>
                            )}
                            <span className="text-lg font-bold" style={{ color: textHighlight }}>{b.nome}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* ETAPA 3: DATA/HORÁRIO */}
                {etapa === 3 && (
                  <section className="space-y-8">
                    <div>
                      <div className="flex justify-between items-end mb-4 px-1">
                        <h2 className="text-lg font-black uppercase italic tracking-tighter" style={{ color: textHighlight }}>3. Quando?</h2>
                      </div>
                      <div className="flex overflow-x-auto gap-2 pb-4 no-scrollbar snap-x">
                        {diasGerados.map((dia) => {
                          const isTrabalho = diasTrabalho.includes(dia.dateObj.getDay());
                          const isFechado = datasFechadas.includes(dia.ymd);
                          const isSelected = selecao.data === dia.ymd;
                          const labelEspecial = getDiaLabel(dia.ymd);
                          return (
                            <button
                              key={dia.ymd}
                              disabled={!isTrabalho || isFechado}
                              onClick={() => setSelecao({ ...selecao, data: dia.ymd, horario: "" })}
                              className={cn("min-w-[70px] flex flex-col items-center p-4 rounded-[22px] border transition-all snap-center", isSelected ? "shadow-xl" : "opacity-40", !isTrabalho || isFechado ? "cursor-not-allowed" : "")}
                              style={{ backgroundColor: isSelected ? brand : "transparent", borderColor: isSelected ? brand : hexToRgba(textHighlight, 0.1), color: isSelected ? ctaFg : textHighlight }}
                            >
                              {labelEspecial && <span className="text-[8px] font-black uppercase bg-white/20 px-1.5 py-0.5 rounded-full mb-1" style={{ color: isSelected ? ctaFg : brand }}>{labelEspecial}</span>}
                              <span className="text-[9px] font-black uppercase mb-1">{dia.diaSemana}</span>
                              <span className="text-xl font-black mb-1">{dia.diaMes}</span>
                              <span className="text-[9px] font-black uppercase">{dia.mes}</span>
                            </button>
                          );
                        })}
                        <button onClick={() => setQuantidadeDias((q) => q + 7)} className="min-w-[70px] flex flex-col items-center justify-center p-4 rounded-[22px] border bg-white/5" style={{ borderColor: hexToRgba(textHighlight, 0.1) }}>
                          <RefreshCw className="h-5 w-5 mb-1" style={{ color: textHighlight }} />
                          <span className="text-[9px] font-black uppercase" style={{ color: textHighlight }}>Mais 7 dias</span>
                        </button>
                      </div>
                    </div>

                    {selecao.data && (
                      <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase tracking-widest opacity-50 px-1" style={{ color: textHighlight }}>Horários Disponíveis</h3>
                        {loadingHorarios ? (
                          <div className="flex justify-center py-8"><Loader2 className="animate-spin h-8 w-8" style={{ color: brand }} /></div>
                        ) : (
                          <div className="grid grid-cols-3 xs:grid-cols-4 gap-3">
                            {horariosDoDia.map((h) => {
                              const [hH, mM] = h.split(":").map(Number);
                              const passou = selecao.data === hojeYMD && (hH < new Date().getHours() || (hH === new Date().getHours() && mM <= new Date().getMinutes()));
                              const ocupado = ocupados.includes(h) || passou;
                              return (
                                <button
                                  key={h}
                                  disabled={ocupado}
                                  onClick={() => { setSelecao({ ...selecao, horario: h }); setEtapa(4); }}
                                  className={cn("py-3 rounded-2xl border text-sm font-bold transition-all", ocupado ? "opacity-10 line-through cursor-not-allowed" : "active:scale-90 focus:ring-2")}
                                  style={{ borderColor: hexToRgba(textHighlight, 0.1), color: textHighlight }}
                                >
                                  {h}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                )}

                {/* ETAPA 4: CONFIRMAÇÃO */}
                {etapa === 4 && (
                  <section className="space-y-6">
                    <div className="text-center space-y-2 mb-8">
                      <h2 className="text-2xl font-black uppercase italic tracking-tighter" style={{ color: textHighlight }}>Confirmar Dados</h2>
                      <p className="text-sm opacity-50 font-medium" style={{ color: textHighlight }}>Informe seu contato para receber os detalhes.</p>
                    </div>
                    <div className="rounded-2xl p-4 border space-y-2" style={{ backgroundColor: hexToRgba(bg, 0.4), borderColor: hexToRgba(textHighlight, 0.05) }}>
                      <p className="text-sm font-bold" style={{ color: textHighlight }}>Resumo do agendamento:</p>
                      <ul className="text-xs space-y-1" style={{ color: textHighlight }}>
                        {servicosSelecionados.map((s) => <li key={s.id} className="flex justify-between"><span>{s.nome}</span><span>R$ {s.preco}</span></li>)}
                        <li className="border-t pt-1 mt-1 flex justify-between font-bold"><span>Total</span><span>R$ {precoTotal.toFixed(2)}</span></li>
                        <li className="flex justify-between"><span>Duração total</span><span>{duracaoTotal} min</span></li>
                      </ul>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Input
                          placeholder="Seu Nome Completo"
                          className={cn("h-14 rounded-2xl bg-white/5 border-white/10 text-center text-lg text-white", erroNome && "border-red-500")}
                          value={selecao.nome}
                          onChange={handleNomeChange}
                        />
                        {erroNome && <p className="text-red-400 text-xs mt-1 ml-2">Nome deve ter pelo menos 3 caracteres (apenas letras).</p>}
                      </div>
                      <div>
                        <Input
                          placeholder="WhatsApp com DDD"
                          type="tel"
                          className={cn("h-14 rounded-2xl bg-white/5 border-white/10 text-center text-lg text-white", erroWhatsapp && "border-red-500")}
                          value={selecao.whatsapp}
                          onChange={handleWhatsappChange}
                        />
                        {erroWhatsapp && <p className="text-red-400 text-xs mt-1 ml-2">WhatsApp deve ter pelo menos 10 dígitos.</p>}
                      </div>
                      <Button
                        className="w-full h-16 rounded-[24px] font-black uppercase text-sm shadow-2xl mt-4"
                        style={{ backgroundColor: brand, color: ctaFg }}
                        onClick={handleFinalizar}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
                        Finalizar Agendamento
                      </Button>
                    </div>
                  </section>
                )}
              </motion.div>
            ) : (
              <motion.div key="sucesso" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6 text-center">
                <div className="p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-2"><CheckCircle2 className="h-12 w-12 text-emerald-500" /></div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter" style={{ color: textHighlight }}>Tudo Certo!</h2>
                <p className="text-sm opacity-60 max-w-xs" style={{ color: textHighlight }}>Seu horário foi reservado. Salve seu ticket abaixo.</p>

                <WalletTicket
                  config={config}
                  selecao={selecao}
                  slug={slug}
                  ticketCodigo={ticketCodigo}
                  servicos={servicosSelecionados}
                  precoTotal={precoTotal}
                  duracaoTotal={duracaoTotal}
                />

                <div className="w-full space-y-3 pt-4">
                  <Button className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl" style={{ backgroundColor: brand, color: ctaFg }} onClick={salvarTicketComoImagem}>Salvar no Dispositivo</Button>
                  <Button variant="outline" className="w-full border-emerald-600 text-emerald-500 hover:bg-emerald-500/10 font-black uppercase text-xs" onClick={() => {
                    const texto = `Olá, gostaria de confirmar meu agendamento na ${config?.nome || "barbearia"} para ${selecao.data} às ${selecao.horario}.`;
                    window.open(`https://wa.me/55${selecao.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`, "_blank");
                  }}>Confirmar por WhatsApp</Button>
                  <Button variant="ghost" className="w-full text-red-400 uppercase font-black text-[10px] tracking-widest" onClick={handleCancelarAgendamento}>Cancelar agendamento</Button>
                  <Button variant="ghost" className="w-full text-zinc-500 uppercase font-black text-[10px] tracking-widest" onClick={() => window.location.reload()}>Fazer novo agendamento</Button>
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