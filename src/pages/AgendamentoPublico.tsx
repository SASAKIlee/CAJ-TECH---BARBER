import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { hexToRgba, contrastTextOnBrand } from "@/lib/branding";
import { WalletTicket, WALLET_TICKET_CAPTURE_ID } from "@/components/agendamento-publico/WalletTicket";
import { AppHeroBackdrop, APP_HERO_FALLBACK_BG } from "@/components/AppHeroBackdrop";

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

const listContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.04 } } };
const listItem = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 380, damping: 34 } } };

type BarbeariaRow = {
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
    const toastId = toast.loading("Reservando seu horário…");
    const { error } = await supabase.from("agendamentos").insert({
      nome_cliente: selecao.nome, telefone_cliente: selecao.whatsapp,
      servico_id: selecao.servico!.id, barbeiro_id: selecao.barbeiro!.id,
      data: selecao.data, horario: selecao.horario, barbearia_slug: slug, status: "Pendente",
    });

    toast.dismiss(toastId);
    if (error) {
      if (error.code === "23505") return toast.error("Ops! Alguém acabou de pegar esse horário. Escolha outro.");
      return toast.error("Erro ao agendar. Tente novamente.");
    }

    setTicketCodigo(typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`);
    setEtapa(5);
    toast.success("Agendamento confirmado.");
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

  const heroImageUrl = config?.url_fundo?.trim() || APP_HERO_FALLBACK_BG;
  const horariosDoDia = gerarHorarios(config?.horario_abertura || "09:00", config?.horario_fechamento || "18:00", config?.inicio_almoco || "12:00", config?.fim_almoco || "13:00");
  
  const dataSelecionada = selecao.data ? new Date(selecao.data + 'T00:00:00') : null;
  const diaDaSemana = dataSelecionada ? dataSelecionada.getDay() : -1;
  const diasTrabalho = config?.dias_trabalho || [1, 2, 3, 4, 5, 6];
  const datasFechadas = Array.isArray(config?.datas_fechadas) ? config.datas_fechadas : [];
  
  const isAbertoHoje = dataSelecionada 
    ? (diasTrabalho.includes(diaDaSemana) && !datasFechadas.includes(selecao.data))
    : true;

  return (
    <div className="min-h-[100dvh] relative isolate font-sans antialiased overflow-x-hidden transition-colors duration-500" style={{ backgroundColor: bg }}>
      <AppHeroBackdrop imageUrl={heroImageUrl} />

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
                                {/* 🚀 SE TIVER IMAGEM MOSTRA, SE NÃO, SE ADAPTA SEM ESPAÇOS VAZIOS */}
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
                    <h2 className="text-xl font-bold tracking-tight" style={{ color: textHighlight }}>Data e horário</h2>
                    <Input type="date" className="h-14 rounded-2xl font-medium" style={{ backgroundColor: hexToRgba(bg, 0.8), borderColor: hexToRgba(textHighlight, 0.1), color: textHighlight }} value={selecao.data} onChange={(e) => setSelecao({ ...selecao, data: e.target.value, horario: "" })} />

                    <motion.div className="space-y-4">
                      <p className="text-sm font-medium" style={{ color: hexToRgba(textHighlight, 0.5) }}>Horários</p>
                      
                      {!isAbertoHoje && selecao.data ? (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-4 rounded-2xl text-center border shadow-lg" style={{ backgroundColor: hexToRgba(bg, 0.8), borderColor: "rgba(239,68,68,0.3)" }}>
                          <p className="text-[15px] font-bold text-red-400">Fechado neste dia.</p>
                          <p className="text-[12px] text-red-400/70 mt-1">Por favor, escolha outra data no calendário.</p>
                        </motion.div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2.5 max-h-[min(52vh,22rem)] overflow-y-auto pr-1 pb-2">
                          {horariosDoDia.map((h) => {
                            const qtdeBlocosNecessarios = Math.ceil((selecao.servico?.duracao_minutos || 30) / 30);
                            let espacoInsuficiente = false;
                            let [horaAvaliada, minAvaliado] = h.split(':').map(Number);
                            
                            for (let i = 0; i < qtdeBlocosNecessarios; i++) {
                              const horaChecadaStr = `${String(horaAvaliada).padStart(2,'0')}:${String(minAvaliado).padStart(2,'0')}`;
                              if(ocupados.includes(horaChecadaStr) || !horariosDoDia.includes(horaChecadaStr)) {
                                espacoInsuficiente = true; break;
                              }
                              minAvaliado += 30;
                              if (minAvaliado >= 60) { minAvaliado -= 60; horaAvaliada += 1; }
                            }

                            const isOcupado = ocupados.includes(h) || espacoInsuficiente;

                            return (
                              <motion.button key={h} type="button" disabled={isOcupado || !selecao.data} onClick={() => { setSelecao({ ...selecao, horario: h }); setEtapa(4); }}
                                className={cn("rounded-2xl py-3 text-xs font-semibold tracking-wide transition-all border", isOcupado || !selecao.data ? "opacity-25 cursor-not-allowed line-through" : "hover:bg-white/5")}
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
                      <Input placeholder="WhatsApp com DDD" className="h-14 rounded-2xl text-center text-[17px] font-medium" style={{ backgroundColor: hexToRgba(bg, 0.8), borderColor: hexToRgba(textHighlight, 0.1), color: textHighlight }} value={selecao.whatsapp} onChange={(e) => setSelecao({ ...selecao, whatsapp: e.target.value })} />
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
                  <Button type="button" className="h-12 rounded-2xl font-semibold w-full" style={{ backgroundColor: brand, color: ctaFg }} onClick={() => void salvarTicketComoImagem()}>Salvar no dispositivo</Button>
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