import { useState } from "react";
import { Scissors, LayoutDashboard, ArrowLeft, Crown, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VisaoDono } from "@/components/VisaoDono";
import { VisaoBarbeiro } from "@/components/VisaoBarbeiro";
import {
  MOCK_BARBEIROS,
  MOCK_SERVICOS,
  MOCK_AGENDAMENTOS,
  MOCK_STATS,
  MOCK_COMISSAO_POR_BARBEIRO,
} from "@/lib/mock-data";

type DemoView = "menu" | "dono" | "barbeiro";

export default function Demo() {
  const [view, setView] = useState<DemoView>("menu");
  const [barbeiroSelecionadoId, setBarbeiroSelecionadoId] = useState("");

  // Funções mock que simulam ações (não salvam em lugar nenhum)
  const handleMockAction = (mensagem: string) => {
    alert(`[DEMONSTRAÇÃO] ${mensagem}\n\nNa versão real, esta ação seria salva no banco de dados.`);
  };

  // Menu de seleção de visão
  if (view === "menu") {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* Banner de Demonstração */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <Eye className="h-5 w-5 animate-pulse" />
            <span className="font-black uppercase tracking-widest text-sm">
              Modo Demonstração - Dados Temporários
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-4xl mx-auto w-full">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black uppercase italic tracking-tighter mb-2">
              CAJ TECH
            </h1>
            <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest">
              Escolha uma visão para demonstrar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
            {/* Card Visão Dono */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className="p-6 bg-zinc-900/50 border-zinc-800 cursor-pointer hover:border-emerald-500/50 transition-colors h-full"
                onClick={() => setView("dono")}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <LayoutDashboard className="h-7 w-7 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase italic text-emerald-400">
                      Visão Dono
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                      Painel Administrativo
                    </p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-emerald-500" /> Dashboard Financeiro
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-emerald-500" /> Gestão de Equipe
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-emerald-500" /> Agendamentos do Dia
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-emerald-500" /> Configurações
                  </li>
                </ul>
              </Card>
            </motion.div>

            {/* Card Visão Barbeiro */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className="p-6 bg-zinc-900/50 border-zinc-800 cursor-pointer hover:border-blue-500/50 transition-colors h-full"
                onClick={() => setView("barbeiro")}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-14 w-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <Scissors className="h-7 w-7 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase italic text-blue-400">
                      Visão Barbeiro
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                      Agenda Profissional
                    </p>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-zinc-400">
                  <li className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-blue-500" /> Agenda do Dia
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-blue-500" /> Minhas Comissões
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-blue-500" /> Finalizar Atendimentos
                  </li>
                  <li className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-blue-500" /> WhatsApp Rápido
                  </li>
                </ul>
              </Card>
            </motion.div>
          </div>

          <div className="mt-10 text-center">
            <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">
              Recarregue a página para limpar todos os dados temporários
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Visão Dono
  if (view === "dono") {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* Banner de Demonstração */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 animate-pulse" />
            <span className="font-black uppercase tracking-widest text-xs">
              Demonstração - Visão Dono
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("menu")}
            className="text-white hover:bg-white/20 gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          <VisaoDono
            faturamentoHoje={MOCK_STATS.faturamentoHoje}
            faturamentoMensal={MOCK_STATS.faturamentoMensal}
            comissoesAPagarHoje={MOCK_STATS.comissoesAPagarHoje}
            lucroRealHoje={MOCK_STATS.lucroRealHoje}
            comissaoPorBarbeiroHoje={MOCK_COMISSAO_POR_BARBEIRO}
            barbeiros={MOCK_BARBEIROS}
            servicos={MOCK_SERVICOS}
            corPrimaria="#10b981"
            onAddBarbeiro={() => handleMockAction("Novo barbeiro cadastrado!")}
            onRemoveBarbeiro={() => handleMockAction("Barbeiro removido!")}
            onToggleBarbeiroStatus={() => handleMockAction("Status do barbeiro alterado!")}
            onAddServico={() => handleMockAction("Novo serviço cadastrado!")}
            onRemoveServico={() => handleMockAction("Serviço removido!")}
          />
        </div>
      </div>
    );
  }

  // Visão Barbeiro
  if (view === "barbeiro") {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        {/* Banner de Demonstração */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 animate-pulse" />
            <span className="font-black uppercase tracking-widest text-xs">
              Demonstração - Visão Barbeiro
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("menu")}
            className="text-white hover:bg-white/20 gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          <VisaoBarbeiro
            barbeiros={MOCK_BARBEIROS}
            servicos={MOCK_SERVICOS}
            agendamentos={MOCK_AGENDAMENTOS}
            barbeiroSelecionadoId={barbeiroSelecionadoId}
            setBarbeiroSelecionadoId={setBarbeiroSelecionadoId}
            horariosOcupados={(data: string, bId: string) =>
              MOCK_AGENDAMENTOS
                .filter((ag) => ag.data === data && ag.barbeiro_id === bId && ag.status !== "Cancelado")
                .map((ag) => ag.horario)
            }
            servicos_find={(id: string) => MOCK_SERVICOS.find((s) => s.id === id)}
            isDono={false}
            userId={MOCK_BARBEIROS[0]?.id}
            corPrimaria="#3b82f6"
            onNovoAgendamento={() => {
              handleMockAction("Novo agendamento criado!");
              return Promise.resolve({});
            }}
            onStatusChange={() => handleMockAction("Status do agendamento alterado!")}
          />
        </div>
      </div>
    );
  }

  return null;
}
