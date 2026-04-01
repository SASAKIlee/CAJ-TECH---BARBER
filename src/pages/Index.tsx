import { useState } from "react";
import { Scissors, LayoutDashboard, LogOut, Wallet, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSupabaseStore } from "@/store/useSupabaseStore";
import { useAuth } from "@/contexts/AuthContext";
import { VisaoBarbeiro } from "@/components/VisaoBarbeiro";
import { VisaoDono } from "@/components/VisaoDono";
import { CarteiraBarbeiro } from "@/components/CarteiraBarbeiro";
import { Button } from "@/components/ui/button";

export default function Index() {
  const [tab, setTab] = useState<"barbeiro" | "dono" | "carteira">("barbeiro");
  const store = useSupabaseStore();
  const { signOut, userRole } = useAuth();

  const visibleTabs = userRole === "barbeiro" ? [
    { id: "barbeiro", label: "Agenda", icon: Scissors },
    { id: "carteira", label: "Carteira", icon: Wallet }
  ] : [
    { id: "barbeiro", label: "Agenda", icon: Scissors },
    { id: "dono", label: "Dashboard", icon: LayoutDashboard }
  ];

  if (store.loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center dark bg-background text-primary font-bold gap-4">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        <p className="tracking-widest animate-pulse">CAJ TECH...</p>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground flex flex-col">
      <header className="p-4 border-b flex justify-between items-center bg-card">
        <div className="flex items-center gap-3">
          <img src="/safeimagekit-resized-logoempresaCAJsemfundo.png" alt="Logo" className="h-9 w-auto" />
          <h1 className="font-bold text-lg tracking-tight">CAJ TECH</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="h-5 w-5"/></Button>
      </header>

      {/* SELETOR DE DATA */}
      {tab !== "carteira" && (
        <div className="bg-card border-b p-3 flex items-center justify-center gap-3 sticky top-0 z-10">
          <div className="relative flex items-center">
            <Calendar className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input 
              type="date" 
              value={store.dataFiltro}
              onChange={(e) => store.setDataFiltro(e.target.value)}
              className="bg-background border rounded-full pl-9 pr-4 py-1.5 text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            className="rounded-full px-4 h-9"
            onClick={() => store.setDataFiltro(new Date().toISOString().split('T')[0])}
          >
            Hoje
          </Button>
        </div>
      )}

      <main className="flex-1 p-4 pb-24 max-w-lg mx-auto w-full">
        {tab === "barbeiro" && (
          <VisaoBarbeiro
            barbeiros={store.barbeiros} 
            servicos={store.servicos}
            agendamentosBarbeiroHoje={store.agendamentosBarbeiroHoje}
            comissaoBarbeiroHoje={store.comissaoBarbeiroHoje}
            barbeiroSelecionadoId={store.barbeiroSelecionadoId}
            setBarbeiroSelecionadoId={store.setBarbeiroSelecionadoId}
            horariosOcupados={store.horariosOcupados}
            onNovoAgendamento={store.adicionarAgendamento}
            onFinalizar={store.finalizarAgendamento}
            onCancelar={store.cancelarAgendamento}
            servicos_find={store.servicos_find}
          />
        )}

        {tab === "carteira" && (
          <CarteiraBarbeiro 
            comissaoTotalMes={store.comissaoTotalMes}
            totalCortesMes={store.totalCortesMes}
            nomeBarbeiro={store.barbeiros_find(store.barbeiroSelecionadoId)?.nome || "Barbeiro"}
          />
        )}

        {tab === "dono" && (
          <VisaoDono
            faturamentoHoje={store.faturamentoHoje}
            comissoesAPagarHoje={store.comissoesAPagarHoje}
            despesasNoDia={store.despesasNoDia}
            lucroRealHoje={store.lucroRealHoje}
            cortesRealizadosHoje={store.cortesRealizadosHoje}
            comissaoPorBarbeiroHoje={store.comissaoPorBarbeiroHoje}
            barbeiros={store.barbeiros}
            servicos={store.servicos}
            despesas={store.despesas}
            dataFiltro={store.dataFiltro}
            onAddDespesa={store.adicionarDespesa}
            onRemoveDespesa={store.removerDespesa}
            onAddBarbeiro={(nome, comissao, email, senha) => {
              // Correção: Passando argumentos soltos para o store
              store.adicionarBarbeiro(nome, comissao, email, senha);
            }}
            onRemoveBarbeiro={store.removerBarbeiro}
            onAddServico={(nome, preco) => {
              // Correção: Passando argumentos soltos para o store
              store.adicionarServico(nome, preco);
            }}
            onRemoveServico={store.removerServico}
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