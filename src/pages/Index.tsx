import { useState, useMemo, useEffect } from "react";
import { Scissors, LayoutDashboard, LogOut, Wallet, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { VisaoBarbeiro } from "@/components/VisaoBarbeiro";
import { VisaoDono } from "@/components/VisaoDono";
import { VisaoVendedor } from "@/components/VisaoVendedor"; // ✅ Importado
import { CarteiraBarbeiro } from "@/components/CarteiraBarbeiro";
import { Button } from "@/components/ui/button";
import { TermosDeUso } from "@/components/TermosDeUso";

import { 
  useBarbearia, useBarbeiros, useServicos, useAgendamentos,
  useMutacoesBarbeiro, useMutacoesServico, useMutacoesAgendamento
} from "@/hooks/useQueries";

const getLocalDate = () => {
  const agora = new Date();
  const y = agora.getFullYear();
  const m = String(agora.getMonth() + 1).padStart(2, '0');
  const d = String(agora.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function Index() {
  const { signOut, userRole, user } = useAuth();
  
  // 1. ESTADOS INICIAIS
  const [tab, setTab] = useState<"barbeiro" | "dono" | "carteira" | "vendedor">("barbeiro");
  const [dataFiltro, setDataFiltro] = useState<string>(getLocalDate());
  const [barbeiroSelecionadoId, setBarbeiroSelecionadoId] = useState<string>("");

  // -------------------------------------------------------------------------
  // 🛡️ BLOCO DE SEGURANÇA: SE FOR VENDEDOR, PARA TUDO E RENDERIZA A TELA DELE
  // -------------------------------------------------------------------------
  if (userRole === "vendedor") {
    return (
      <div className="dark min-h-screen bg-background text-foreground flex flex-col">
        {/* Header simplificado para o vendedor */}
        <header className="p-4 border-b flex justify-between items-center bg-card">
          <div className="flex items-center gap-3">
            <img src="/safeimagekit-resized-logoempresaCAJsemfundo.png" alt="Logo" className="h-9 w-auto" />
            <h1 className="font-bold text-lg tracking-tight italic">CAJ TECH</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={() => signOut()}><LogOut className="h-5 w-5"/></Button>
        </header>
        
        <main className="flex-1 max-w-lg mx-auto w-full">
           <VisaoVendedor 
             vendedorNome={user?.email?.split('@')[0] || "Consultor"} 
             clientesAtivos={[]} // No futuro, buscaremos do banco via vendedor_id
             prospectos={[]} 
           />
        </main>
        <TermosDeUso />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // 📊 CARREGAMENTO DE DADOS (Só acontece para Donos e Barbeiros)
  // -------------------------------------------------------------------------
  const { data: barbearia, isLoading: loadingBarbearia } = useBarbearia();
  const slug = barbearia?.slug;
  const isDono = barbearia?.isDono;

  const { data: barbeiros = [] } = useBarbeiros(slug);
  const { data: servicos = [] } = useServicos(slug);
  const { data: agendamentos = [] } = useAgendamentos(slug);

  const mutacoesBarbeiro = useMutacoesBarbeiro();
  const mutacoesServico = useMutacoesServico();
  const mutacoesAgendamento = useMutacoesAgendamento();

  useEffect(() => {
    if (!isDono && user?.id) {
      setBarbeiroSelecionadoId(user.id);
    } else if (isDono && barbeiros.length > 0 && !barbeiroSelecionadoId) {
      setBarbeiroSelecionadoId(""); 
    }
  }, [isDono, user?.id, barbeiros]);

  // Cálculos de estatísticas (Dashboard do Dono)
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

  // Tela de carregamento
  if (loadingBarbearia) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center dark bg-background text-primary font-bold gap-4">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <p className="tracking-widest animate-pulse uppercase text-sm">Sincronizando...</p>
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
          <h1 className="font-bold text-lg tracking-tight italic">CAJ TECH</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={() => signOut()}><LogOut className="h-5 w-5"/></Button>
      </header>

      {/* Filtro de Data (Escondido na carteira) */}
      {tab !== "carteira" && (
        <div className="bg-card border-b p-3 flex items-center justify-center gap-3 sticky top-0 z-10">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <input 
            type="date" 
            value={dataFiltro}
            onChange={(e) => setDataFiltro(e.target.value)}
            className="bg-background border rounded-full px-4 py-1 text-sm outline-none focus:ring-1 focus:ring-primary color-scheme-dark text-white"
          />
          <Button variant="secondary" size="sm" className="rounded-full px-4 h-8 text-[10px] font-bold uppercase" onClick={() => setDataFiltro(getLocalDate())}> Hoje </Button>
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL (Dono ou Barbeiro) */}
      <main className="flex-1 p-4 pb-24 max-w-lg mx-auto w-full">
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
            onNovoAgendamento={(ag: any) => mutacoesAgendamento.adicionarAgendamento.mutateAsync({ ag, slug })}
            onStatusChange={(id: string, status: string) => {
              if (status === "Finalizado") {
                const agAtual = agendamentos.find((a: any) => a.id === id);
                const servico = servicos_find(agAtual?.servico_id);
                const barbeiro = barbeiros.find((b: any) => b.id === agAtual?.barbeiro_id);
                const valorComissao = (Number(servico?.preco || 0) * Number(barbeiro?.comissao_pct || 0)) / 100;
                return mutacoesAgendamento.atualizarStatusAgendamento.mutateAsync({ id, status: "Finalizado", comissaoGanha: valorComissao, slug });
              }
              return mutacoesAgendamento.atualizarStatusAgendamento.mutateAsync({ id, status, slug });
            }}
          />
        )}

        {tab === "carteira" && (
          <CarteiraBarbeiro 
            comissaoTotalMes={stats.agMesBarbeiro.reduce((sum: number, ag: any) => sum + Number(ag.comissao_ganha || 0), 0)}
            totalCortesMes={stats.agMesBarbeiro.length}
            nomeBarbeiro={barbeiros.find((b: any) => b.id === user?.id)?.nome || "Barbeiro"}
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
            onAddBarbeiro={(nome: string, comissao_pct: number, email: string, senha: string) => 
              mutacoesBarbeiro.adicionarBarbeiro.mutate({ nome, comissao_pct, email, senha, slug })}
            onRemoveBarbeiro={(id: string) => {
              const b = barbeiros.find((x: any) => x.id === id);
              mutacoesBarbeiro.removerBarbeiro.mutate({ id, estaAtivo: b?.ativo, slug });
            }}
            onToggleBarbeiroStatus={(id: string, novoStatus: boolean) => 
              mutacoesBarbeiro.alternarStatusBarbeiro.mutate({ id, novoStatus, slug })}
            onAddServico={(nome: string, preco: number) => 
              mutacoesServico.adicionarServico.mutate({ nome, preco, slug })}
            onRemoveServico={(id: string) => 
              mutacoesServico.removerServico.mutate({ id, slug })}
          />
        )}
      </main>

      {/* NAVEGAÇÃO INFERIOR */}
      <nav className="fixed bottom-0 w-full bg-card border-t flex justify-around p-2 shadow-2xl z-20">
        {visibleTabs.map(t => (
          <button 
            key={t.id} 
            onClick={() => setTab(t.id as any)} 
            className={cn(
              "flex flex-col items-center p-2 transition-all duration-300 outline-none", 
              tab === t.id ? "text-primary scale-110 font-bold" : "text-muted-foreground opacity-60"
            )}
          >
            <t.icon className="h-6 w-6"/><span className="text-[10px] mt-1 uppercase tracking-tighter">{t.label}</span>
          </button>
        ))}
      </nav>
      <TermosDeUso />
    </div>
  );
}