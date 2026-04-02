import { useState, useMemo, useEffect } from "react";
import { Scissors, LayoutDashboard, LogOut, Wallet, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { VisaoBarbeiro } from "@/components/VisaoBarbeiro";
import { VisaoDono } from "@/components/VisaoDono";
import { CarteiraBarbeiro } from "@/components/CarteiraBarbeiro";
import { Button } from "@/components/ui/button";
import { TermosDeUso } from "@/components/TermosDeUso"; // ✅ IMPORTADO

// 🚀 NOSSAS GAVETAS DO REACT QUERY
import { 
  useBarbearia, useBarbeiros, useServicos, useDespesas, useAgendamentos,
  useMutacoesBarbeiro, useMutacoesServico, useMutacoesDespesa, useMutacoesAgendamento
} from "@/hooks/useQueries";

// 🔥 FUNÇÃO BLINDADA: Pega YYYY-MM-DD local
const getLocalDate = () => {
  const agora = new Date();
  const y = agora.getFullYear();
  const m = String(agora.getMonth() + 1).padStart(2, '0');
  const d = String(agora.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function Index() {
  const [tab, setTab] = useState<"barbeiro" | "dono" | "carteira">("barbeiro");
  const [dataFiltro, setDataFiltro] = useState<string>(getLocalDate());
  const [barbeiroSelecionadoId, setBarbeiroSelecionadoId] = useState<string>("");

  const { signOut, userRole, user } = useAuth();

  // 1. CARREGANDO OS DADOS
  const { data: barbearia, isLoading: loadingBarbearia } = useBarbearia();
  const slug = barbearia?.slug;
  const isDono = barbearia?.isDono;

  const { data: barbeiros = [], isLoading: loadingBarbeiros } = useBarbeiros(slug);
  const { data: servicos = [], isLoading: loadingServicos } = useServicos(slug);
  const { data: agendamentos = [], isLoading: loadingAgendamentos } = useAgendamentos(slug);
  const { data: despesas = [], isLoading: loadingDespesas } = useDespesas(isDono ? slug : undefined);

  // 2. MUTAÇÕES
  const mutacoesBarbeiro = useMutacoesBarbeiro();
  const mutacoesServico = useMutacoesServico();
  const mutacoesDespesa = useMutacoesDespesa();
  const mutacoesAgendamento = useMutacoesAgendamento();

  // Ajusta o barbeiro selecionado inicial
  useEffect(() => {
    if (barbeiros.length > 0 && !barbeiroSelecionadoId) {
      const defaultBarber = barbeiros.find((b: any) => b.id === user?.id) || barbeiros[0];
      setBarbeiroSelecionadoId(defaultBarber.id);
    }
  }, [barbeiros, user?.id, barbeiroSelecionadoId]);

  // --- 📊 LÓGICA FINANCEIRA E FILTROS ---
  const { 
    faturamentoHoje, 
    faturamentoMensal, 
    comissoesAPagarHoje, 
    gastosHoje, 
    agendamentosParaExibir, 
    agMesBarbeiro 
  } = useMemo(() => {
    const hoje = getLocalDate();
    const prefixoMes = hoje.substring(0, 7);

    const noDia = agendamentos.filter((ag: any) => ag.data === dataFiltro) || [];
    
    const agParaExibir = isDono 
      ? (barbeiroSelecionadoId ? noDia.filter(ag => ag.barbeiro_id === barbeiroSelecionadoId) : noDia)
      : noDia.filter((ag: any) => ag.barbeiro_id === user?.id);

    const noMesGeral = agendamentos.filter((ag: any) => 
      ag.data.startsWith(prefixoMes) && ag.status === "Finalizado"
    );

    const fatHoje = noDia.filter((ag: any) => ag.status === "Finalizado")
      .reduce((sum: number, ag: any) => {
        const preco = servicos.find((s: any) => s.id === ag.servico_id)?.preco || 0;
        return sum + Number(preco);
      }, 0);
    
    const fatMensal = noMesGeral.reduce((sum: number, ag: any) => {
      const preco = servicos.find((s: any) => s.id === ag.servico_id)?.preco || 0;
      return sum + Number(preco);
    }, 0);

    const comissoes = noDia.filter((ag: any) => ag.status === "Finalizado")
      .reduce((sum: number, ag: any) => sum + Number(ag.comissao_ganha || 0), 0);
    
    const gastos = despesas.filter((d: any) => d.data === dataFiltro)
      .reduce((sum: number, d: any) => sum + Number(d.valor || 0), 0);

    const mesBarbeiro = agendamentos.filter((ag: any) => 
      ag.barbeiro_id === user?.id && 
      ag.data.startsWith(prefixoMes) && 
      ag.status === "Finalizado"
    );

    return { 
      faturamentoHoje: fatHoje, 
      faturamentoMensal: fatMensal,
      comissoesAPagarHoje: comissoes, 
      gastosHoje: gastos, 
      agendamentosParaExibir: agParaExibir, 
      agMesBarbeiro: mesBarbeiro 
    };
  }, [agendamentos, servicos, despesas, dataFiltro, isDono, user?.id, barbeiroSelecionadoId]);

  const comissaoPorBarbeiroHoje = barbeiros.map((b: any) => {
    const cortesDoBarbeiro = agendamentos.filter(ag => ag.data === dataFiltro && ag.barbeiro_id === b.id && ag.status === "Finalizado");
    return {
      barbeiro: b,
      total: cortesDoBarbeiro.reduce((sum, ag) => sum + Number(ag.comissao_ganha || 0), 0),
      cortes: cortesDoBarbeiro.length
    };
  });

  const horariosOcupados = (data: string, bId: string) => 
    agendamentos.filter((ag: any) => ag.data === data && ag.barbeiro_id === bId && ag.status !== "Cancelado").map((ag: any) => ag.horario);

  const servicos_find = (id: string) => servicos.find((s: any) => s.id === id);

  const isLoading = loadingBarbearia || loadingBarbeiros || loadingServicos || loadingAgendamentos || (isDono && loadingDespesas);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center dark bg-background text-primary font-bold gap-4">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <p className="tracking-widest animate-pulse uppercase">Sincronizando Agenda...</p>
      </div>
    );
  }

  const visibleTabs = userRole === "barbeiro" ? [
    { id: "barbeiro", label: "Agenda", icon: Scissors },
    { id: "carteira", label: "Carteira", icon: Wallet }
  ] : [
    { id: "barbeiro", label: "Agenda", icon: Scissors },
    { id: "dono", label: "Dashboard", icon: LayoutDashboard }
  ];

  return (
    <div className="dark min-h-screen bg-background text-foreground flex flex-col">
      <header className="p-4 border-b flex justify-between items-center bg-card">
        <div className="flex items-center gap-3">
          <img src="/safeimagekit-resized-logoempresaCAJsemfundo.png" alt="Logo" className="h-9 w-auto" />
          <h1 className="font-bold text-lg tracking-tight">CAJ TECH</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="h-5 w-5"/></Button>
      </header>

      {tab !== "carteira" && (
        <div className="bg-card border-b p-3 flex items-center justify-center gap-3 sticky top-0 z-10">
          <div className="relative flex items-center">
            <Calendar className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input 
              type="date" 
              value={dataFiltro}
              onChange={(e) => setDataFiltro(e.target.value)}
              className="bg-background border rounded-full pl-9 pr-4 py-1.5 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all color-scheme-dark"
            />
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            className="rounded-full px-4 h-9 text-xs font-bold uppercase"
            onClick={() => setDataFiltro(getLocalDate())}
          >
            Hoje
          </Button>
        </div>
      )}

      <main className="flex-1 p-4 pb-24 max-w-lg mx-auto w-full">
        {tab === "barbeiro" && (
          <VisaoBarbeiro
            barbeiros={barbeiros} 
            servicos={servicos}
            agendamentos={agendamentosParaExibir}
            barbeiroSelecionadoId={barbeiroSelecionadoId}
            setBarbeiroSelecionadoId={setBarbeiroSelecionadoId}
            horariosOcupados={horariosOcupados}
            servicos_find={servicos_find}
            isDono={isDono}
            onNovoAgendamento={(ag: any) => mutacoesAgendamento.adicionarAgendamento.mutateAsync({ ag, slug })}
            onStatusChange={(id: string, status: string) => {
              if (status === "Finalizado") {
                const agAtual = agendamentos.find((a: any) => a.id === id);
                const servico = servicos_find(agAtual?.servico_id);
                const barbeiro = barbeiros.find((b: any) => b.id === agAtual?.barbeiro_id);
                const valorComissao = (Number(servico?.preco || 0) * Number(barbeiro?.comissao_pct || 0)) / 100;
                return mutacoesAgendamento.atualizarStatusAgendamento.mutateAsync({ id, status: "Finalizado", comissaoGanha: valorComissao });
              }
              return mutacoesAgendamento.atualizarStatusAgendamento.mutateAsync({ id, status });
            }}
          />
        )}

        {tab === "carteira" && (
          <CarteiraBarbeiro 
            comissaoTotalMes={agMesBarbeiro.reduce((sum: number, ag: any) => sum + Number(ag.comissao_ganha || 0), 0)}
            totalCortesMes={agMesBarbeiro.length}
            nomeBarbeiro={barbeiros.find((b: any) => b.id === user?.id)?.nome || "Barbeiro"}
          />
        )}

        {tab === "dono" && (
          <VisaoDono
            faturamentoHoje={faturamentoHoje}
            faturamentoMensal={faturamentoMensal} 
            comissoesAPagarHoje={comissoesAPagarHoje}
            despesasNoDia={gastosHoje}
            lucroRealHoje={faturamentoHoje - comissoesAPagarHoje - gastosHoje}
            comissaoPorBarbeiroHoje={comissaoPorBarbeiroHoje}
            barbeiros={barbeiros}
            servicos={servicos}
            despesas={despesas}
            dataFiltro={dataFiltro}
            onAddDespesa={(nova: any) => mutacoesDespesa.adicionarDespesa.mutate({ nova, slug })}
            onRemoveDespesa={(id: string) => mutacoesDespesa.removerDespesa.mutate(id)}
            onAddBarbeiro={(nome: string, comissao: number, email: string, senha: string) => 
              mutacoesBarbeiro.adicionarBarbeiro.mutate({ nome, comissao, email, senha, slug })}
            onRemoveBarbeiro={(id: string) => mutacoesBarbeiro.removerBarbeiro.mutate(id)}
            onAddServico={(nome: string, preco: number) => mutacoesServico.adicionarServico.mutate({ nome, preco, slug })}
            onRemoveServico={(id: string) => mutacoesServico.removerServico.mutate(id)}
          />
        )}
      </main>

      <nav className="fixed bottom-0 w-full bg-card border-t flex justify-around p-2 shadow-2xl z-20">
        {visibleTabs.map(t => (
          <button 
            key={t.id} 
            onClick={() => setTab(t.id as any)} 
            className={cn(
              "flex flex-col items-center p-2 transition-all duration-300", 
              tab === t.id ? "text-primary scale-110 font-bold" : "text-muted-foreground opacity-60"
            )}
          >
            <t.icon className="h-6 w-6"/><span className="text-[10px] mt-1 uppercase tracking-tighter">{t.label}</span>
          </button>
        ))}
      </nav>

      {/* ✅ MODAL DE TERMOS E COMPROMISSO */}
      <TermosDeUso />
    </div>
  );
}