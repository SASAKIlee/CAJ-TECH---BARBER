import { useState, useCallback } from "react";

export interface Barbeiro {
  id: string;
  nome: string;
  comissaoPct: number;
}

export interface Servico {
  id: string;
  nome: string;
  preco: number;
}

export type StatusAgendamento = "Pendente" | "Finalizado" | "Cancelado";

export interface Agendamento {
  id: string;
  data: string;
  horario: string;
  nomeCliente: string;
  barbeiroId: string;
  servicoId: string;
  status: StatusAgendamento;
  comissaoGanha: number;
}

const BARBEIROS_INICIAIS: Barbeiro[] = [
  { id: "b1", nome: "Carlos", comissaoPct: 50 },
  { id: "b2", nome: "André", comissaoPct: 50 },
  { id: "b3", nome: "João", comissaoPct: 45 },
];

const SERVICOS_INICIAIS: Servico[] = [
  { id: "s1", nome: "Corte Masculino", preco: 45 },
  { id: "s2", nome: "Barba", preco: 30 },
  { id: "s3", nome: "Corte + Barba", preco: 65 },
  { id: "s4", nome: "Degradê", preco: 50 },
  { id: "s5", nome: "Pigmentação", preco: 80 },
];

function hoje(): string {
  return new Date().toISOString().split("T")[0];
}

export function useAppStore() {
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>(BARBEIROS_INICIAIS);
  const [servicos] = useState<Servico[]>(SERVICOS_INICIAIS);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [barbeiroSelecionadoId, setBarbeiroSelecionadoId] = useState<string>(barbeiros[0]?.id || "");

  const adicionarBarbeiro = useCallback((nome: string, comissaoPct: number) => {
    const novo: Barbeiro = {
      id: Math.random().toString(36).substr(2, 9),
      nome,
      comissaoPct,
    };
    setBarbeiros((prev) => [...prev, novo]);
  }, []);

  const removerBarbeiro = useCallback((id: string) => {
    setBarbeiros((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const adicionarAgendamento = useCallback(
    (ag: { data: string; horario: string; nomeCliente: string; barbeiroId: string; servicoId: string }) => {
      const novo: Agendamento = {
        ...ag,
        id: Math.random().toString(36).substr(2, 9),
        status: "Pendente",
        comissaoGanha: 0,
      };
      setAgendamentos((prev) => [...prev, novo]);
    },
    []
  );

  const finalizarAgendamento = useCallback(
    (id: string) => {
      setAgendamentos((prev) =>
        prev.map((ag) => {
          if (ag.id !== id) return ag;
          const servico = servicos.find((s) => s.id === ag.servicoId);
          const barbeiro = barbeiros.find((b) => b.id === ag.barbeiroId);
          const comissao = servico && barbeiro ? (servico.preco * barbeiro.comissaoPct) / 100 : 0;
          return { ...ag, status: "Finalizado" as const, comissaoGanha: comissao };
        })
      );
    },
    [servicos, barbeiros]
  );

  const cancelarAgendamento = useCallback((id: string) => {
    setAgendamentos((prev) =>
      prev.map((ag) => (ag.id === id ? { ...ag, status: "Cancelado" as const, comissaoGanha: 0 } : ag))
    );
  }, []);

  const agendamentosHoje = agendamentos.filter((ag) => ag.data === hoje());
  const agendamentosBarbeiroHoje = agendamentosHoje.filter((ag) => ag.barbeiroId === barbeiroSelecionadoId);
  const comissaoBarbeiroHoje = agendamentosBarbeiroHoje.filter((ag) => ag.status === "Finalizado").reduce((sum, ag) => sum + ag.comissaoGanha, 0);

  const faturamentoHoje = agendamentosHoje.filter((ag) => ag.status === "Finalizado").reduce((sum, ag) => {
    const servico = servicos.find((s) => s.id === ag.servicoId);
    return sum + (servico?.preco ?? 0);
  }, 0);

  const comissoesAPagarHoje = agendamentosHoje.filter((ag) => ag.status === "Finalizado").reduce((sum, ag) => sum + ag.comissaoGanha, 0);
  const cortesRealizadosHoje = agendamentosHoje.filter((ag) => ag.status === "Finalizado").length;

  const comissaoPorBarbeiroHoje = barbeiros.map((b) => {
    const total = agendamentosHoje.filter((ag) => ag.barbeiroId === b.id && ag.status === "Finalizado").reduce((sum, ag) => sum + ag.comissaoGanha, 0);
    const cortes = agendamentosHoje.filter((ag) => ag.barbeiroId === b.id && ag.status === "Finalizado").length;
    return { barbeiro: { id: b.id, nome: b.nome, comissaoPct: b.comissaoPct }, total, cortes };
  });

  const horariosOcupados = (data: string, barbeiroId: string): string[] => {
    return agendamentos.filter((ag) => ag.data === data && ag.barbeiroId === barbeiroId && ag.status !== "Cancelado").map((ag) => ag.horario);
  };

  return {
    barbeiros,
    servicos,
    agendamentos,
    agendamentosHoje,
    agendamentosBarbeiroHoje,
    comissaoBarbeiroHoje,
    faturamentoHoje,
    comissoesAPagarHoje,
    cortesRealizadosHoje,
    comissaoPorBarbeiroHoje,
    barbeiroSelecionadoId,
    setBarbeiroSelecionadoId,
    adicionarAgendamento,
    finalizarAgendamento,
    cancelarAgendamento,
    adicionarBarbeiro,
    removerBarbeiro,
    horariosOcupados,
    servicos_find: (id: string) => servicos.find((s) => s.id === id),
    barbeiros_find: (id: string) => barbeiros.find((b) => b.id === id),
  };
}