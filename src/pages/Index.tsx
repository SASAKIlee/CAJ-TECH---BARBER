import { useState, useMemo, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Scissors, LayoutDashboard, LogOut, Wallet, Calendar, RefreshCw, User, Loader2 } from "lucide-react";
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
import { toast } from "sonner";

import {
  useBarbearia, useBarbeiros, useServicos, useAgendamentos,
  useMutacoesBarbeiro, useMutacoesServico, useMutacoesAgendamento
} from "@/hooks/useQueries";

// ==========================================
// TIPAGENS (substituindo any)
// ==========================================
interface Barbeiro {
  id: string;
  nome: string;
  comissao_pct: number;
  ativo: boolean;
  url_foto?: string | null;
  meta_diaria?: number;
}

interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao_minutos: number;
  url_imagem?: string | null;
}

interface Agendamento {
  id: string;
  data: string;
  horario: string;
  nome_cliente: string;
  telefone_cliente: string;
  barbeiro_id: string;
  servico_id: string;
  status: string;
  comissao_ganha: number;
  barbearia_slug: string;
}

interface Barbearia {
  id: string;
  slug: string;
  nome: string;
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
  url_fundo?: string | null;
  isDono?: boolean;
  ativo?: boolean;
  plano?: string;
}

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================
const getLocalDate = (): string => {
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

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
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

  const carregandoDependentes = !!slug && (barbeirosQuery.isLoading || servicosQuery.isLoading || agendamentosQuery.isLoading);
  const buscandoDependentes = !!slug && (barbeirosQuery.isFetching || servicosQuery.isFetching || agendamentosQuery.isFetching);
  const erroDependentes = !!slug && (barbeirosQuery.isError || servicosQuery.isError || agendamentosQuery.isError);
  const temErroDados = barbeariaQueryEnabled && (erroBarbearia || erroDependentes);
  const buscandoAlgumaQuery = barbeariaQueryEnabled && (fetchingBarbearia || buscandoDependentes);
  const exibirSkeleton = barbeariaQueryEnabled && ((!temErroDados && (loadingBarbearia || carregandoDependentes)) || (temErroDados && buscandoAlgumaQuery));

  const mutacoesBarbeiro = useMutacoesBarbeiro();
  const mutacoesServico = useMutacoesServico();
  const mutacoesAgendamento = useMutacoesAgendamento();

  // ==========================================
  // MEMOS E CALLBACKS ESTABILIZADOS
  // ==========================================
  const refetchDadosPrincipais = useCallback(async () => {
    await refetchBarbearia();
    if (slug) {
      await Promise.all([refetchBarbeiros(), refetchServicos(), refetchAgendamentos()]);
    }
  }, [slug, refetchBarbearia, refetchBarbeiros, refetchServicos, refetchAgendamentos]);

  const servicos_find = useCallback((id: string) => servicos.find((s) => s.id === id), [servicos]);

  const horariosOcupados = useCallback((data: string, bId: string) => {
    return agendamentos
      .filter((ag: Agendamento) => ag.data === data && ag.barbeiro_id === bId && ag.status !== "Cancelado")
      .map((ag: Agendamento) => ag.horario);
  }, [agendamentos]);

  const tituloErroCarregamento = useMemo(() => {
    const msg = erroBarbearia
      ? mensagemDeErro(erroDetalheBarbearia)
      : mensagemDeErro(barbeirosQuery.error ?? servicosQuery.error ?? agendamentosQuery.error);
    return msg.includes("Nenhuma barbearia") ? "Nenhuma barbearia vinculada" : "Erro de conexão";
  }, [erroBarbearia, erroDetalheBarbearia, barbeirosQuery.error, servicosQuery.error, agendamentosQuery.error]);

  const mensagemErroCarregamento = useMemo(() => {
    if (erroBarbearia) return mensagemDeErro(erroDetalheBarbearia);
    return mensagemDeErro(barbeirosQuery.error ?? servicosQuery.error ?? agendamentosQuery.error);
  }, [erroBarbearia, erroDetalheBarbearia, barbeirosQuery.error, servicosQuery.error, agendamentosQuery.error]);

  const visibleTabs = useMemo(() => {
    return userRole === "barbeiro"
      ? [
          { id: "barbeiro" as const, label: "Agenda", icon: Scissors },
          { id: "carteira" as const, label: "Carteira", icon: Wallet },
        ]
      : [
          { id: "barbeiro" as const, label: "Agenda", icon: Scissors },
          { id: "dono" as const, label: "Dashboard", icon: LayoutDashboard },
        ];
  }, [userRole]);

  const stats = useMemo(() => {
    const hoje = getLocalDate();
    const prefixoMes = hoje.substring(0, 7);
    const noDia = agendamentos.filter((ag: Agendamento) => ag.data === dataFiltro);
    const idParaFiltrar = isDono ? barbeiroSelecionadoId : user?.id;

    const agParaExibir = idParaFiltrar
      ? noDia.filter((ag: Agendamento) => ag.barbeiro_id === idParaFiltrar)
      : noDia;

    const fatHoje = noDia
      .filter((ag: Agendamento) => ag.status === "Finalizado")
      .reduce((sum, ag) => sum + Number(servicos_find(ag.servico_id)?.preco || 0), 0);

    const fatMensal = agendamentos
      .filter((ag: Agendamento) => ag.data.startsWith(prefixoMes) && ag.status === "Finalizado")
      .reduce((sum, ag) => sum + Number(servicos_find(ag.servico_id)?.preco || 0), 0);

    const comissoesHoje = noDia
      .filter((ag: Agendamento) => ag.status === "Finalizado")
      .reduce((sum, ag) => sum + Number(ag.comissao_ganha || 0), 0);

    const agMesMeuBarbeiro = agendamentos.filter(
      (ag: Agendamento) =>
        ag.barbeiro_id === user?.id && ag.data.startsWith(prefixoMes) && ag.status === "Finalizado"
    );

    return {
      faturamentoHoje: fatHoje,
      faturamentoMensal: fatMensal,
      comissoesAPagarHoje: comissoesHoje,
      agendamentosParaExibir: agParaExibir,
      agMesBarbeiro: agMesMeuBarbeiro,
    };
  }, [agendamentos, servicos_find, dataFiltro, isDono, user?.id, barbeiroSelecionadoId]);

  const comissaoPorBarbeiroHoje = useMemo(() => {
    return barbeiros.map((b: Barbeiro) => {
      const cortes = agendamentos.filter(
        (ag: Agendamento) =>
          ag.data === dataFiltro && ag.barbeiro_id === b.id && ag.status === "Finalizado"
      );
      return {
        barbeiro: b,
        total: cortes.reduce((sum, ag) => sum + Number(ag.comissao_ganha || 0), 0),
        cortes: cortes.length,
      };
    });
  }, [barbeiros, agendamentos, dataFiltro]);

  // ==========================================
  // CORREÇÃO: Ajuste da assinatura para compatibilidade com VisaoBarbeiro
  // ==========================================
  const handleNovoAgendamento = useCallback(
    async (ag: Partial<Agendamento>): Promise<{ error?: any }> => {
      if (!slug) return { error: "Slug não definido" };
      try {
        const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await mutacoesAgendamento.adicionarAgendamento.mutateAsync({ ag, slug, idempotencyKey });
        return {};
      } catch (error: any) {
        return { error };
      }
    },
    [mutacoesAgendamento, slug]
  );

  const handleStatusChange = useCallback(
    (id: string, status: string) => {
      if (!slug) return Promise.reject("Slug não definido");
      if (status === "Finalizado") {
        const agAtual = agendamentos.find((a) => a.id === id);
        const servico = servicos_find(agAtual?.servico_id);
        const barbeiro = barbeiros.find((b) => b.id === agAtual?.barbeiro_id);
        const valorComissao = (Number(servico?.preco || 0) * Number(barbeiro?.comissao_pct || 0)) / 100;
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
    },
    [agendamentos, servicos_find, barbeiros, mutacoesAgendamento, slug]
  );

  const goTab = useCallback(
    (next: "barbeiro" | "dono" | "carteira") => {
      const order: string[] = userRole === "barbeiro" ? ["barbeiro", "carteira"] : ["barbeiro", "dono"];
      const oi = order.indexOf(tab);
      const ni = order.indexOf(next);
      if (oi !== -1 && ni !== -1 && oi !== ni) setTabSlideDir(ni > oi ? 1 : -1);
      setTab(next);
    },
    [tab, userRole]
  );

  // ==========================================
  // CONFIRMAÇÃO DE LOGOUT
  // ==========================================
  const handleSignOut = useCallback(() => {
    if (confirm("Deseja realmente sair?")) {
      signOut();
    }
  }, [signOut]);

  // ==========================================
  // INDICADORES DE CARREGAMENTO NAS MUTAÇÕES (via wrapper)
  // ==========================================
  const withLoadingToast = useCallback(
    async <T,>(promise: Promise<T>, messages: { loading: string; success: string; error: string }) => {
      const toastId = toast.loading(messages.loading);
      try {
        const result = await promise;
        toast.success(messages.success, { id: toastId });
        return result;
      } catch (error) {
        toast.error(messages.error, { id: toastId });
        throw error;
      }
    },
    []
  );

  const handleAddBarbeiro = useCallback(
    (nome: string, comissao_pct: number, email: string, senha: string, url_foto?: string) => {
      if (!slug) return Promise.reject("Slug não definido");
      return withLoadingToast(
        mutacoesBarbeiro.adicionarBarbeiro.mutateAsync({ nome, comissao_pct, email, senha, url_foto, slug }),
        { loading: "Cadastrando barbeiro...", success: "Barbeiro cadastrado!", error: "Erro ao cadastrar." }
      );
    },
    [mutacoesBarbeiro, slug, withLoadingToast]
  );

  const handleRemoveBarbeiro = useCallback(
    (id: string) => {
      if (!slug) return Promise.reject("Slug não definido");
      const b = barbeiros.find((x) => x.id === id);
      return withLoadingToast(
        mutacoesBarbeiro.removerBarbeiro.mutateAsync({ id, estaAtivo: b?.ativo, slug }),
        { loading: "Removendo barbeiro...", success: "Barbeiro removido!", error: "Erro ao remover." }
      );
    },
    [barbeiros, mutacoesBarbeiro, slug, withLoadingToast]
  );

  const handleToggleBarbeiroStatus = useCallback(
    (id: string, novoStatus: boolean) => {
      if (!slug) return Promise.reject("Slug não definido");
      return withLoadingToast(
        mutacoesBarbeiro.alternarStatusBarbeiro.mutateAsync({ id, novoStatus, slug }),
        { loading: "Alterando status...", success: "Status atualizado!", error: "Erro ao alterar." }
      );
    },
    [mutacoesBarbeiro, slug, withLoadingToast]
  );

  const handleAddServico = useCallback(
    (nome: string, preco: number, duracao_minutos: number, url_imagem?: string) => {
      if (!slug) return Promise.reject("Slug não definido");
      return withLoadingToast(
        mutacoesServico.adicionarServico.mutateAsync({ nome, preco, duracao_minutos, url_imagem, slug }),
        { loading: "Cadastrando serviço...", success: "Serviço cadastrado!", error: "Erro ao cadastrar." }
      );
    },
    [mutacoesServico, slug, withLoadingToast]
  );

  const handleRemoveServico = useCallback(
    (id: string) => {
      if (!slug) return Promise.reject("Slug não definido");
      return withLoadingToast(
        mutacoesServico.removerServico.mutateAsync({ id, slug }),
        { loading: "Removendo serviço...", success: "Serviço removido!", error: "Erro ao remover." }
      );
    },
    [mutacoesServico, slug, withLoadingToast]
  );

  // ==========================================
  // EFEITOS
  // ==========================================
  useEffect(() => {
    if (userRole !== "ceo") return;

    async function buscarDadosHQ() {
      const { data: vends } = await supabase.from("perfis_vendedores").select("*").eq("ativo", true);
      const { data: lojas } = await supabase.from("barbearias").select("*");

      const totalLojasReal = lojas?.length || 0;
      const listaVendedores = vends?.map((v: any) => ({ id: v.id, nome: v.nome, total_lojas: 0 })) || [];

      setDadosCEO({ lojas: totalLojasReal, faturamento: totalLojasReal * 50, vendedores: listaVendedores });
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

  // ==========================================
  // RENDERIZAÇÕES CONDICIONAIS
  // ==========================================
  if (userRole === "ceo") {
    return (
      <div className="dark min-h-screen bg-black text-white flex flex-col">
        <header className="p-4 border-b border-white/[0.08] flex justify-between items-center bg-black/40 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            <img src="/safeimagekit-resized-logoempresaCAJsemfundo.png" alt="Logo" className="h-9 w-auto" />
            <h1 className="font-bold text-lg tracking-tight italic text-white">CAJ TECH HQ</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-white/80 hover:text-white">
            <LogOut className="h-5 w-5" />
          </Button>
        </header>
        <main className="flex-1 max-w-7xl mx-auto w-full px-0 sm:px-4 md:px-8">
          <VisaoCEO totalLojas={dadosCEO.lojas} faturamentoTotal={dadosCEO.faturamento} vendedores={dadosCEO.vendedores} />
        </main>
        <div className="p-8 text-center bg-black mt-auto">
          <p className="text-zinc-800 text-[8px] font-black uppercase tracking-[0.5em]">Sistema Criptografado</p>
        </div>
      </div>
    );
  }

  if (userRole === "vendedor") {
    return (
      <div className="dark min-h-screen bg-black text-white flex flex-col">
        <header className="p-4 border-b border-white/[0.08] flex justify-between items-center bg-black/40 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            <img src="/safeimagekit-resized-logoempresaCAJsemfundo.png" alt="Logo" className="h-9 w-auto" />
            <h1 className="font-bold text-lg tracking-tight italic text-white">CAJ TECH</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-white/80 hover:text-white">
            <LogOut className="h-5 w-5" />
          </Button>
        </header>
        <main className="flex-1 max-w-7xl mx-auto w-full px-0 sm:px-4 md:px-8">
          <VisaoVendedor />
        </main>
        <TermosDeUso />
      </div>
    );
  }

  if (barbeariaQueryEnabled && exibirSkeleton) {
    const skeletonTab = tab === "dono" || tab === "carteira" || tab === "barbeiro" ? tab : "barbeiro";
    return <IndexPageSkeleton tab={skeletonTab} />;
  }

  if (barbeariaQueryEnabled && temErroDados) {
    return (
      <DataLoadError
        title={tituloErroCarregamento}
        message={mensagemErroCarregamento}
        onRetry={() => void refetchDadosPrincipais()}
        onSignOut={handleSignOut}
      />
    );
  }

  const heroImageUrl = (barbearia?.url_fundo && String(barbearia.url_fundo).trim()) || APP_HERO_FALLBACK_BG;
  const marca = barbearia?.cor_primaria?.trim() || "#D4AF37";

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
            <img src="/safeimagekit-resized-logoempresaCAJsemfundo.png" alt="Logo" className="h-9 w-auto" />
            <h1 className="font-bold text-lg tracking-tight italic text-white">CAJ TECH</h1>
          </div>
          <div className="flex items-center gap-2">
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="icon"
                className="text-white/80 hover:text-white"
                onClick={() => {
                  toast.promise(refetchDadosPrincipais(), {
                    loading: "Atualizando dados...",
                    success: "Dados atualizados!",
                    error: "Erro ao atualizar.",
                  });
                }}
              >
                <RefreshCw className="h-5 w-5" />
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button variant="ghost" size="icon" className="text-white/80 hover:text-white" onClick={handleSignOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </motion.div>
          </div>
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
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full px-4 h-8 text-[10px] font-bold uppercase border-white/[0.1] bg-white/[0.08] text-white hover:bg-white/[0.12]"
                onClick={() => setDataFiltro(getLocalDate())}
              >
                Hoje
              </Button>
            </motion.div>

            {/* SELETOR DE BARBEIRO PARA DONOS */}
            {isDono && barbeiros.length > 0 && (
              <div className="flex items-center gap-2 ml-2">
                <User className="h-4 w-4 text-white/50" />
                <select
                  value={barbeiroSelecionadoId}
                  onChange={(e) => setBarbeiroSelecionadoId(e.target.value)}
                  className="rounded-full border border-white/[0.12] bg-black/35 px-3 py-1 text-sm outline-none focus:ring-1 focus:ring-white/30 color-scheme-dark text-white backdrop-blur-sm"
                >
                  <option value="">Todos os barbeiros</option>
                  {barbeiros.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {agendamentosQuery.isFetching && <Loader2 className="h-4 w-4 animate-spin text-white/50" />}
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
                  onNovoAgendamento={handleNovoAgendamento}
                  onStatusChange={handleStatusChange}
                />
              )}

              {tab === "carteira" && (
                <CarteiraBarbeiro
                  comissaoTotalMes={stats.agMesBarbeiro.reduce((sum, ag) => sum + Number(ag.comissao_ganha || 0), 0)}
                  totalCortesMes={stats.agMesBarbeiro.length}
                  nomeBarbeiro={barbeiros.find((b) => b.id === user?.id)?.nome || "Barbeiro"}
                  comissaoHoje={stats.agendamentosParaExibir
                    .filter((ag) => ag.status === "Finalizado" && ag.barbeiro_id === user?.id)
                    .reduce((sum, ag) => sum + Number(ag.comissao_ganha || 0), 0)}
                  cortesHoje={stats.agendamentosParaExibir.filter((ag) => ag.status === "Finalizado" && ag.barbeiro_id === user?.id).length}
                  metaDiaria={barbeiros.find((b) => b.id === user?.id)?.meta_diaria || 150}
                  onUpdateMeta={(novaMeta: number) => {
                    if (user?.id && slug) {
                      withLoadingToast(
                        mutacoesBarbeiro.atualizarMetaBarbeiro.mutateAsync({ id: user.id, meta: novaMeta, slug }),
                        { loading: "Salvando meta...", success: "Meta atualizada!", error: "Erro ao salvar." }
                      );
                    }
                  }}
                />
              )}

              {tab === "dono" && (
                <VisaoDono
                  faturamentoHoje={stats.faturamentoHoje}
                  faturamentoMensal={stats.faturamentoMensal}
                  comissoesAPagarHoje={stats.comissoesAPagarHoje}
                  lucroRealHoje={stats.faturamentoHoje - stats.comissoesAPagarHoje}
                  despesasNoDia={0}
                  comissaoPorBarbeiroHoje={comissaoPorBarbeiroHoje}
                  barbeiros={barbeiros}
                  servicos={servicos}
                  corPrimaria={marca}
                  onAddBarbeiro={handleAddBarbeiro}
                  onRemoveBarbeiro={handleRemoveBarbeiro}
                  onToggleBarbeiroStatus={handleToggleBarbeiroStatus}
                  onAddServico={handleAddServico}
                  onRemoveServico={handleRemoveServico}
                  onAddDespesa={(despesa: any) => {
                    console.log("Despesa a salvar:", despesa);
                    toast.info("Conecte a tabela 'despesas' no seu Supabase e no arquivo de hooks para salvar!");
                  }}
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
                tab === t.id ? "font-bold scale-110" : "text-white/45"
              )}
              style={tab === t.id ? { color: marca } : undefined}
              aria-label={t.label}
              role="tab"
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