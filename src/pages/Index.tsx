import { useState, useMemo, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Scissors, LayoutDashboard, LogOut, Wallet, Calendar } from "lucide-react";
import { AppHeroBackdrop, APP_HERO_FALLBACK_BG } from "@/components/AppHeroBackdrop";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { VisaoBarbeiro } from "@/components/VisaoBarbeiro";
import { VisaoDono } from "@/components/VisaoDono";
import { VisaoVendedor } from "@/components/VisaoVendedor";
import { VisaoCEO } from "@/components/VisaoCEO";
import { CarteiraBarbeiro } from "@/components/CarteiraBarbeiro";
import { IndexPageSkeleton } from "@/components/IndexPageSkeleton";
import { DataLoadError } from "@/components/DataLoadError";
import { Button } from "@/components/ui/button";
import { TermosDeUso } from "@/components/TermosDeUso";
import { supabase } from "@/integrations/supabase/client";

import { 
  useBarbearia, useBarbeiros, useServicos, useAgendamentos,
  useMutacoesBarbeiro, useMutacoesServico, useMutacoesAgendamento
} from "@/hooks/useQueries";

const getLocalDate = () => {
  const agora = new Date();
  const y = agora.getFullYear();
  const m = String(agora.getMonth() + 1).padStart(2, "0");
  const d = String(agora.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

function mensagemDeErro(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: string }).message;
    if (typeof m === "string" && m.length > 0) return m;
  }
  return "Não foi possível carregar os dados. Verifique sua conexão e tente novamente.";
}

