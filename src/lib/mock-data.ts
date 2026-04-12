/**
 * Dados Mockados para Demonstração
 * Simula um ambiente real de barbearia para vendedores apresentarem o sistema.
 * Todos os dados são temporários e somem ao recarregar a página.
 *
 * @module mock-data
 * @author CAJ TECH
 */

import type { Barbeiro, Servico, Agendamento } from "@/types/dono";

// Dados fictícios de barbeiros
export const MOCK_BARBEIROS: Barbeiro[] = [
  {
    id: "mock-barbeiro-1",
    nome: "João Silva",
    comissao_pct: 50,
    ativo: true,
    url_foto: null,
  },
  {
    id: "mock-barbeiro-2",
    nome: "Pedro Santos",
    comissao_pct: 45,
    ativo: true,
    url_foto: null,
  },
  {
    id: "mock-barbeiro-3",
    nome: "Lucas Oliveira",
    comissao_pct: 55,
    ativo: true,
    url_foto: null,
  },
];

// Dados fictícios de serviços
export const MOCK_SERVICOS: Servico[] = [
  {
    id: "mock-servico-1",
    nome: "Corte Degradê",
    preco: 45,
    duracao_minutos: 40,
    url_imagem: null,
  },
  {
    id: "mock-servico-2",
    nome: "Barba Completa",
    preco: 35,
    duracao_minutos: 30,
    url_imagem: null,
  },
  {
    id: "mock-servico-3",
    nome: "Corte + Barba",
    preco: 70,
    duracao_minutos: 60,
    url_imagem: null,
  },
  {
    id: "mock-servico-4",
    nome: "Pezinho / Acabamento",
    preco: 20,
    duracao_minutos: 15,
    url_imagem: null,
  },
];

// Gerar agendamentos fictícios para hoje
function gerarAgendamentosMock(): Agendamento[] {
  const hoje = new Date().toISOString().split("T")[0];
  return [
    {
      id: "mock-ag-1",
      nome_cliente: "Carlos Mendes",
      telefone_cliente: "11999887766",
      servico_id: "mock-servico-1",
      barbeiro_id: "mock-barbeiro-1",
      data: hoje,
      horario: "09:00",
      status: "Finalizado",
      comissao_ganha: 22.5,
      barbearia_slug: "demo-barbearia",
      gorjeta: 10,
      observacao: "Cliente preferiu estilo militar.",
    },
    {
      id: "mock-ag-2",
      nome_cliente: "Rafael Costa",
      telefone_cliente: "11988776655",
      servico_id: "mock-servico-3",
      barbeiro_id: "mock-barbeiro-1",
      data: hoje,
      horario: "10:00",
      status: "Finalizado",
      comissao_ganha: 35,
      barbearia_slug: "demo-barbearia",
      gorjeta: 5,
      observacao: "",
    },
    {
      id: "mock-ag-3",
      nome_cliente: "Fernando Lima",
      telefone_cliente: "11977665544",
      servico_id: "mock-servico-2",
      barbeiro_id: "mock-barbeiro-2",
      data: hoje,
      horario: "11:00",
      status: "Pendente",
      comissao_ganha: 0,
      barbearia_slug: "demo-barbearia",
      gorjeta: 0,
      observacao: "Quero a barba estilo lenhador.",
    },
    {
      id: "mock-ag-4",
      nome_cliente: "Gabriel Souza",
      telefone_cliente: "11966554433",
      servico_id: "mock-servico-1",
      barbeiro_id: "mock-barbeiro-3",
      data: hoje,
      horario: "14:00",
      status: "Pendente",
      comissao_ganha: 0,
      barbearia_slug: "demo-barbearia",
      gorjeta: 0,
      observacao: "",
    },
    {
      id: "mock-ag-5",
      nome_cliente: "Marcos Pereira",
      telefone_cliente: "11955443322",
      servico_id: "mock-servico-4",
      barbeiro_id: "mock-barbeiro-2",
      data: hoje,
      horario: "15:30",
      status: "Pendente",
      comissao_ganha: 0,
      barbearia_slug: "demo-barbearia",
      gorjeta: 0,
      observacao: "",
    },
  ];
}

export const MOCK_AGENDAMENTOS = gerarAgendamentosMock();

// Stats fictícios para o dashboard
export const MOCK_STATS = {
  faturamentoHoje: 340,
  faturamentoMensal: 8500,
  comissoesAPagarHoje: 170,
  lucroRealHoje: 170,
};

// Comissões por barbeiro
export const MOCK_COMISSAO_POR_BARBEIRO = MOCK_BARBEIROS.map((barbeiro) => ({
  barbeiro: { id: barbeiro.id, nome: barbeiro.nome },
  total: MOCK_AGENDAMENTOS.filter(
    (ag) => ag.barbeiro_id === barbeiro.id && ag.status === "Finalizado"
  ).reduce((sum, ag) => sum + (ag.comissao_ganha || 0), 0),
}));
