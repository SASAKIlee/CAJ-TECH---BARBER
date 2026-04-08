import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Loader2, Lock, CalendarX2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { hexToRgba, contrastTextOnBrand } from "@/lib/branding";
import { WalletTicket, WALLET_TICKET_CAPTURE_ID } from "@/components/agendamento-publico/WalletTicket";
import { AppHeroBackdrop, APP_HERO_FALLBACK_BG } from "@/components/AppHeroBackdrop";

// ==========================================
// FUNÇÕES AUXILIARES DE DATA E HORA
// ==========================================
function gerarHorarios(abertura = "09:00", fechamento = "18:00", inicioAlmoco = "12:00", fimAlmoco = "13:00") {
  const horarios = [];
  let [horaAtual, minAtual] = abertura.split(':').map(Number);
  const [horaFim, minFim] = fechamento.split(':').map(Number);
  
  const [horaIniAlmoco, minIniAlmoco] = inicioAlmoco.split(':').map(Number);
  const [horaFimAlmoco, minFimAlmoco] = fimAlmoco.split(':').map(Number);

  while (horaAtual < horaFim || (horaAtual === horaFim && minAtual < minFim)) {
    const isHoraAlmoco = 
      (horaAtual > horaIniAlmoco || (horaAtual === horaIniAlmoco && minAtual >= minIniAlmoco)) &&
      (horaAtual < horaFimAlmoco || (horaAtual === horaFimAlmoco && minAtual < minFimAlmoco));

    if (!isHoraAlmoco) {
      const hFormated = String(horaAtual).padStart(2, '0');
      const mFormated = String(minAtual).padStart(2, '0');
      horarios.push(`${hFormated}:${mFormated}`);
    }

    minAtual += 30;
    if (minAtual >= 60) {
      minAtual -= 60;
      horaAtual += 1;
    }
  }
  return horarios;
}

const DIAS_SEMANA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatarDataYMD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
      mes: MESES_CURTO[d.getMonth()]
    });
  }
  return dias;
}

// ==========================================
// CONFIGURAÇÕES DE ANIMAÇÃO
// ==========================================
const listContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.04 } } };
const listItem = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 380, damping: 34 } } };

type BarbeariaRow = {
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
  meta_fidelidade?: number | null;
};

