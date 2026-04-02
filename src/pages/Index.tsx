import { useState, useMemo } from "react";
import { Scissors, LayoutDashboard, LogOut, Wallet, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { VisaoBarbeiro } from "@/components/VisaoBarbeiro";
import { VisaoDono } from "@/components/VisaoDono";
import { CarteiraBarbeiro } from "@/components/CarteiraBarbeiro";
import { Button } from "@/components/ui/button";

// 🚀 IMPORTANDO NOSSAS GAVETAS DO REACT QUERY
import { 
  useBarbearia, useBarbeiros, useServicos, useDespesas, useAgendamentos,
  useMutacoesBarbeiro, useMutacoesServico, useMutacoesDespesa, useMutacoesAgendamento
} from "@/hooks/useQueries";

const getLocalDate = () => {
  const data = new Date();
  data.setMinutes(data.getMinutes() - data.getTimezoneOffset());
  return data.toISOString().split("T")[0];
};

export default function Index() {
  const [tab, setTab] = useState<"barbeiro" | "dono" | "carteira">("barbeiro");
  const [dataFiltro, setDataFiltro] = useState<string>(getLocalDate());
  const [barbeiroSelecionadoId, setBarbeiroSelecionadoId] = useState<string>("");

  const { signOut, userRole, user } = useAuth();

  // 1. CARREGANDO OS DADOS COM REACT QUERY
  const { data: barbearia, isLoading: loadingBarbearia } = useBarbearia();
  const slug = barbearia?.slug;
  const isDono = barbearia?.isDono;

  const { data: barbeiros = [], isLoading: loadingBarbeiros } = useBarbeiros(slug);
  const { data: servicos = [], isLoading: loadingServicos } = useServicos(slug);
  const { data: agendamentos = [], isLoading: loadingAgendamentos } = useAgendamentos(slug);
  
  // O Barbeiro não precisa baixar despesas, economizando internet!
  const { data: despesas = [], isLoading: loadingDespesas } = useDespesas(isDono ? slug : undefined);

  // 2. MUTAÇÕES (AÇÕES DE SALVAR/DELETAR)
  const mutacoesBarbeiro = useMutacoesBarbeiro();
  const mutacoesServico = useMutacoesServico();
  const mutacoesDespesa = useMutacoesDespesa();
  const mutacoesAgendamento = useMutacoesAgendamento();

  // Ajusta o barbeiro selecionado inicial
  if (barbeiros.length > 0 && !barbeiroSelecionadoId) {
    const defaultBarber = barbeiros.find((b: any) => b.id === user?.id) || barbeiros[0];
    setBarbeiroSelecionadoId(defaultBarber.id);
  }

  // --- LÓGICA FINANCEIRA (Memorizada para não recalcular a toa) ---
  const { 
    agendamentosNoDia, faturamentoHoje, comissoesAPagarHoje, gastosHoje, agendamentosBarbeiroHoje, agMes 
  } = useMemo(() => {
    const noDia = agendamentos.filter((ag: any) => ag.data === dataFiltro) || [];
    
    const faturamento = noDia.filter((ag: any) => ag.status === "Finalizado")
      .reduce((sum: number, ag: any) => sum + Number(servicos.find((s: any) => s.id === ag.servico_id)?.preco || 0), 0);
    
    const comissoes = noDia.filter((ag: any) => ag.status === "Finalizado")
      .reduce((sum: number, ag: any) => sum + Number(ag.comissao_ganha || 0), 0);
    
    const gastos = despesas.filter((d: any) => d.data === dataFiltro)
      .reduce((sum: number, d: any) => sum + Number(d.valor || 0), 0);

    const agBarbeiroHoje = isDono ? noDia : noDia.filter((ag: any) => ag.barbeiro_id === user?.id);
    const mes = agendamentos.filter((ag: any) => ag.barbeiro_id === user?.id && ag.status === "Finalizado");

    return { 
      agendamentosNoDia: noDia, faturamentoHoje: faturamento, comissoesAPagarHoje: comissoes, 
      gastosHoje: gastos, agendamentosBarbeiroHoje: agBarbeiroHoje, agMes: mes 
    };
  }, [agendamentos, servicos, despesas, dataFiltro, isDono, user?.id]);

  const comissaoPorBarbeiroHoje = barbeiros.map((b: any) => ({
    barbeiro: b,
    total: agendamentosNoDia.filter((ag: any) => ag.barbeiro_id === b.id && ag.status === "Finalizado").reduce((sum: number, ag: any) => sum + Number(ag.comissao_ganha || 0), 0),
    cortes: agendamentosNoDia.filter((ag: any) => ag.barbeiro_id === b.id && ag.status === "Finalizado").length
  }));

  const horariosOcupados = (data: string, bId: string) => 
    agendamentos.filter((ag: any) => ag.data === data && ag.barbeiro_id === bId && ag.status !== "Cancelado").map((ag: any) => ag.horario);

  const servicos_find = (id: string) => servicos.find((s: any) => s.id === id);


  // --- RENDERIZAÇÃO ---
  const isLoading = loadingBarbearia || loadingBarbeiros || loadingServicos || loadingAgendamentos || (isDono && loadingDespesas);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center dark bg-background text-primary font-bold gap-4">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <p className="tracking-widest animate-pulse">CAJ TECH...</p>
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
              className="bg-background border rounded-full pl-9 pr-4 py-1.5 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            className="rounded-full px-4 h-9"
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
            agendamentosBarbeiroHoje={agendamentosBarbeiroHoje}
            barbeiroSelecionadoId={barbeiroSelecionadoId}
            setBarbeiroSelecionadoId={setBarbeiroSelecionadoId}
            horariosOcupados={horariosOcupados}
            servicos_find={servicos_find}
            onNovoAgendamento={(ag: any) => mutacoesAgendamento.adicionarAgendamento.mutateAsync({ ag, slug })}
            onFinalizar={(id: string) => {
              const agAtual = agendamentos.find((a: any) => a.id === id);
              const servico = servicos_find(agAtual?.servico_id);
              const barbeiro = barbeiros.find((b: any) => b.id === agAtual?.barbeiro_id);
              const valorComissao = (Number(servico?.preco || 0) * Number(barbeiro?.comissao_pct || 0)) / 100;
              return mutacoesAgendamento.atualizarStatusAgendamento.mutateAsync({ id, status: "Finalizado", comissaoGanha: valorComissao });
            }}
            onCancelar={(id: string) => mutacoesAgendamento.atualizarStatusAgendamento.mutateAsync({ id, status: "Cancelado" })}
          />
        )}

        {tab === "carteira" && (
          <CarteiraBarbeiro 
            comissaoTotalMes={agMes.reduce((sum: number, ag: any) => sum + Number(ag.comissao_ganha || 0), 0)}
            totalCortesMes={agMes.length}
            nomeBarbeiro={barbeiros.find((b: any) => b.id === user?.id)?.nome || "Barbeiro"}
          />
        )}

        {tab === "dono" && (
          <VisaoDono
            faturamentoHoje={faturamentoHoje}
            comissoesAPagarHoje={comissoesAPagarHoje}
            despesasNoDia={gastosHoje}
            lucroRealHoje={faturamentoHoje - comissoesAPagarHoje - gastosHoje}
            cortesRealizadosHoje={agendamentosNoDia.filter((ag: any) => ag.status === "Finalizado").length}
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
            <t.icon className="h-6 w-6"/><span className="text-[10px] mt-1">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}