export default function Index() {
  const { signOut, userRole, user } = useAuth();

  const [tab, setTab] = useState<"barbeiro" | "dono" | "carteira" | "vendedor">("barbeiro");
  const [tabSlideDir, setTabSlideDir] = useState(1);
  const [dataFiltro, setDataFiltro] = useState<string>(getLocalDate());
  const [barbeiroSelecionadoId, setBarbeiroSelecionadoId] = useState<string>("");
  const [dadosCEO, setDadosCEO] = useState({ lojas: 0, faturamento: 0, vendedores: [] });

  const barbeariaQueryEnabled = userRole !== "ceo" && userRole !== "vendedor";

  const {
    data: barbearia,
    isLoading: loadingBarbearia,
    isError: erroBarbearia,
    error: erroDetalheBarbearia,
    isFetching: fetchingBarbearia,
    refetch: refetchBarbearia,
  } = useBarbearia({
    enabled: barbeariaQueryEnabled,
  });
  const slug = barbearia?.slug;
  const isDono = barbearia?.isDono;

  const barbeirosQuery = useBarbeiros(slug);
  const servicosQuery = useServicos(slug);
  const agendamentosQuery = useAgendamentos(slug);

  const { data: barbeiros = [], refetch: refetchBarbeiros } = barbeirosQuery;
  const { data: servicos = [], refetch: refetchServicos } = servicosQuery;
  const { data: agendamentos = [], refetch: refetchAgendamentos } = agendamentosQuery;

  const carregandoDependentes =
    !!slug &&
    (barbeirosQuery.isLoading || servicosQuery.isLoading || agendamentosQuery.isLoading);

  const buscandoDependentes =
    !!slug &&
    (barbeirosQuery.isFetching || servicosQuery.isFetching || agendamentosQuery.isFetching);

  const erroDependentes =
    !!slug &&
    (barbeirosQuery.isError || servicosQuery.isError || agendamentosQuery.isError);

  const temErroDados = barbeariaQueryEnabled && (erroBarbearia || erroDependentes);

  const buscandoAlgumaQuery =
    barbeariaQueryEnabled && (fetchingBarbearia || buscandoDependentes);

  const exibirSkeleton =
    barbeariaQueryEnabled &&
    ((!temErroDados && (loadingBarbearia || carregandoDependentes)) ||
      (temErroDados && buscandoAlgumaQuery));

  const refetchDadosPrincipais = useCallback(async () => {
    await refetchBarbearia();
    if (slug) {
      await Promise.all([refetchBarbeiros(), refetchServicos(), refetchAgendamentos()]);
    }
  }, [
    slug,
    refetchBarbearia,
    refetchBarbeiros,
    refetchServicos,
    refetchAgendamentos,
  ]);

  const tituloErroCarregamento = useMemo(() => {
    const msg = erroBarbearia
      ? mensagemDeErro(erroDetalheBarbearia)
      : mensagemDeErro(
          barbeirosQuery.error ?? servicosQuery.error ?? agendamentosQuery.error,
        );
    return msg.includes("Nenhuma barbearia") ? "Nenhuma barbearia vinculada" : "Erro de conexão";
  }, [
    erroBarbearia,
    erroDetalheBarbearia,
    barbeirosQuery.error,
    servicosQuery.error,
    agendamentosQuery.error,
  ]);

  const mensagemErroCarregamento = useMemo(() => {
    if (erroBarbearia) return mensagemDeErro(erroDetalheBarbearia);
    return mensagemDeErro(
      barbeirosQuery.error ?? servicosQuery.error ?? agendamentosQuery.error,
    );
  }, [
    erroBarbearia,
    erroDetalheBarbearia,
    barbeirosQuery.error,
    servicosQuery.error,
    agendamentosQuery.error,
  ]);

  const mutacoesBarbeiro = useMutacoesBarbeiro();
  const mutacoesServico = useMutacoesServico();
  const mutacoesAgendamento = useMutacoesAgendamento();

  useEffect(() => {
    if (userRole !== "ceo") return;

    async function buscarDadosHQ() {
      const { data: vends } = await supabase.from("perfis_vendedores").select("*").eq("ativo", true);
      const { data: lojas } = await supabase.from("barbearias").select("*");

      const totalLojasReal = lojas?.length || 0;

      const listaVendedores =
        vends?.map((v: any) => ({
          id: v.id,
          nome: v.nome,
          total_lojas: 0,
        })) || [];

      setDadosCEO({
        lojas: totalLojasReal,
        faturamento: totalLojasReal * 50,
        vendedores: listaVendedores,
      });
    }

    buscarDadosHQ();
  }, [userRole]);

  useEffect(() => {
    if (!barbeariaQueryEnabled) return;
    if (!isDono && user?.id) {
      setBarbeiroSelecionadoId(user.id);
    } else if (isDono && barbeiros.length > 0 && !barbeiroSelecionadoId) {
      setBarbeiroSelecionadoId("");
    }
  }, [barbeariaQueryEnabled, isDono, user?.id, barbeiros, barbeiroSelecionadoId]);

  const stats = useMemo(() => {
    const hoje = getLocalDate();
    const prefixoMes = hoje.substring(0, 7);
    const noDia = agendamentos.filter((ag: any) => ag.data === dataFiltro);
    const idParaFiltrar = isDono ? barbeiroSelecionadoId : user?.id;
    
    const agParaExibir = idParaFiltrar 
      ? noDia.filter((ag: any) => ag.barbeiro_id === idParaFiltrar)
      : noDia;

    const fatHoje = noDia.filter((ag: any) => ag.status === "Finalizado")
      .reduce((sum: number, ag: any) => {
        const preco = servicos.find((s: any) => s.id === ag.servico_id)?.preco || 0;
        return sum + Number(preco);
      }, 0);
    
    const fatMensal = agendamentos.filter((ag: any) => 
      ag.data.startsWith(prefixoMes) && ag.status === "Finalizado"
    ).reduce((sum: number, ag: any) => {
      const preco = servicos.find((s: any) => s.id === ag.servico_id)?.preco || 0;
      return sum + Number(preco);
    }, 0);

    const comissoesHoje = noDia.filter((ag: any) => ag.status === "Finalizado")
      .reduce((sum: number, ag: any) => sum + Number(ag.comissao_ganha || 0), 0);
    
    const agMesMeuBarbeiro = agendamentos.filter((ag: any) => 
      ag.barbeiro_id === user?.id && 
      ag.data.startsWith(prefixoMes) && 
      ag.status === "Finalizado"
    );

    return { 
      faturamentoHoje: fatHoje, 
      faturamentoMensal: fatMensal,
      comissoesAPagarHoje: comissoesHoje, 
      agendamentosParaExibir: agParaExibir, 
      agMesBarbeiro: agMesMeuBarbeiro 
    };
  }, [agendamentos, servicos, dataFiltro, isDono, user?.id, barbeiroSelecionadoId]);

  const comissaoPorBarbeiroHoje = barbeiros.map((b: any) => {
    const cortes = agendamentos.filter((ag: any) => ag.data === dataFiltro && ag.barbeiro_id === b.id && ag.status === "Finalizado");
    return {
      barbeiro: b,
      total: cortes.reduce((sum: number, ag: any) => sum + Number(ag.comissao_ganha || 0), 0),
      cortes: cortes.length
    };
  });

  const horariosOcupados = (data: string, bId: string) => 
    agendamentos.filter((ag: any) => ag.data === data && ag.barbeiro_id === bId && ag.status !== "Cancelado").map((ag: any) => ag.horario);

  const servicos_find = (id: string) => servicos.find((s: any) => s.id === id);

  if (userRole === "ceo") {
    return (
      <div className="dark min-h-screen bg-background text-foreground flex flex-col">
        <header className="p-4 border-b flex justify-between items-center bg-card">
          <div className="flex items-center gap-3">
            <img src="/safeimagekit-resized-logoempresaCAJsemfundo.png" alt="Logo" className="h-9 w-auto" />
            <h1 className="font-bold text-lg tracking-tight italic">CAJ TECH HQ</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()}>
            <LogOut className="h-5 w-5" />
          </Button>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8">
          <VisaoCEO
            totalLojas={dadosCEO.lojas}
            faturamentoTotal={dadosCEO.faturamento}
            vendedores={dadosCEO.vendedores}
          />
        </main>

        <div className="p-8 text-center bg-black mt-auto">
          <p className="text-zinc-800 text-[8px] font-black uppercase mb-4 tracking-[0.5em]">Sistema Criptografado</p>
        </div>
      </div>
    );
  }

  if (userRole === "vendedor") {
    return (
      <div className="dark min-h-screen bg-background text-foreground flex flex-col">
        <header className="p-4 border-b flex justify-between items-center bg-card">
          <div className="flex items-center gap-3">
            <img src="/safeimagekit-resized-logoempresaCAJsemfundo.png" alt="Logo" className="h-9 w-auto" />
            <h1 className="font-bold text-lg tracking-tight italic">CAJ TECH</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()}>
            <LogOut className="h-5 w-5" />
          </Button>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8">
          <VisaoVendedor
            vendedorId={user?.id}
            vendedorNome={user?.email?.split("@")[0] || "Consultor"}
            clientesAtivos={[]}
          />
        </main>
        <TermosDeUso />
      </div>
    );
  }

  if (barbeariaQueryEnabled && exibirSkeleton) {
    const skeletonTab =
      tab === "dono" || tab === "carteira" || tab === "barbeiro" ? tab : "barbeiro";
    return <IndexPageSkeleton tab={skeletonTab} />;
  }

  if (barbeariaQueryEnabled && temErroDados) {
    return (
      <DataLoadError
        title={tituloErroCarregamento}
        message={mensagemErroCarregamento}
        onRetry={() => void refetchDadosPrincipais()}
        onSignOut={() => void signOut()}
      />
    );
  }

  const visibleTabs =
    userRole === "barbeiro"
      ? [
          { id: "barbeiro" as const, label: "Agenda", icon: Scissors },
          { id: "carteira" as const, label: "Carteira", icon: Wallet },
        ]
      : [
          { id: "barbeiro" as const, label: "Agenda", icon: Scissors },
          { id: "dono" as const, label: "Dashboard", icon: LayoutDashboard },
        ];

  const heroImageUrl =
    (barbearia?.url_fundo && String(barbearia.url_fundo).trim()) || APP_HERO_FALLBACK_BG;
  const marca = barbearia?.cor_primaria?.trim() || "#D4AF37";

  const goTab = (next: "barbeiro" | "dono" | "carteira") => {
    const order: string[] =
      userRole === "barbeiro" ? ["barbeiro", "carteira"] : ["barbeiro", "dono"];
    const oi = order.indexOf(tab);
    const ni = order.indexOf(next);
    if (oi !== -1 && ni !== -1 && oi !== ni) setTabSlideDir(ni > oi ? 1 : -1);
    setTab(next);
  };

  const tabPanelVariants = {
    enter: (dir: number) => ({ x: dir * 52, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir * -52, opacity: 0 }),
  };

  return (
    <div className="dark min-h-screen relative isolate text-foreground flex flex-col overflow-x-hidden">
      <AppHeroBackdrop imageUrl={heroImageUrl} />
      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="p-4 border-b border-white/[0.08] flex justify-between items-center bg-black/35 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/safeimagekit-resized-logoempresaCAJsemfundo.png"
              alt="Logo"
              className="h-9 w-auto"
            />
            <h1 className="font-bold text-lg tracking-tight italic text-white">CAJ TECH</h1>
          </div>
          <motion.div whileTap={{ scale: 0.95 }} className="inline-flex">
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-white"
              onClick={() => signOut()}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </motion.div>
        </header>

        {tab !== "carteira" && (
          <div className="border-b border-white/[0.08] p-3 flex items-center justify-center gap-3 sticky top-0 z-10 w-full shrink-0 bg-black/30 backdrop-blur-xl">
            <Calendar className="h-4 w-4 text-white/50" />
            <input
              type="date"
              value={dataFiltro}
              onChange={(e) => setDataFiltro(e.target.value)}
              className="rounded-full border border-white/[0.12] bg-black/35 px-4 py-1 text-sm outline-none focus:ring-1 focus:ring-white/30 color-scheme-dark text-white backdrop-blur-sm"
            />
            <motion.div whileTap={{ scale: 0.95 }} className="inline-flex">
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full px-4 h-8 text-[10px] font-bold uppercase border-white/[0.1] bg-white/[0.08] text-white hover:bg-white/[0.12]"
                onClick={() => setDataFiltro(getLocalDate())}
              >
                Hoje
              </Button>
            </motion.div>
          </div>
        )}

        <main className="flex-1 p-4 pb-28 max-w-7xl mx-auto w-full md:px-8 flex flex-col min-h-0">
          <AnimatePresence mode="wait" initial={false} custom={tabSlideDir}>
            <motion.div
              key={tab}
              custom={tabSlideDir}
              variants={tabPanelVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 400, damping: 36 }}
              className="flex-1 w-full"
            >
              {tab === "barbeiro" && (
                <VisaoBarbeiro
                  barbeiros={barbeiros}
                  servicos={servicos}
                  agendamentos={stats.agendamentosParaExibir}
                  barbeiroSelecionadoId={barbeiroSelecionadoId}
                  setBarbeiroSelecionadoId={setBarbeiroSelecionadoId}
                  horariosOcupados={horariosOcupados}
                  servicos_find={servicos_find}
                  isDono={isDono || false}
                  userId={user?.id}
                  corPrimaria={marca}
                  onNovoAgendamento={(ag: any) =>
                    mutacoesAgendamento.adicionarAgendamento.mutateAsync({ ag, slug })
                  }
                  onStatusChange={(id: string, status: string) => {
                    if (status === "Finalizado") {
                      const agAtual = agendamentos.find((a: any) => a.id === id);
                      const servico = servicos_find(agAtual?.servico_id);
                      const barbeiro = barbeiros.find((b: any) => b.id === agAtual?.barbeiro_id);
                      const valorComissao =
                        (Number(servico?.preco || 0) * Number(barbeiro?.comissao_pct || 0)) / 100;
                      return mutacoesAgendamento.atualizarStatusAgendamento.mutateAsync({
                        id,
                        status: "Finalizado",
                        comissaoGanha: valorComissao,
                        slug,
                      });
                    }
                    return mutacoesAgendamento.atualizarStatusAgendamento.mutateAsync({
                      id,
                      status,
                      slug,
                    });
                  }}
                />
              )}

              {/* 🚀 A MÁGICA DOS CÁLCULOS DO "FEITO HOJE" ACONTECE AQUI NA CARTEIRA */}
              {tab === "carteira" && (
                <CarteiraBarbeiro
                  comissaoTotalMes={stats.agMesBarbeiro.reduce(
                    (sum: number, ag: any) => sum + Number(ag.comissao_ganha || 0),
                    0,
                  )}
                  totalCortesMes={stats.agMesBarbeiro.length}
                  nomeBarbeiro={
                    barbeiros.find((b: any) => b.id === user?.id)?.nome || "Barbeiro"
                  }
                  comissaoHoje={stats.agendamentosParaExibir
                    .filter((ag: any) => ag.status === "Finalizado" && ag.barbeiro_id === user?.id)
                    .reduce((sum: number, ag: any) => sum + Number(ag.comissao_ganha || 0), 0)}
                  cortesHoje={stats.agendamentosParaExibir
                    .filter((ag: any) => ag.status === "Finalizado" && ag.barbeiro_id === user?.id).length}
                />
              )}

              {tab === "dono" && (
                <VisaoDono
                  faturamentoHoje={stats.faturamentoHoje}
                  faturamentoMensal={stats.faturamentoMensal}
                  comissoesAPagarHoje={stats.comissoesAPagarHoje}
                  lucroRealHoje={stats.faturamentoHoje - stats.comissoesAPagarHoje}
                  comissaoPorBarbeiroHoje={comissaoPorBarbeiroHoje}
                  barbeiros={barbeiros}
                  servicos={servicos}
                  corPrimaria={marca}
                  onAddBarbeiro={(
                    nome: string,
                    comissao_pct: number,
                    email: string,
                    senha: string,
                  ) =>
                    mutacoesBarbeiro.adicionarBarbeiro.mutate({
                      nome,
                      comissao_pct,
                      email,
                      senha,
                      slug,
                    })
                  }
                  onRemoveBarbeiro={(id: string) => {
                    const b = barbeiros.find((x: any) => x.id === id);
                    mutacoesBarbeiro.removerBarbeiro.mutate({
                      id,
                      estaAtivo: b?.ativo,
                      slug,
                    });
                  }}
                  onToggleBarbeiroStatus={(id: string, novoStatus: boolean) =>
                    mutacoesBarbeiro.alternarStatusBarbeiro.mutate({
                      id,
                      novoStatus,
                      slug,
                    })
                  }
                  onAddServico={(nome: string, preco: number, duracao_minutos: number) =>
                    mutacoesServico.adicionarServico.mutate({ nome, preco, duracao_minutos, slug })
                  }
                  onRemoveServico={(id: string) =>
                    mutacoesServico.removerServico.mutate({ id, slug })
                  }
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <nav className="fixed bottom-0 w-full border-t border-white/[0.08] bg-black/40 backdrop-blur-xl flex justify-around p-2 shadow-2xl z-20 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {visibleTabs.map((t) => (
            <motion.button
              key={t.id}
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => goTab(t.id)}
              className={cn(
                "flex flex-col items-center p-2 transition-colors duration-300 outline-none rounded-xl",
                tab === t.id ? "font-bold scale-110" : "text-white/45",
              )}
              style={tab === t.id ? { color: marca } : undefined}
            >
              <t.icon className="h-6 w-6" />
              <span className="text-[10px] mt-1 uppercase tracking-tighter">{t.label}</span>
            </motion.button>
          ))}
        </nav>
        <TermosDeUso />
      </div>
    </div>
  );
}