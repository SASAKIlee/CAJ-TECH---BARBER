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
import {
  WalletTicket,
  WALLET_TICKET_CAPTURE_ID,
} from "@/components/agendamento-publico/WalletTicket";
import {
  AppHeroBackdrop,
  APP_HERO_FALLBACK_BG,
} from "@/components/AppHeroBackdrop";

const HORARIOS = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
];

const listContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
};

const listItem = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 380, damping: 34 },
  },
};

type BarbeariaRow = {
  nome?: string | null;
  cor_primaria?: string | null;
  url_fundo?: string | null;
  url_logo?: string | null;
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
    servico: null as { id: string; nome: string; preco: number } | null,
    barbeiro: null as { id: string; nome: string } | null,
    data: "",
    horario: "",
    nome: "",
    whatsapp: "",
  });

  const brand = config?.cor_primaria?.trim() || "#D4AF37";
  const ctaFg = contrastTextOnBrand(brand);

  useEffect(() => {
    async function carregarDados() {
      const { data: bInfo } = await supabase
        .from("barbearias")
        .select("*")
        .eq("slug", slug)
        .single();
      if (bInfo) setConfig(bInfo as BarbeariaRow);

      const { data: barbs } = await supabase
        .from("barbeiros")
        .select("*")
        .eq("barbearia_slug", slug)
        .eq("ativo", true);
      const { data: servs } = await supabase
        .from("servicos")
        .select("*")
        .eq("barbearia_slug", slug);

      setBarbeiros(barbs || []);
      setServicos(servs || []);
      setLoading(false);
    }
    carregarDados();
  }, [slug]);

  useEffect(() => {
    if (selecao.data && selecao.barbeiro) {
      supabase
        .from("agendamentos")
        .select("horario")
        .eq("barbeiro_id", selecao.barbeiro.id)
        .eq("data", selecao.data)
        .then(({ data }) => setOcupados(data?.map((d) => d.horario) || []));
    }
  }, [selecao.data, selecao.barbeiro]);

  const handleFinalizar = async () => {
    const toastId = toast.loading("Reservando seu horário…");

    const { error } = await supabase.from("agendamentos").insert({
      nome_cliente: selecao.nome,
      telefone_cliente: selecao.whatsapp,
      servico_id: selecao.servico!.id,
      barbeiro_id: selecao.barbeiro!.id,
      data: selecao.data,
      horario: selecao.horario,
      barbearia_slug: slug,
      status: "Pendente",
    });

    toast.dismiss(toastId);
    if (error) {
      if (error.code === "23505") {
        return toast.error("Ops! Alguém acabou de pegar esse horário. Escolha outro.");
      }
      return toast.error("Erro ao agendar. Tente novamente.");
    }

    setTicketCodigo(
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    );
    setEtapa(5);
    toast.success("Agendamento confirmado.");
  };

  const salvarTicketComoImagem = useCallback(async () => {
    const el = document.getElementById(WALLET_TICKET_CAPTURE_ID);
    if (!el) {
      toast.error("Não foi possível localizar o ticket.");
      return;
    }
    const wait = toast.loading("Gerando imagem…");
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#f2f2f7",
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `agendamento-${slug ?? "caj"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.dismiss(wait);
      toast.success("Imagem salva.");
    } catch {
      toast.dismiss(wait);
      toast.error("Falha ao exportar. Tente tirar um print do ticket.");
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] relative isolate overflow-x-hidden flex flex-col text-white">
        <AppHeroBackdrop imageUrl={APP_HERO_FALLBACK_BG} />
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

  return (
    <div className="min-h-[100dvh] relative isolate text-white font-sans antialiased overflow-x-hidden">
      <AppHeroBackdrop imageUrl={heroImageUrl} />

      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="mx-4 mt-4 mb-2 rounded-[22px] border border-white/[0.08] px-6 py-5 shadow-[0_8px_40px_rgba(0,0,0,0.25)]"
          style={{
            backgroundColor: hexToRgba(brand, 0.12),
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/50">
            Agendar
          </p>
          <h1
            className="mt-1 text-3xl sm:text-4xl font-bold tracking-tight text-white"
            style={{ textShadow: `0 0 40px ${hexToRgba(brand, 0.45)}` }}
          >
            {config?.nome || "Barbearia"}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-white/65 max-w-md">
            Escolha o serviço, o profissional e o melhor horário — em poucos toques.
          </p>
        </motion.header>

        <main className="flex-1 px-5 pb-36 pt-4 max-w-lg mx-auto w-full">
          <AnimatePresence mode="wait">
            {etapa < 5 ? (
              <motion.div
                key={etapa}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ type: "spring", stiffness: 340, damping: 34 }}
                className="space-y-8"
              >
                {etapa > 1 && (
                  <button
                    type="button"
                    onClick={() => setEtapa((e) => Math.max(1, e - 1))}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/70 hover:text-white transition-colors -ml-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Voltar
                  </button>
                )}

                {etapa === 1 && (
                  <section className="space-y-6">
                    <h2 className="text-xl font-bold tracking-tight text-white">
                      Serviços
                    </h2>
                    <motion.ul
                      className="space-y-4"
                      variants={listContainer}
                      initial="hidden"
                      animate="show"
                    >
                      {(servicos as { id: string; nome: string; preco: number }[]).map(
                        (s) => (
                          <motion.li key={s.id} variants={listItem}>
                            <motion.button
                              type="button"
                              whileHover={{
                                scale: 1.02,
                                boxShadow: `0 20px 50px ${hexToRgba(brand, 0.25)}`,
                              }}
                              whileTap={{ scale: 0.99 }}
                              transition={{ type: "spring", stiffness: 420, damping: 26 }}
                              onClick={() => {
                                setSelecao({ ...selecao, servico: s });
                                setEtapa(2);
                              }}
                              className={cn(
                                "w-full rounded-[22px] border border-white/[0.06] px-6 py-5 text-left",
                                "shadow-[0_4px_24px_rgba(0,0,0,0.2)] transition-shadow",
                              )}
                              style={{
                                backgroundColor: hexToRgba(brand, 0.08),
                                backdropFilter: "blur(10px)",
                                WebkitBackdropFilter: "blur(10px)",
                              }}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-[17px] font-semibold tracking-tight text-white">
                                  {s.nome}
                                </span>
                                <span
                                  className="text-lg font-bold tabular-nums shrink-0"
                                  style={{ color: brand }}
                                >
                                  R$ {s.preco}
                                </span>
                              </div>
                            </motion.button>
                          </motion.li>
                        ),
                      )}
                    </motion.ul>
                    {servicos.length === 0 && (
                      <p className="text-center text-white/50 text-sm py-12">
                        Nenhum serviço disponível no momento.
                      </p>
                    )}
                  </section>
                )}

                {etapa === 2 && (
                  <section className="space-y-6">
                    <h2 className="text-xl font-bold tracking-tight text-white">
                      Profissional
                    </h2>
                    <motion.ul
                      className="space-y-3"
                      variants={listContainer}
                      initial="hidden"
                      animate="show"
                    >
                      {(barbeiros as { id: string; nome: string }[]).map((b) => (
                        <motion.li key={b.id} variants={listItem}>
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.99 }}
                            transition={{ type: "spring", stiffness: 400, damping: 28 }}
                            onClick={() => {
                              setSelecao({ ...selecao, barbeiro: b });
                              setEtapa(3);
                            }}
                            className="flex w-full items-center gap-4 rounded-[22px] border border-white/[0.06] px-5 py-4 text-left shadow-[0_4px_24px_rgba(0,0,0,0.15)]"
                            style={{
                              backgroundColor: hexToRgba(brand, 0.08),
                              backdropFilter: "blur(10px)",
                              WebkitBackdropFilter: "blur(10px)",
                            }}
                          >
                            <div
                              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-bold"
                              style={{
                                backgroundColor: hexToRgba(brand, 0.2),
                                color: brand,
                              }}
                            >
                              {b.nome[0]?.toUpperCase()}
                            </div>
                            <span className="text-[17px] font-semibold tracking-tight">
                              {b.nome}
                            </span>
                          </motion.button>
                        </motion.li>
                      ))}
                    </motion.ul>
                    {barbeiros.length === 0 && (
                      <p className="text-center text-white/50 text-sm py-12">
                        Nenhum profissional disponível.
                      </p>
                    )}
                  </section>
                )}

                {etapa === 3 && (
                  <motion.section
                    initial={{ opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 320, damping: 26 }}
                    className="space-y-8"
                  >
                    <h2 className="text-xl font-bold tracking-tight text-white">
                      Data e horário
                    </h2>
                    <Input
                      type="date"
                      className="h-14 rounded-2xl border-white/10 text-[17px] font-medium text-white placeholder:text-white/40 color-scheme-dark"
                      style={{
                        backgroundColor: hexToRgba(brand, 0.1),
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                      }}
                      value={selecao.data}
                      onChange={(e) =>
                        setSelecao({ ...selecao, data: e.target.value, horario: "" })
                      }
                    />

                    <motion.div
                      initial={{ opacity: 0, y: 32 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 280, damping: 22 }}
                      className="space-y-4"
                    >
                      <p className="text-sm font-medium text-white/50">Horários</p>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-40px" }}
                        transition={{ type: "spring", stiffness: 300, damping: 28 }}
                        className="grid grid-cols-3 gap-2.5 max-h-[min(52vh,22rem)] overflow-y-auto pr-1 pb-2 -mr-1"
                      >
                        {HORARIOS.map((h) => {
                          const isOcupado = ocupados.includes(h);
                          return (
                            <motion.button
                              key={h}
                              type="button"
                              disabled={isOcupado || !selecao.data}
                              whileHover={
                                !isOcupado && selecao.data ? { scale: 1.04 } : undefined
                              }
                              whileTap={
                                !isOcupado && selecao.data ? { scale: 0.96 } : undefined
                              }
                              onClick={() => {
                                setSelecao({ ...selecao, horario: h });
                                setEtapa(4);
                              }}
                              className={cn(
                                "rounded-2xl py-3 text-xs font-semibold tracking-wide transition-colors",
                                isOcupado || !selecao.data
                                  ? "opacity-25 cursor-not-allowed line-through bg-white/5"
                                  : "bg-white/[0.07] border border-white/[0.06] text-white hover:bg-white/10",
                              )}
                              style={
                                !isOcupado && selecao.data
                                  ? { boxShadow: `0 0 0 1px ${hexToRgba(brand, 0.25)}` }
                                  : undefined
                              }
                            >
                              {h}
                            </motion.button>
                          );
                        })}
                      </motion.div>
                    </motion.div>
                  </motion.section>
                )}

                {etapa === 4 && (
                  <section className="space-y-8 pt-2">
                    <h2 className="text-xl font-bold tracking-tight text-white text-center">
                      Seus dados
                    </h2>
                    <div className="space-y-5">
                      <Input
                        placeholder="Nome completo"
                        className="h-14 rounded-2xl border-white/10 text-center text-[17px] font-medium"
                        style={{
                          backgroundColor: hexToRgba(brand, 0.1),
                          backdropFilter: "blur(10px)",
                          WebkitBackdropFilter: "blur(10px)",
                        }}
                        value={selecao.nome}
                        onChange={(e) =>
                          setSelecao({ ...selecao, nome: e.target.value })
                        }
                      />
                      <Input
                        placeholder="WhatsApp com DDD"
                        className="h-14 rounded-2xl border-white/10 text-center text-[17px] font-medium"
                        style={{
                          backgroundColor: hexToRgba(brand, 0.1),
                          backdropFilter: "blur(10px)",
                          WebkitBackdropFilter: "blur(10px)",
                        }}
                        value={selecao.whatsapp}
                        onChange={(e) =>
                          setSelecao({ ...selecao, whatsapp: e.target.value })
                        }
                      />
                      <Button
                        className="w-full h-14 rounded-2xl text-[17px] font-bold shadow-lg border-0"
                        style={{ backgroundColor: brand, color: ctaFg }}
                        onClick={handleFinalizar}
                      >
                        Confirmar
                      </Button>
                    </div>
                  </section>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="ticket"
                initial={{ opacity: 0, scale: 0.94, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 280, damping: 28 }}
                className="flex flex-col items-center gap-8 pt-4"
              >
                <p className="text-center text-sm font-medium text-white/60 max-w-xs">
                  Seu ingresso digital. Apresente na chegada ou salve no rolo da câmera.
                </p>
                <WalletTicket
                  config={config}
                  selecao={selecao}
                  slug={slug}
                  ticketCodigo={ticketCodigo}
                />
                <div className="flex w-full max-w-[340px] flex-col gap-3">
                  <Button
                    type="button"
                    className="h-12 rounded-2xl font-semibold w-full"
                    style={{ backgroundColor: brand, color: ctaFg }}
                    onClick={() => void salvarTicketComoImagem()}
                  >
                    Salvar no dispositivo
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-white/70 hover:text-white hover:bg-white/10 rounded-2xl"
                    onClick={() => window.location.reload()}
                  >
                    Novo agendamento
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
