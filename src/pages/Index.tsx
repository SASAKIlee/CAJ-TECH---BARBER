import { lazy, Suspense, useState, useMemo, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Scissors, LayoutDashboard, LogOut, Wallet, Calendar, RefreshCw, User, Loader2, Eye, X, AlertTriangle } from "lucide-react";
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

const VisaoDono = lazy(() => import("@/components/VisaoDono").then(m => ({ default: m.VisaoDono })));
const VisaoVendedor = lazy(() => import("@/components/VisaoVendedor").then(m => ({ default: m.VisaoVendedor })));
const VisaoCEO = lazy(() => import("@/components/VisaoCEO").then(m => ({ default: m.VisaoCEO })));

interface Barbeiro { id: string; nome: string; comissao_pct: number; ativo: boolean; url_foto?: string | null; meta_diaria?: number; }
interface Servico { id: string; nome: string; preco: number; duracao_minutos: number; url_imagem?: string | null; }
interface Agendamento { id: string; data: string; horario: string; nome_cliente: string; telefone_cliente: string; barbeiro_id: string; servico_id: string; status: string; comissao_ganha: number; barbearia_slug: string; }
interface Barbearia { id: string; slug: string; nome: string; cor_primaria?: string | null; cor_secundaria?: string | null; url_fundo?: string | null; isDono?: boolean; ativo?: boolean; plano?: string; checkin_habilitado?: boolean; data_vencimento?: string | null; }

const getLocalDate = (): string => {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
};

