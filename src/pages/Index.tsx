import { lazy, Suspense, useState, useMemo, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Scissors, LayoutDashboard, LogOut, Wallet, Calendar, RefreshCw, User, Loader2, Eye, X } from "lucide-react";
import { AppHeroBackdrop, APP_HERO_FALLBACK_BG } from "@/components/AppHeroBackdrop";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { VisaoBarbeiro } from "@/components/VisaoBarbeiro";
import { CarteiraBarbeiro } from "@/components/CarteiraBarbeiro";
import { IndexPageSkeleton } from "@/components/IndexPageSkeleton";
import { DataLoadError } from "@/components/DataLoadError";
import { Button } from "@/components/ui/button";
import { TermosDeUso } from "@/components/TermosDeUso";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  useBarbearia, useBarbeiros, useServicos, useAgendamentos,
  useMutacoesBarbeiro, useMutacoesServico, useMutacoesAgendamento, useClientesVIP
} from "@/hooks/useQueries";
import { useDonoData } from "@/hooks/useDonoData";
import type { AgendamentoInsert } from "@/types/queries";
import type { PlanoType } from "@/types/dono";
import { DonoModalRenovacao } from "@/components/dono/DonoModalRenovacao";

// Lazy load
const VisaoDono = lazy(() => import("@/components/VisaoDono").then(m => ({ default: m.VisaoDono })));
const VisaoVendedor = lazy(() => import("@/components/VisaoVendedor").then(m => ({ default: m.VisaoVendedor })));
const VisaoCEO = lazy(() => import("@/components/VisaoCEO").then(m => ({ default: m.VisaoCEO })));

// ==========================================
// TIPAGENS (atualizadas)
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
  checkin_habilitado?: boolean;
  data_vencimento?: string | null;
}