export default function AgendamentoPublico() {
  const { slug } = useParams();
  const [etapa, setEtapa] = useState(1);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<BarbeariaRow | null>(null);
  const [barbeiros, setBarbeiros] = useState<unknown[]>([]);
  const [servicos, setServicos] = useState<unknown[]>([]);
  const [ocupados, setOcupados] = useState<string[]>([]);
  const [ticketCodigo, setTicketCodigo] = useState("");

  const [selecao, setSelecao] = useState({
    servico: null as { id: string; nome: string; preco: number; duracao_minutos: number; url_imagem?: string } | null,
    barbeiro: null as { id: string; nome: string } | null,
    data: "", horario: "", nome: "", whatsapp: "",
  });

  const brand = config?.cor_primaria?.trim() || "#D4AF37";
  const bg = config?.cor_secundaria?.trim() || "#18181B"; 
  const textHighlight = config?.cor_destaque?.trim() || "#FFFFFF";
  const ctaFg = contrastTextOnBrand(brand);

  const dataMinimaHoje = formatarDataYMD(new Date());

  useEffect(() => {
    async function carregarDados() {
      const { data: bInfo } = await supabase.from("barbearias").select("*").eq("slug", slug).single();
      if (bInfo) setConfig(bInfo as BarbeariaRow);

      const { data: barbs } = await supabase.from("barbeiros").select("*").eq("barbearia_slug", slug).eq("ativo", true);
      const { data: servs } = await supabase.from("servicos").select("*").eq("barbearia_slug", slug);

      setBarbeiros(barbs || []);
      setServicos(servs || []);
      setLoading(false);
    }
    carregarDados();
  }, [slug]);

  useEffect(() => {
    if (selecao.data && selecao.barbeiro) {
      supabase.from("agendamentos").select("horario, servico_id").eq("barbeiro_id", selecao.barbeiro.id).eq("data", selecao.data).neq("status", "Cancelado")
        .then(({ data }) => {
          if(!data) return;
          const slotsOcupados: string[] = [];
          data.forEach(ag => {
            const serv = servicos.find((s:any) => s.id === ag.servico_id) as any;
            const duracao = serv ? serv.duracao_minutos : 30;
            const qtdeBlocos = Math.ceil(duracao / 30);
            
            let [h, m] = ag.horario.split(':').map(Number);
            for(let i=0; i < qtdeBlocos; i++) {
               slotsOcupados.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
               m += 30;
               if(m >= 60) { m -= 60; h += 1; }
            }
          });
          setOcupados(slotsOcupados);
        });
    }
  }, [selecao.data, selecao.barbeiro, servicos]);

  const handleFinalizar = async () => {
    if (!selecao.nome.trim() || selecao.nome.length < 2) {
      return toast.error("Por favor, preencha o seu nome completo.");
    }
    
    const numeroLimpo = selecao.whatsapp.replace(/\D/g, '');
    if (numeroLimpo.length < 10) {
      return toast.error("Por favor, informe um número de WhatsApp válido com DDD.");
    }

    const toastId = toast.loading("Reservando seu horário…");
    const { error } = await supabase.from("agendamentos").insert({
      nome_cliente: selecao.nome.trim(), 
      telefone_cliente: numeroLimpo, 
      servico_id: selecao.servico!.id, 
      barbeiro_id: selecao.barbeiro!.id,
      data: selecao.data, 
      horario: selecao.horario, 
      barbearia_slug: slug, 
      status: "Pendente",
    });

    toast.dismiss(toastId);
    
    if (error) {
      if (error.code === "23505") return toast.error("Ops! Outra pessoa acabou de reservar esse horário. Escolha outro.");
      return toast.error("Ocorreu um erro no servidor. Tente novamente.");
    }

    setTicketCodigo(typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`);
    setEtapa(5);
    toast.success("Agendamento confirmado com sucesso!");
  };

  const salvarTicketComoImagem = useCallback(async () => {
    const el = document.getElementById(WALLET_TICKET_CAPTURE_ID);
    if (!el) return toast.error("Não foi possível localizar o ticket.");
    const wait = toast.loading("Gerando imagem…");
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: bg, logging: false });
      const link = document.createElement("a");
      link.download = `agendamento-${slug ?? "caj"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.dismiss(wait);
      toast.success("Imagem salva.");
    } catch {
      toast.dismiss(wait);
      toast.error("Falha ao exportar.");
    }
  }, [slug, bg]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] relative isolate overflow-x-hidden flex flex-col text-white" style={{ backgroundColor: "#18181B" }}>
        <div className="relative z-10 flex flex-col flex-1">
          <div className="p-6 pt-12 max-w-lg mx-auto w-full space-y-8">
            <Skeleton className="h-14 w-full rounded-3xl bg-white/10" />
            <Skeleton className="h-40 w-full rounded-3xl bg-white/10" />
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-3xl bg-white/10" />
              <Skeleton className="h-24 w-full rounded-3xl bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  let bloqueadoPorInadimplencia = false;
  if (config?.data_vencimento) {
    const hoje = new Date();
    const vencimento = new Date(config.data_vencimento);
    const diffTime = vencimento.getTime() - hoje.getTime();
    const diffDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDias < -3) bloqueadoPorInadimplencia = true;
  }

  if (config?.ativo === false || bloqueadoPorInadimplencia) {
    return (
      <div className="min-h-[100dvh] relative isolate flex flex-col items-center justify-center text-white p-6 text-center" style={{ backgroundColor: "#18181B" }}>
        <div className="bg-red-500/10 p-6 rounded-[2rem] mb-6 border border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.15)]">
          <Lock className="h-12 w-12 text-red-500" />
        </div>
        <h1 className="text-2xl font-black mb-2 uppercase italic tracking-tighter">Sistema Indisponível</h1>
        <p className="text-zinc-400 text-sm max-w-sm">
          Os agendamentos online para esta barbearia estão temporariamente suspensos. Por favor, tente novamente mais tarde ou entre em contato diretamente com o estabelecimento.
        </p>
      </div>
    );
  }

  const heroImageUrl = config?.url_fundo?.trim() || APP_HERO_FALLBACK_BG;
  const horariosDoDia = gerarHorarios(config?.horario_abertura || "09:00", config?.horario_fechamento || "18:00", config?.inicio_almoco || "12:00", config?.fim_almoco || "13:00");
  
  const diasTrabalho = config?.dias_trabalho || [1, 2, 3, 4, 5, 6];
  const datasFechadas = Array.isArray(config?.datas_fechadas) ? config.datas_fechadas : [];
  
  const isHoje = selecao.data === dataMinimaHoje;
  const horaAtualReal = new Date().getHours();
  const minutoAtualReal = new Date().getMinutes();

  const proximosDias = gerarProximosDias(30);

  return (
    <div className="min-h-[100dvh] relative isolate font-sans antialiased overflow-x-hidden transition-colors duration-500" style={{ backgroundColor: bg }}>
      <AppHeroBackdrop imageUrl={heroImageUrl} />
      
      {/* 🚀 CSS PREMIUM: Barra de rolagem estilo pílula e scroll suave nativo */}
      <style dangerouslySetInnerHTML={{__html: `
        .premium-scrollbar::-webkit-scrollbar { height: 4px; }
        .premium-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.03); border-radius: 10px; margin-inline: 4px; }
        .premium-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 10px; }
        .premium-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.25); }
        .premium-scrollbar { scroll-behavior: smooth; }
      `}} />

      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="mx-4 mt-4 mb-2 rounded-[22px] px-6 py-5 shadow-[0_8px_40px_rgba(0,0,0,0.25)] border"
          style={{ backgroundColor: hexToRgba(bg, 0.5), borderColor: hexToRgba(textHighlight, 0.1), backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em]" style={{ color: hexToRgba(textHighlight, 0.5) }}>Agendar</p>
          <h1 className="mt-1 text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: textHighlight, textShadow: `0 0 40px ${hexToRgba(brand, 0.45)}` }}>
            {config?.nome || "Barbearia"}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed max-w-md" style={{ color: hexToRgba(textHighlight, 0.7) }}>
            Escolha o serviço, o profissional e o melhor horário — em poucos toques.
          </p>
        </motion.header>

        <main className="flex-1 px-5 pb-36 pt-4 max-w-lg mx-auto w-full">
          <AnimatePresence mode="wait">
            {etapa < 5 ? (
              <motion.div key={etapa} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ type: "spring", stiffness: 340, damping: 34 }} className="space-y-8">
                {etapa > 1 && (
                  <button type="button" onClick={() => setEtapa((e) => Math.max(1, e - 1))} className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors -ml-1" style={{ color: hexToRgba(textHighlight, 0.7) }}>
                    <ChevronLeft className="h-4 w-4" /> Voltar
                  </button>
                )}

                {etapa === 1 && (
                  <section className="space-y-6">
                    <h2 className="text-xl font-bold tracking-tight" style={{ color: textHighlight }}>Serviços</h2>
                    <motion.ul className="space-y-4" variants={listContainer} initial="hidden" animate="show">
                      {(servicos as { id: string; nome: string; preco: number; duracao_minutos: number; url_imagem?: string }[]).map((s) => (
                        <motion.li key={s.id} variants={listItem}>
                          <motion.button type="button" onClick={() => { setSelecao({ ...selecao, servico: s }); setEtapa(2); }} className="w-full rounded-[22px] border px-5 py-4 text-left shadow-[0_4px_24px_rgba(0,0,0,0.2)] transition-all"
                            style={{ backgroundColor: hexToRgba(bg, 0.8), borderColor: hexToRgba(textHighlight, 0.05) }}
                            whileHover={{ scale: 1.02, borderColor: brand, boxShadow: `0 20px 50px ${hexToRgba(brand, 0.15)}` }}
                            whileTap={{ scale: 0.99 }}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                {s.url_imagem && (
                                  <img src={s.url_imagem} alt={s.nome} className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0" />
                                )}
                                <div>
                                  <span className="text-[17px] font-semibold tracking-tight leading-none block mb-1" style={{ color: textHighlight }}>{s.nome}</span>
                                  <p className="text-[11px] font-bold" style={{ color: brand }}>⏱ {s.duracao_minutos} min</p>
                                </div>
                              </div>
                              <span className="text-lg font-black tabular-nums shrink-0" style={{ color: textHighlight }}>R$ {s.preco}</span>
                            </div>
                          </motion.button>
                        </motion.li>
                      ))}
                    </motion.ul>
                  </section>
                )}

                {etapa === 2 && (
                  <section className="space-y-6">
                    <h2 className="text-xl font-bold tracking-tight" style={{ color: textHighlight }}>Profissional</h2>
                    <motion.ul className="space-y-3" variants={listContainer} initial="hidden" animate="show">
                      {(barbeiros as { id: string; nome: string }[]).map((b) => (
                        <motion.li key={b.id} variants={listItem}>
                          <motion.button type="button" onClick={() => { setSelecao({ ...selecao, barbeiro: b }); setEtapa(3); }} className="flex w-full items-center gap-4 rounded-[22px] border px-5 py-4 text-left shadow-[0_4px_24px_rgba(0,0,0,0.15)] transition-all"
                            style={{ backgroundColor: hexToRgba(bg, 0.8), borderColor: hexToRgba(textHighlight, 0.05) }}
                            whileHover={{ scale: 1.02, borderColor: brand }} whileTap={{ scale: 0.99 }}
                          >
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-bold" style={{ backgroundColor: hexToRgba(brand, 0.2), color: brand }}>
                              {b.nome[0]?.toUpperCase()}
                            </div>
                            <span className="text-[17px] font-semibold tracking-tight" style={{ color: textHighlight }}>{b.nome}</span>
                          </motion.button>
                        </motion.li>
                      ))}
                    </motion.ul>
                  </section>
                )}

                {etapa === 3 && (
                  <motion.section className="space-y-8">
                    
                    {/* 🚀 O CARROSSEL DE DATAS PREMIUM */}
                    <div className="space-y-3 relative">
                      <div className="flex items-center justify-between mb-1">
                        <h2 className="text-xl font-bold tracking-tight" style={{ color: textHighlight }}>Escolha a data</h2>
                        
                        {/* 🚀 AVISO VISUAL DE DESLIZE (A ABINHA) */}
                        <div className="flex items-center gap-1 opacity-60 animate-pulse" style={{ color: textHighlight }}>
                          <span className="text-[9px] font-black uppercase tracking-widest">Deslize</span>
                          <ChevronRight className="h-3 w-3" />
                        </div>
                      </div>

                      <div className="relative">
                        {/* Máscara de Desvanecimento na Direita para induzir o arrasto */}
                        <div className="absolute top-0 right-0 bottom-6 w-12 pointer-events-none z-10" style={{ background: `linear-gradient(to right, transparent, ${bg})` }} />
                        
                        {/* Container do Carrossel com Scrollbar Premium */}
                        <div className="flex overflow-x-auto gap-3 pb-4 snap-x premium-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
                          {proximosDias.map((dia) => {
                             const isSelected = selecao.data === dia.ymd;
                             const isTrabalho = diasTrabalho.includes(dia.dateObj.getDay());
                             const isFechado = datasFechadas.includes(dia.ymd);
                             const isDisponivel = isTrabalho && !isFechado;

                             return (
                               <motion.button
                                 key={dia.ymd}
                                 type="button"
                                 disabled={!isDisponivel}
                                 onClick={() => { setSelecao({ ...selecao, data: dia.ymd, horario: "" }); }}
                                 className={cn(
                                   "min-w-[76px] flex flex-col items-center justify-center p-4 rounded-[24px] transition-all snap-center border shrink-0 relative",
                                   !isDisponivel ? "opacity-20 cursor-not-allowed" : "hover:bg-white/5"
                                 )}
                                 style={{
                                   backgroundColor: isSelected ? brand : hexToRgba(bg, 0.8),
                                   borderColor: isSelected ? brand : hexToRgba(textHighlight, 0.08),
                                   color: isSelected ? ctaFg : textHighlight,
                                   boxShadow: isSelected ? `0 10px 30px ${hexToRgba(brand, 0.3)}` : 'none'
                                 }}
                                 whileHover={isDisponivel && !isSelected ? { scale: 1.05, borderColor: brand } : undefined}
                                 whileTap={isDisponivel ? { scale: 0.95 } : undefined}
                               >
                                 <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">{dia.diaSemana}</span>
                                 <span className="text-2xl font-black tabular-nums leading-none mb-1">{dia.diaMes}</span>
                                 <span className="text-[10px] font-bold uppercase opacity-70">{dia.mes}</span>
                               </motion.button>
                             );
                          })}
                        </div>
                      </div>
                    </div>

                    <motion.div className="space-y-4">
                      <h2 className="text-xl font-bold tracking-tight" style={{ color: textHighlight }}>Horários disponíveis</h2>
                      
                      {!selecao.data ? (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-8 rounded-[28px] text-center border border-dashed" style={{ borderColor: hexToRgba(textHighlight, 0.15), backgroundColor: hexToRgba(bg, 0.4) }}>
                          <CalendarX2 className="h-10 w-10 mx-auto mb-4 opacity-40" style={{ color: textHighlight }} />
                          <p className="text-sm font-medium opacity-60 max-w-[200px] mx-auto leading-relaxed" style={{ color: textHighlight }}>
                            Selecione um dia no calendário acima para ver os horários.
                          </p>
                        </motion.div>
                      ) : (
                        <div className="grid grid-cols-3 gap-3 max-h-[min(52vh,22rem)] overflow-y-auto pr-2 pb-4 premium-scrollbar">
                          {horariosDoDia.map((h) => {
                            const qtdeBlocosNecessarios = Math.ceil((selecao.servico?.duracao_minutos || 30) / 30);
                            let espacoInsuficiente = false;
                            let horarioJaPassou = false;
                            
                            let [horaAvaliada, minAvaliado] = h.split(':').map(Number);

                            if (isHoje) {
                               if (horaAvaliada < horaAtualReal || (horaAvaliada === horaAtualReal && minAvaliado <= minutoAtualReal)) {
                                  horarioJaPassou = true;
                               }
                            }
                            
                            for (let i = 0; i < qtdeBlocosNecessarios; i++) {
                              const horaChecadaStr = `${String(horaAvaliada).padStart(2,'0')}:${String(minAvaliado).padStart(2,'0')}`;
                              if(ocupados.includes(horaChecadaStr) || !horariosDoDia.includes(horaChecadaStr)) {
                                espacoInsuficiente = true; break;
                              }
                              minAvaliado += 30;
                              if (minAvaliado >= 60) { minAvaliado -= 60; horaAvaliada += 1; }
                            }

                            const isOcupado = ocupados.includes(h) || espacoInsuficiente || horarioJaPassou;

                            return (
                              <motion.button key={h} type="button" disabled={isOcupado || !selecao.data} onClick={() => { setSelecao({ ...selecao, horario: h }); setEtapa(4); }}
                                className={cn("rounded-2xl py-3 text-sm font-bold tracking-wide transition-all border", isOcupado || !selecao.data ? "opacity-20 cursor-not-allowed line-through" : "hover:bg-white/5")}
                                style={{ backgroundColor: isOcupado || !selecao.data ? hexToRgba(bg, 0.3) : hexToRgba(bg, 0.8), borderColor: hexToRgba(textHighlight, 0.1), color: textHighlight }}
                                whileHover={!isOcupado && selecao.data ? { scale: 1.04, borderColor: brand } : undefined} whileTap={!isOcupado && selecao.data ? { scale: 0.96 } : undefined}>
                                {h}
                              </motion.button>
                            );
                          })}
                        </div>
                      )}
                    </motion.div>
                  </motion.section>
                )}

                {etapa === 4 && (
                  <section className="space-y-8 pt-2">
                    <h2 className="text-xl font-bold tracking-tight text-center" style={{ color: textHighlight }}>Seus dados</h2>
                    <div className="space-y-5">
                      <Input placeholder="Nome completo" className="h-14 rounded-2xl text-center text-[17px] font-medium" style={{ backgroundColor: hexToRgba(bg, 0.8), borderColor: hexToRgba(textHighlight, 0.1), color: textHighlight }} value={selecao.nome} onChange={(e) => setSelecao({ ...selecao, nome: e.target.value })} />
                      <Input placeholder="WhatsApp com DDD" type="tel" className="h-14 rounded-2xl text-center text-[17px] font-medium" style={{ backgroundColor: hexToRgba(bg, 0.8), borderColor: hexToRgba(textHighlight, 0.1), color: textHighlight }} value={selecao.whatsapp} onChange={(e) => setSelecao({ ...selecao, whatsapp: e.target.value })} />
                      <Button className="w-full h-14 rounded-2xl text-[17px] font-bold shadow-lg border-0" style={{ backgroundColor: brand, color: ctaFg }} onClick={handleFinalizar}>
                        Confirmar Agendamento
                      </Button>
                    </div>
                  </section>
                )}
              </motion.div>
            ) : (
              <motion.div key="ticket" className="flex flex-col items-center gap-8 pt-4">
                <p className="text-center text-sm font-medium max-w-xs" style={{ color: hexToRgba(textHighlight, 0.6) }}>Seu ingresso digital. Apresente na chegada ou salve no rolo da câmera.</p>
                <WalletTicket config={config} selecao={selecao} slug={slug} ticketCodigo={ticketCodigo} />
                <div className="flex w-full max-w-[340px] flex-col gap-3">
                  <Button type="button" className="h-12 rounded-2xl font-semibold w-full shadow-lg" style={{ backgroundColor: brand, color: ctaFg }} onClick={() => void salvarTicketComoImagem()}>Salvar no dispositivo</Button>
                  <Button type="button" variant="ghost" className="hover:bg-white/10 rounded-2xl" style={{ color: hexToRgba(textHighlight, 0.7) }} onClick={() => window.location.reload()}>Novo agendamento</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}