export default function Index() {
  const { signOut, userRole, user } = useAuth();
  const { data: donoData, pixGerado, setPixGerado, tempoPix, setTempoPix } = useDonoData();

  const [isSigningOut, setIsSigningOut] = useState(false);
  const [modalRenovacaoAberto, setModalRenovacaoAberto] = useState(false);
  const [isGerandoPix, setIsGerandoPix] = useState(false);
  const [planoPagamento, setPlanoPagamento] = useState<PlanoType>("pro");

  const [tab, setTab] = useState<"barbeiro" | "dono" | "carteira" | "vendedor">("barbeiro");
  const [tabSlideDir, setTabSlideDir] = useState(1);
  const [dataFiltro, setDataFiltro] = useState<string>(getLocalDate());
  const [barbeiroSelecionadoId, setBarbeiroSelecionadoId] = useState<string>("");

  const barbeariaQueryEnabled = userRole !== "ceo" && userRole !== "vendedor";

  const { data: barbearia, isLoading: loadingBarbearia, refetch: refetchBarbearia } = useBarbearia({ enabled: barbeariaQueryEnabled });

  const slug = barbearia?.slug;
  const isDono = barbearia?.isDono;

  const barbeirosQuery = useBarbeiros(slug);
  const servicosQuery = useServicos(slug);
  const agendamentosQuery = useAgendamentos(slug);
  const clientesVIPQuery = useClientesVIP(user?.id);

  const barbeiros = barbeirosQuery.data || [];
  const servicos = servicosQuery.data || [];
  const agendamentos = agendamentosQuery.data || [];
  const clientesVIP = clientesVIPQuery.data || [];

  const mutacoesBarbeiro = useMutacoesBarbeiro();
  const mutacoesServico = useMutacoesServico();
  const mutacoesAgendamento = useMutacoesAgendamento();

  const refetchDadosPrincipais = useCallback(async () => {
    await refetchBarbearia();
    if (slug) await Promise.all([barbeirosQuery.refetch(), servicosQuery.refetch(), agendamentosQuery.refetch()]);
  }, [slug, refetchBarbearia, barbeirosQuery, servicosQuery, agendamentosQuery]);

  const servicos_find = useCallback((id: string) => servicos.find((s) => String(s.id) === String(id)), [servicos]);

  const horariosOcupados = useCallback((data: string, bId: string) =>
      agendamentos.filter((ag: Agendamento) => String(ag.data).substring(0, 10) === data && String(ag.barbeiro_id) === String(bId) && ag.status !== "Cancelado").map((ag: Agendamento) => ag.horario),
    [agendamentos]
  );

  const stats = useMemo(() => {
    const hoje = getLocalDate();
    const prefixoMes = hoje.substring(0, 7);
    
    const noDia = agendamentos.filter((ag: Agendamento) => {
      if (!ag.data) return false;
      return String(ag.data).split('T')[0] === String(dataFiltro).split('T')[0];
    });
    
    const idParaFiltrar = isDono ? barbeiroSelecionadoId : user?.id;

    const agParaExibir = (idParaFiltrar && idParaFiltrar !== "" && idParaFiltrar !== "all")
      ? noDia.filter((ag: Agendamento) => String(ag.barbeiro_id) === String(idParaFiltrar))
      : noDia;

    const agMesMeuBarbeiro = agendamentos.filter((ag: Agendamento) => String(ag.barbeiro_id) === String(user?.id) && String(ag.data).split('T')[0].startsWith(prefixoMes) && ag.status === "Finalizado");

    return {
      faturamentoHoje: noDia.filter((ag: Agendamento) => ag.status === "Finalizado").reduce((sum, ag) => sum + Number(servicos_find(ag.servico_id)?.preco || 0), 0),
      faturamentoMensal: agendamentos.filter((ag: Agendamento) => String(ag.data).split('T')[0].startsWith(prefixoMes) && ag.status === "Finalizado").reduce((sum, ag) => sum + Number(servicos_find(ag.servico_id)?.preco || 0), 0),
      comissoesAPagarHoje: noDia.filter((ag: Agendamento) => ag.status === "Finalizado").reduce((sum, ag) => sum + Number(ag.comissao_ganha || 0), 0),
      agendamentosParaExibir: agParaExibir, 
      agMesBarbeiro: agMesMeuBarbeiro,
    };
  }, [agendamentos, servicos_find, dataFiltro, isDono, user?.id, barbeiroSelecionadoId]);

  const handleNovoAgendamento = async (ag: Partial<Agendamento>) => {
    if (!slug) return { error: "Slug não definido" };
    try {
      await mutacoesAgendamento.adicionarAgendamento.mutateAsync({ ag: [ag as unknown as AgendamentoInsert], slug, idempotencyKey: globalThis.crypto?.randomUUID?.() ?? Date.now().toString() });
      return {};
    } catch (error) { return { error }; }
  };

  const handleStatusChange = async (id: string, status: string) => {
    if (!slug) return;
    if (status === "Finalizado") {
      const agAtual = agendamentos.find((a) => String(a.id) === String(id));
      const servico = servicos_find(agAtual?.servico_id || "");
      const barbeiro = barbeiros.find((b) => String(b.id) === String(agAtual?.barbeiro_id));
      const valorComissao = (Number(servico?.preco || 0) * Number(barbeiro?.comissao_pct || 0)) / 100;
      await mutacoesAgendamento.atualizarStatusAgendamento.mutateAsync({ id, status: "Finalizado", comissaoGanha: valorComissao, slug });
    } else {
      await mutacoesAgendamento.atualizarStatusAgendamento.mutateAsync({ id, status, slug });
    }
  };

  if (loadingBarbearia) return <IndexPageSkeleton tab="barbeiro" aria-busy="true" />;

  const marca = barbearia?.cor_primaria?.trim() || "#D4AF37";

  return (
    <div className="dark min-h-screen relative isolate text-foreground flex flex-col overflow-x-hidden">
      <AppHeroBackdrop imageUrl={barbearia?.url_fundo || APP_HERO_FALLBACK_BG} />
      <div className="relative z-10 flex flex-col min-h-screen">
        
        {/* ========================================================= */}
        {/* RAIO-X DE DEBUG - ISSO VAI MOSTRAR ONDE ESTÁ O ERRO       */}
        {/* ========================================================= */}
        <div className="bg-red-600 text-white font-mono text-xs p-4 w-full flex flex-col gap-1 border-b-4 border-red-900 shadow-2xl z-50 relative">
          <div className="flex items-center gap-2 font-black uppercase text-sm mb-2"><AlertTriangle className="h-5 w-5"/> MODO RAIO-X (DEBUG)</div>
          <p><b>Seu Slug na Loja:</b> "{slug}"</p>
          <p><b>Data no Calendário:</b> "{dataFiltro}"</p>
          <p><b>Agendamentos RECEBIDOS DO SUPABASE:</b> {agendamentos.length}</p>
          <p><b>Agendamentos PASSANDO PELO FILTRO:</b> {stats.agendamentosParaExibir.length}</p>
          <div className="mt-2 p-2 bg-black/30 rounded text-[10px] break-all max-h-24 overflow-y-auto">
            <b>Últimos do Banco:</b> {agendamentos.length > 0 ? JSON.stringify(agendamentos.slice(0,3).map(a => ({ nome: a.nome_cliente, data: a.data, slug: a.barbearia_slug }))) : "VAZIO. O banco de dados não devolveu nada para este slug."}
          </div>
        </div>
        {/* ========================================================= */}

        <header className="p-3 sm:p-4 border-b border-white/[0.08] flex justify-between items-center bg-black/35 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <h1 className="font-bold text-base sm:text-lg tracking-tight italic text-white">CAJ TECH</h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" className="text-white/80 hover:text-white" onClick={refetchDadosPrincipais}><RefreshCw className="h-5 w-5" /></Button>
            <Button variant="ghost" size="icon" className="text-white/80 hover:text-white" onClick={() => signOut()}><LogOut className="h-5 w-5" /></Button>
          </div>
        </header>

        <div className="border-b border-white/[0.08] px-2 sm:px-4 py-2 flex items-center gap-2 sticky top-0 z-10 w-full shrink-0 bg-black/80 backdrop-blur-xl overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-1.5 bg-zinc-800/70 rounded-lg border border-white/[0.08] px-2.5 py-2 backdrop-blur-sm shrink-0">
            <Calendar className="h-4 w-4 text-zinc-400" />
            <input type="date" value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)} className="bg-transparent text-[11px] sm:text-sm outline-none text-white font-medium" style={{ colorScheme: 'dark' }} />
          </div>

          <Button variant="secondary" size="sm" className="rounded-lg px-3 h-9 text-[10px] font-bold uppercase border-white/[0.08] bg-white/[0.06] text-zinc-300 hover:bg-white/[0.1] hover:text-white" onClick={() => setDataFiltro(getLocalDate())}>Hoje</Button>

          {isDono && barbeiros.length > 0 && (
            <div className="flex items-center gap-1.5 bg-zinc-800/70 rounded-lg border border-white/[0.08] px-2.5 py-2 backdrop-blur-sm shrink-0">
              <User className="h-4 w-4 text-zinc-400" />
              <select value={barbeiroSelecionadoId} onChange={(e) => setBarbeiroSelecionadoId(e.target.value)} className="bg-transparent text-[11px] sm:text-sm outline-none text-zinc-300 font-medium" style={{ colorScheme: 'dark' }}>
                <option value="all">Todos</option>
                {barbeiros.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
              </select>
            </div>
          )}
        </div>

        <main className="flex-1 p-3 sm:p-4 md:p-6 pb-28 max-w-7xl mx-auto w-full flex flex-col min-h-0">
          <VisaoBarbeiro
            barbeiros={barbeiros}
            servicos={servicos}
            agendamentos={stats.agendamentosParaExibir}
            barbeiroSelecionadoId={barbeiroSelecionadoId}
            setBarbeiroSelecionadoId={setBarbeiroSelecionadoId}
            horariosOcupados={horariosOcupados}
            servicos_find={servicos_find}
            isDono={isDono || false}
            corPrimaria={marca}
            onNovoAgendamento={handleNovoAgendamento}
            onStatusChange={handleStatusChange}
          />
        </main>
      </div>
    </div>
  );
}