interface ImpersonateData {
  barbearia: Barbearia & { isDono: true };
  barbeiros: Barbeiro[];
  servicos: Servico[];
  agendamentos: Agendamento[];
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

function ImpersonationBanner({
  isImpersonating,
  impersonateName,
  onExit
}: {
  isImpersonating: boolean;
  impersonateName: string | null;
  onExit: () => void;
}) {
  if (!isImpersonating) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-30 bg-gradient-to-r from-yellow-600 to-amber-600 text-white px-4 py-2 flex items-center justify-between shadow-lg"
    >
      <div className="flex items-center gap-2 text-sm font-bold">
        <Eye className="h-4 w-4" />
        <span>Vendo como dono de "{impersonateName}"</span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        onClick={onExit}
        className="text-white hover:bg-white/20 h-8 px-3 text-xs font-bold uppercase gap-1"
      >
        <X className="h-3 w-3" /> Sair
      </Button>
    </motion.div>
  );
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function Index() {
  const { signOut, userRole, user } = useAuth();

  const {
    data: donoData,
    pixGerado,
    setPixGerado,
    tempoPix,
    setTempoPix,
  } = useDonoData();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [modalRenovacaoAberto, setModalRenovacaoAberto] = useState(false);
  const [isGerandoPix, setIsGerandoPix] = useState(false);
  const [planoPagamento, setPlanoPagamento] = useState<PlanoType>("pro");

  const [impersonateSlug, setImpersonateSlug] = useState<string | null>(() =>
    localStorage.getItem("ceo_impersonate_slug")
  );
  const [impersonateName, setImpersonateName] = useState<string | null>(() =>
    localStorage.getItem("ceo_impersonate_name")
  );
  const [impersonateData, setImpersonateData] = useState<ImpersonateData | null>(null);
  const [loadingImpersonate, setLoadingImpersonate] = useState(false);

  const [tab, setTab] = useState<"barbeiro" | "dono" | "carteira" | "vendedor">("barbeiro");
  const [tabSlideDir, setTabSlideDir] = useState(1);
  const [dataFiltro, setDataFiltro] = useState<string>(getLocalDate());
  const [barbeiroSelecionadoId, setBarbeiroSelecionadoId] = useState<string>("");
  const [dadosCEO, setDadosCEO] = useState({ lojas: 0, faturamento: 0, vendedores: [] });

  const isImpersonating = userRole === "ceo" && !!impersonateSlug;

  const sairImpersonacao = useCallback(() => {
    localStorage.removeItem("ceo_impersonate_slug");
    localStorage.removeItem("ceo_impersonate_name");
    setImpersonateSlug(null);
    setImpersonateName(null);
    setImpersonateData(null);
    toast.info("Saindo do modo de visualização...");
  }, []);

  useEffect(() => {
    if (!isImpersonating || !impersonateSlug) return;

    const controller = new AbortController();
    setLoadingImpersonate(true);

    (async () => {
      try {
        const { data: barbearia } = await supabase
          .from("barbearias")
          .select("*")
          .eq("slug", impersonateSlug)
          .abortSignal(controller.signal)
          .single();

        if (!barbearia) {
          toast.error("Barbearia não encontrada.");
          sairImpersonacao();
          return;
        }

        const [barbsRes, servsRes, agendsRes] = await Promise.all([
          supabase.from("barbeiros").select("*").eq("barbearia_slug", impersonateSlug).eq("ativo", true).abortSignal(controller.signal),
          supabase.from("servicos").select("*").eq("barbearia_slug", impersonateSlug).abortSignal(controller.signal),
          supabase
            .from("agendamentos")
            .select("*")
            .eq("barbearia_slug", impersonateSlug)
            .gte("data", `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`)
            .order("horario")
            .abortSignal(controller.signal)
        ]);

        setImpersonateData({
          barbearia: {
            ...barbearia,
            isDono: true,
            cor_primaria: barbearia.cor_primaria?.trim() || "#D4AF37",
            cor_secundaria: barbearia.cor_secundaria?.trim() || "#18181B",
          },
          barbeiros: barbsRes.data || [],
          servicos: servsRes.data || [],
          agendamentos: agendsRes.data || [],
        });
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error("Erro ao carregar dados da barbearia:", err);
        toast.error("Erro ao carregar dados da barbearia.");
      } finally {
        setLoadingImpersonate(false);
      }
    })();

    return () => controller.abort();
  }, [impersonateSlug, isImpersonating, sairImpersonacao]);

  const barbeariaQueryEnabled = !isImpersonating && userRole !== "ceo" && userRole !== "vendedor";

  const {
    data: barbearia,
    isLoading: loadingBarbearia,
    isError: erroBarbearia,
    error: erroDetalheBarbearia,
    isFetching: fetchingBarbearia,
    refetch: refetchBarbearia,
  } = useBarbearia({ enabled: barbeariaQueryEnabled });

  const loadingBarbeariaSafe = isImpersonating ? loadingImpersonate : loadingBarbearia;
  const erroBarbeariaSafe = isImpersonating ? false : erroBarbearia;
  const erroDetalheBarbeariaSafe = isImpersonating ? null : erroDetalheBarbearia;
  const fetchingBarbeariaSafe = isImpersonating ? loadingImpersonate : fetchingBarbearia;

  const slug = isImpersonating ? impersonateSlug : barbearia?.slug;
  const isDono = isImpersonating ? true : barbearia?.isDono;

  const barbeirosQuery = useBarbeiros(isImpersonating ? undefined : slug);
  const servicosQuery = useServicos(isImpersonating ? undefined : slug);
  const agendamentosQuery = useAgendamentos(isImpersonating ? undefined : slug);
  const clientesVIPQuery = useClientesVIP(user?.id);

  const { data: barbeirosNormal = [], refetch: refetchBarbeiros } = barbeirosQuery;
  const { data: servicosNormal = [], refetch: refetchServicos } = servicosQuery;
  const { data: agendamentosNormal = [], refetch: refetchAgendamentos } = agendamentosQuery;
  const { data: clientesVIP = [] } = clientesVIPQuery;

  const barbeiros = useMemo(
    () => (isImpersonating ? impersonateData?.barbeiros || [] : barbeirosNormal),
    [isImpersonating, impersonateData?.barbeiros, barbeirosNormal]
  );
  const servicos = useMemo(
    () => (isImpersonating ? impersonateData?.servicos || [] : servicosNormal),
    [isImpersonating, impersonateData?.servicos, servicosNormal]
  );
  const agendamentos = useMemo(
    () => (isImpersonating ? impersonateData?.agendamentos || [] : agendamentosNormal),
    [isImpersonating, impersonateData?.agendamentos, agendamentosNormal]
  );

  const carregandoDependentes = !!slug && (barbeirosQuery.isLoading || servicosQuery.isLoading || agendamentosQuery.isLoading);
  const buscandoDependentes = !!slug && (barbeirosQuery.isFetching || servicosQuery.isFetching || agendamentosQuery.isFetching);
  const erroDependentes = !!slug && (barbeirosQuery.isError || servicosQuery.isError || agendamentosQuery.isError);
  const temErroDados = barbeariaQueryEnabled && (erroBarbeariaSafe || erroDependentes);
  const buscandoAlgumaQuery = barbeariaQueryEnabled && (fetchingBarbeariaSafe || buscandoDependentes);
  const exibirSkeleton = barbeariaQueryEnabled && ((!temErroDados && (loadingBarbeariaSafe || carregandoDependentes)) || (temErroDados && buscandoAlgumaQuery));

  const mutacoesBarbeiro = useMutacoesBarbeiro();
  const mutacoesServico = useMutacoesServico();
  const mutacoesAgendamento = useMutacoesAgendamento();

  const refetchDadosPrincipais = useCallback(async () => {
    if (!isImpersonating) {
      await refetchBarbearia();
    }
    if (slug && !isImpersonating) {
      await Promise.all([refetchBarbeiros(), refetchServicos(), refetchAgendamentos()]);
    }
  }, [slug, isImpersonating, refetchBarbearia, refetchBarbeiros, refetchServicos, refetchAgendamentos]);

  const servicos_find = useCallback((id: string) => servicos.find((s) => String(s.id) === String(id)), [servicos]);

  // 🔥 O ERRO 1 ESTAVA AQUI: Blindado com substring(0,10)
  const horariosOcupados = useCallback(
    (data: string, bId: string) =>
      agendamentos
        .filter((ag: Agendamento) => String(ag.data).substring(0, 10) === data && String(ag.barbeiro_id) === String(bId) && ag.status !== "Cancelado")
        .map((ag: Agendamento) => ag.horario),
    [agendamentos]
  );

  const tituloErroCarregamento = useMemo(() => {
    const msg = erroBarbeariaSafe
      ? mensagemDeErro(erroDetalheBarbeariaSafe)
      : mensagemDeErro(barbeirosQuery.error ?? servicosQuery.error ?? agendamentosQuery.error);
    return msg.includes("Nenhuma barbearia") ? "Nenhuma barbearia vinculada" : "Erro de conexão";
  }, [erroBarbeariaSafe, erroDetalheBarbeariaSafe, barbeirosQuery.error, servicosQuery.error, agendamentosQuery.error]);

  const mensagemErroCarregamento = useMemo(() => {
    if (erroBarbeariaSafe) return mensagemDeErro(erroDetalheBarbeariaSafe);
    return mensagemDeErro(barbeirosQuery.error ?? servicosQuery.error ?? agendamentosQuery.error);
  }, [erroBarbeariaSafe, erroDetalheBarbeariaSafe, barbeirosQuery.error, servicosQuery.error, agendamentosQuery.error]);

  const visibleTabs = useMemo(() => {
    if (isImpersonating) {
      return [
        { id: "barbeiro" as const, label: "Agenda", icon: Scissors },
        { id: "dono" as const, label: "Dashboard", icon: LayoutDashboard },
      ];
    }
    return userRole === "barbeiro"
      ? [
          { id: "barbeiro" as const, label: "Agenda", icon: Scissors },
          { id: "carteira" as const, label: "Carteira", icon: Wallet },
        ]
      : [
          { id: "barbeiro" as const, label: "Agenda", icon: Scissors },
          { id: "dono" as const, label: "Dashboard", icon: LayoutDashboard },
        ];
  }, [userRole, isImpersonating]);

  // 🔥 O ERRO 2 ESTAVA AQUI NAS STATS: Tudo blindado com substring(0,10)
  const stats = useMemo(() => {
    const hoje = getLocalDate();
    const prefixoMes = hoje.substring(0, 7);
    
    // Agora aceita a data mesmo vindo como T00:00:00 do banco
    const noDia = agendamentos.filter((ag: Agendamento) => String(ag.data).substring(0, 10) === dataFiltro);
    
    const idParaFiltrar = isDono ? barbeiroSelecionadoId : user?.id;

    const agParaExibir = idParaFiltrar
      ? noDia.filter((ag: Agendamento) => String(ag.barbeiro_id) === String(idParaFiltrar))
      : noDia;

    const fatHoje = noDia
      .filter((ag: Agendamento) => ag.status === "Finalizado")
      .reduce((sum, ag) => sum + Number(servicos_find(ag.servico_id)?.preco || 0), 0);

    const fatMensal = agendamentos
      .filter((ag: Agendamento) => String(ag.data).substring(0, 10).startsWith(prefixoMes) && ag.status === "Finalizado")
      .reduce((sum, ag) => sum + Number(servicos_find(ag.servico_id)?.preco || 0), 0);

    const comissoesHoje = noDia
      .filter((ag: Agendamento) => ag.status === "Finalizado")
      .reduce((sum, ag) => sum + Number(ag.comissao_ganha || 0), 0);

    const agMesMeuBarbeiro = agendamentos.filter(
      (ag: Agendamento) =>
        String(ag.barbeiro_id) === String(user?.id) && 
        String(ag.data).substring(0, 10).startsWith(prefixoMes) && 
        ag.status === "Finalizado"
    );

    return {
      faturamentoHoje: fatHoje,
      faturamentoMensal: fatMensal,
      comissoesAPagarHoje: comissoesHoje,
      agendamentosParaExibir: agParaExibir,
      agMesBarbeiro: agMesMeuBarbeiro,
    };
  }, [agendamentos, servicos_find, dataFiltro, isDono, user?.id, barbeiroSelecionadoId]);

  // 🔥 O ERRO 3 ESTAVA AQUI: Filtro do barbeiro
  const comissaoPorBarbeiroHoje = useMemo(() => {
    return barbeiros.map((b: Barbeiro) => {
      const cortes = agendamentos.filter(
        (ag: Agendamento) =>
          String(ag.data).substring(0, 10) === dataFiltro && 
          String(ag.barbeiro_id) === String(b.id) && 
          ag.status === "Finalizado"
      );
      return {
        barbeiro: b,
        total: cortes.reduce((sum, ag) => sum + Number(ag.comissao_ganha || 0), 0),
        cortes: cortes.length,
      };
    });
  }, [barbeiros, agendamentos, dataFiltro]);

  const handleNovoAgendamento = useCallback(
    async (ag: Partial<Agendamento>): Promise<{ error?: unknown }> => {
      if (!slug) return { error: "Slug não definido" };
      try {
        const idempotencyKey = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await mutacoesAgendamento.adicionarAgendamento.mutateAsync({
          ag: [ag as unknown as AgendamentoInsert],
          slug,
          idempotencyKey
        });
        return {};
      } catch (error) {
        return { error };
      }
    },
    [mutacoesAgendamento, slug]
  );

  const handleStatusChange = useCallback(
    (id: string, status: string) => {
      if (!slug) return Promise.reject("Slug não definido");
      if (status === "Finalizado") {
        const agAtual = agendamentos.find((a) => String(a.id) === String(id));
        const servico = servicos_find(agAtual?.servico_id || "");
        const barbeiro = barbeiros.find((b) => String(b.id) === String(agAtual?.barbeiro_id));
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
      const order = userRole === "barbeiro" ? ["barbeiro", "carteira"] : ["barbeiro", "dono"];
      const oi = order.indexOf(tab);
      const ni = order.indexOf(next);
      if (oi !== -1 && ni !== -1 && oi !== ni) setTabSlideDir(ni > oi ? 1 : -1);
      setTab(next);
    },
    [tab, userRole]
  );

  const handleSignOut = useCallback(async () => {
    if (isSigningOut) return;
    if (!confirm("Deseja realmente sair?")) return;
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  }, [signOut, isSigningOut]);

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
      const b = barbeiros.find((x) => String(x.id) === String(id));
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
  // CALLBACKS DE PAGAMENTO
  // ==========================================
  const handleGerarPix = useCallback(async () => {
    if (!user?.id) return;
    setPixGerado(null);
    setIsGerandoPix(true);
    try {
      const plano = donoData.planoAtual || "pro";
      const { data: barbeariaData } = await supabase
        .from("barbearias")
        .select("id")
        .eq("dono_id", user.id)
        .single();
      if (!barbeariaData) throw new Error("Barbearia não encontrada");

      const { data: fnData, error: fnError } = await supabase.functions.invoke("mercado-pago-pix", {
        body: {
          barbearia_id: barbeariaData.id,
          plano,
          email_dono: user.email || "financeiro@cajtech.net.br",
        },
      });

      if (fnError) throw new Error(fnError.message);

      const payload = fnData as any;
      const brCode = payload.qr_code || payload.br_code || payload.copiaECola || payload.pix_copy_paste;
      if (!brCode) throw new Error("Resposta sem código PIX");

      setPixGerado(brCode);
      setTempoPix(900);
      toast.success("PIX gerado! Copie o código.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsGerandoPix(false);
    }
  }, [user, donoData.planoAtual, setPixGerado, setTempoPix]);

  const handleCopiarPix = useCallback(() => {
    if (pixGerado) {
      navigator.clipboard.writeText(pixGerado);
      toast.success("Código PIX copiado!");
    }
  }, [pixGerado]);

  const handleRenovacaoClick = useCallback(() => {
    setPlanoPagamento((donoData.planoAtual as PlanoType) || "pro");
    setModalRenovacaoAberto(true);
  }, [donoData.planoAtual]);

  const getValorPlano = useCallback((plano: PlanoType) => {
    const valores: Record<PlanoType, number> = { starter: 35, pro: 50, elite: 497 };
    return valores[plano] || 50;
  }, []);

  useEffect(() => {
    if (userRole !== "ceo" || isImpersonating) return;
    const controller = new AbortController();
    (async () => {
      const [vendsRes, lojasRes] = await Promise.all([
        supabase.from("perfis_vendedores").select("*").eq("ativo", true).abortSignal(controller.signal),
        supabase.from("barbearias").select("*").abortSignal(controller.signal)
      ]);
      if (controller.signal.aborted) return;
      setDadosCEO({
        lojas: lojasRes.data?.length || 0,
        faturamento: (lojasRes.data?.length || 0) * 50,
        vendedores: vendsRes.data?.map((v) => ({ id: v.id, nome: v.nome, total_lojas: 0 })) || []
      });
    })();
    return () => controller.abort();
  }, [userRole, isImpersonating]);

  useEffect(() => {
    if (!barbeariaQueryEnabled) return;
    if (!isDono && user?.id) {
      setBarbeiroSelecionadoId(user.id);
    } else if (isDono) {
      setBarbeiroSelecionadoId(prev => {
        if (prev && barbeiros.some(b => String(b.id) === String(prev))) return prev;
        return "";
      });
    }
  }, [barbeariaQueryEnabled, isDono, user?.id, barbeiros]);

  // ==========================================
  // VERIFICAÇÃO DE BLOQUEIO
  // ==========================================
  const hojeDate = new Date();
  let dataVenc: Date | null = null;
  const vencRaw = (barbearia as any)?.data_vencimento; 
  if (vencRaw) {
    const parsed = new Date(String(vencRaw));
    if (!isNaN(parsed.getTime())) {
      dataVenc = parsed;
    }
  }
  const vencida = dataVenc ? dataVenc < hojeDate : false;
  const lojaBloqueada = donoData.isLojaAtiva === false || vencida || donoData.fasePagamento === 4;

  // ==========================================
  // RENDERIZAÇÃO
  // ==========================================
  if (userRole === "ceo" && !isImpersonating) {
    return (
      <div className="dark min-h-screen bg-black text-white flex flex-col">
        <header className="p-3 sm:p-4 border-b border-white/[0.08] flex justify-between items-center bg-black/40 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src="/safeimagekit-resized-logoempresaCAJsemfundo.png" alt="Logo" className="h-8 sm:h-9 w-auto" />
            <h1 className="font-bold text-base sm:text-lg tracking-tight italic text-white">CAJ TECH HQ</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="text-white/80 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </header>
        <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-4 md:px-6">
          <Suspense fallback={<IndexPageSkeleton tab="dono" />}>
            <VisaoCEO
              totalLojas={dadosCEO.lojas}
              faturamentoTotal={dadosCEO.faturamento}
              vendedores={dadosCEO.vendedores}
            />
          </Suspense>
        </main>
        <div className="p-6 sm:p-8 text-center bg-black mt-auto">
          <p className="text-zinc-800 text-[8px] font-black uppercase tracking-[0.5em]">Sistema Criptografado</p>
        </div>
      </div>
    );
  }

  if (userRole === "vendedor") {
    return (
      <div className="dark min-h-screen bg-black text-white flex flex-col">
        <header className="p-3 sm:p-4 border-b border-white/[0.08] flex justify-between items-center bg-black/40 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src="/safeimagekit-resized-logoempresaCAJsemfundo.png" alt="Logo" className="h-8 sm:h-9 w-auto" />
            <h1 className="font-bold text-base sm:text-lg tracking-tight italic text-white">CAJ TECH</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="text-white/80 hover:text-white"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </header>
        <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-4 md:px-6">
          <Suspense fallback={<IndexPageSkeleton tab="dono" />}>
            <VisaoVendedor />
          </Suspense>
        </main>
        <TermosDeUso />
      </div>
    );
  }

  if (barbeariaQueryEnabled && exibirSkeleton) {
    const skeletonTab = tab === "dono" || tab === "carteira" || tab === "barbeiro" ? tab : "barbeiro";
    return <IndexPageSkeleton tab={skeletonTab} aria-busy="true" />;
  }

  if (isImpersonating && loadingImpersonate) {
    return <IndexPageSkeleton tab="dono" />;
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

  const heroImageUrl =
    ((isImpersonating ? impersonateData?.barbearia?.url_fundo : barbearia?.url_fundo) &&
      String(isImpersonating ? impersonateData?.barbearia?.url_fundo : barbearia?.url_fundo).trim()) ||
    APP_HERO_FALLBACK_BG;
  const marca = (isImpersonating ? impersonateData?.barbearia?.cor_primaria : barbearia?.cor_primaria)?.trim() || "#D4AF37";

  const tabPanelVariants = {
    enter: (dir: number) => ({ x: dir * 52, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir * -52, opacity: 0 }),
  };

  return (
    <div className="dark min-h-screen relative isolate text-foreground flex flex-col overflow-x-hidden">
      <AppHeroBackdrop imageUrl={heroImageUrl} />
      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="p-3 sm:p-4 border-b border-white/[0.08] flex justify-between items-center bg-black/35 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <img src="/safeimagekit-resized-logoempresaCAJsemfundo.png" alt="Logo" className="h-8 sm:h-9 w-auto" />
            <h1 className="font-bold text-base sm:text-lg tracking-tight italic text-white">CAJ TECH</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="icon"
                className="text-white/80 hover:text-white h-9 w-9 sm:h-10 sm:w-10"
                onClick={() => {
                  toast.promise(refetchDadosPrincipais(), {
                    loading: "Atualizando dados...",
                    success: "Dados atualizados!",
                    error: "Erro ao atualizar.",
                  });
                }}
              >
                <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="icon"
                className="text-white/80 hover:text-white h-9 w-9 sm:h-10 sm:w-10"
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </motion.div>
          </div>
        </header>

        <ImpersonationBanner
          isImpersonating={isImpersonating}
          impersonateName={impersonateName}
          onExit={sairImpersonacao}
        />

        {tab !== "carteira" && (
          <div className="border-b border-white/[0.08] px-2 sm:px-4 py-2 flex items-center gap-2 sticky top-0 z-10 w-full shrink-0 bg-black/80 backdrop-blur-xl overflow-x-auto hide-scrollbar">
            <div className="flex items-center gap-1.5 bg-zinc-800/70 rounded-lg border border-white/[0.08] px-2.5 py-2 backdrop-blur-sm shrink-0">
              <Calendar className="h-4 w-4 text-zinc-400" />
              <input
                type="date"
                value={dataFiltro}
                onChange={(e) => setDataFiltro(e.target.value)}
                className="bg-transparent text-[11px] sm:text-sm outline-none text-white font-medium w-[115px] sm:w-auto"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-lg px-3 sm:px-4 h-9 sm:h-10 text-[9px] sm:text-[10px] font-bold uppercase border-white/[0.08] bg-white/[0.06] text-zinc-300 hover:bg-white/[0.1] hover:text-white shrink-0 cursor-pointer"
                onClick={() => setDataFiltro(getLocalDate())}
              >
                Hoje
              </Button>
            </motion.div>

            {isDono && barbeiros.length > 0 && (
              <div className="flex items-center gap-1.5 bg-zinc-800/70 rounded-lg border border-white/[0.08] px-2.5 py-2 backdrop-blur-sm shrink-0">
                <User className="h-4 w-4 text-zinc-400" />
                <select
                  value={barbeiroSelecionadoId}
                  onChange={(e) => setBarbeiroSelecionadoId(e.target.value)}
                  className="bg-transparent text-[11px] sm:text-sm outline-none text-zinc-300 min-w-[100px] sm:min-w-[130px] appearance-none pr-5 font-medium"
                  style={{ colorScheme: 'dark' }}
                >
                  <option value="" className="bg-zinc-900 text-zinc-300">Todos</option>
                  {barbeiros.map((b) => (
                    <option key={b.id} value={b.id} className="bg-zinc-900 text-zinc-300">
                      {b.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {agendamentosQuery.isFetching && <Loader2 className="h-4 w-4 animate-spin text-zinc-500 shrink-0" />}
          </div>
        )}

        <main className="flex-1 p-3 sm:p-4 md:p-6 pb-28 max-w-7xl mx-auto w-full flex flex-col min-h-0">
          {lojaBloqueada ? (
            <div className="flex flex-col items-center justify-center flex-1 h-full text-center px-4">
              <div className="bg-zinc-900 border border-red-500/30 p-8 rounded-2xl max-w-md w-full shadow-2xl">
                <Wallet className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-black text-white mb-2 uppercase italic tracking-tight">Assinatura Vencida</h2>
                <p className="text-zinc-400 text-sm mb-6">
                  O acesso ao painel da barbearia foi suspenso. Para continuar utilizando a plataforma e liberar o acesso aos seus barbeiros, renove sua assinatura.
                </p>
                <Button 
                  onClick={handleRenovacaoClick}
                  className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 text-black font-bold h-12 uppercase tracking-tight hover:brightness-110"
                >
                  Renovar Assinatura Agora
                </Button>
              </div>
            </div>
          ) : (
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
                    checkinHabilitado={barbearia?.checkin_habilitado || false}
                    planoAtual={(donoData.planoAtual as PlanoType) || "pro"}
                    pixGerado={pixGerado}
                    tempoPix={tempoPix}
                    isGerandoPix={isGerandoPix}
                    onGerarPix={handleGerarPix}
                    onCopiarPix={handleCopiarPix}
                    onRenovacaoClick={handleRenovacaoClick}
                    getValorPlano={getValorPlano}
                  />
                )}

                {tab === "carteira" && (
                  <CarteiraBarbeiro
                    comissaoTotalMes={stats.agMesBarbeiro.reduce((sum, ag) => sum + Number(ag.comissao_ganha || 0), 0)}
                    totalCortesMes={stats.agMesBarbeiro.length}
                    nomeBarbeiro={barbeiros.find((b) => String(b.id) === String(user?.id))?.nome || "Barbeiro"}
                    comissaoHoje={stats.agendamentosParaExibir
                      .filter((ag) => ag.status === "Finalizado" && String(ag.barbeiro_id) === String(user?.id))
                      .reduce((sum, ag) => sum + Number(ag.comissao_ganha || 0), 0)}
                    cortesHoje={stats.agendamentosParaExibir.filter((ag) => ag.status === "Finalizado" && String(ag.barbeiro_id) === String(user?.id)).length}
                    metaDiaria={barbeiros.find((b) => String(b.id) === String(user?.id))?.meta_diaria || 150}
                    clientesVIP={clientesVIP.length}
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
                  <Suspense fallback={<IndexPageSkeleton tab="dono" />}>
                    <>
                      {isImpersonating && (
                        <div className="mb-4 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-2 text-yellow-400 text-sm">
                          <Eye className="h-4 w-4 shrink-0" />
                          <span className="font-bold">Modo visualização - Alterações desabilitadas</span>
                        </div>
                      )}
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
                        onAddBarbeiro={isImpersonating ? undefined : handleAddBarbeiro}
                        onRemoveBarbeiro={isImpersonating ? undefined : handleRemoveBarbeiro}
                        onToggleBarbeiroStatus={isImpersonating ? undefined : handleToggleBarbeiroStatus}
                        onAddServico={isImpersonating ? undefined : handleAddServico}
                        onRemoveServico={isImpersonating ? undefined : handleRemoveServico}
                        onAddDespesa={isImpersonating ? undefined : (despesa: unknown) => {
                          console.log("Despesa a salvar:", despesa);
                          toast.info("Conecte a tabela 'despesas' no seu Supabase e no arquivo de hooks para salvar!");
                        }}
                      />
                    </>
                  </Suspense>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        {!lojaBloqueada && (
          <nav className="fixed bottom-0 w-full border-t border-white/[0.08] bg-black/40 backdrop-blur-xl flex justify-around p-2 shadow-2xl z-20 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {visibleTabs.map((t) => (
              <motion.button
                key={t.id}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => goTab(t.id)}
                className={cn(
                  "flex flex-col items-center p-1 sm:p-2 transition-colors duration-300 outline-none rounded-xl",
                  tab === t.id ? "font-bold scale-105 sm:scale-110" : "text-white/45"
                )}
                style={tab === t.id ? { color: marca } : undefined}
                aria-label={t.label}
                role="tab"
              >
                <t.icon className="h-6 w-6 sm:h-7 sm:w-7" />
                <span className="text-[9px] sm:text-[11px] mt-1 uppercase tracking-tighter">{t.label}</span>
              </motion.button>
            ))}
          </nav>
        )}
        <TermosDeUso />

        <DonoModalRenovacao
          open={modalRenovacaoAberto}
          onClose={() => setModalRenovacaoAberto(false)}
          planoAtual={planoPagamento}
          pixGerado={pixGerado}
          tempoPix={tempoPix}
          isGerandoPix={isGerandoPix}
          onGerarPix={handleGerarPix}
          onCopiarPix={handleCopiarPix}
        />
      </div>
    </div>
  );
}