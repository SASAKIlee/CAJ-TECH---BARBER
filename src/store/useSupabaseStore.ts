import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export function useSupabaseStore() {
  const [barbeiros, setBarbeiros] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [despesas, setDespesas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [barbeiroSelecionadoId, setBarbeiroSelecionadoId] = useState<string>("");
  const [dataFiltro, setDataFiltro] = useState<string>(new Date().toISOString().split("T")[0]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [bRes, sRes, aRes, dRes] = await Promise.all([
      supabase.from("barbeiros").select("*").order("nome"),
      supabase.from("servicos").select("*").order("nome"),
      supabase.from("agendamentos").select("*").order("horario"),
      supabase.from("despesas").select("*").order("data", { ascending: false }),
    ]);
    setBarbeiros(bRes.data ?? []);
    setServicos(sRes.data ?? []);
    setAgendamentos(aRes.data ?? []);
    setDespesas(dRes.data ?? []);
    if (bRes.data?.[0] && !barbeiroSelecionadoId) setBarbeiroSelecionadoId(bRes.data[0].id);
    setLoading(false);
  }, [barbeiroSelecionadoId]);

  useEffect(() => { fetchAll(); }, []);

  // --- ACÇÕES BARBEIROS ---
  const adicionarBarbeiro = useCallback(async (novo: any) => {
    try {
      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({ email: novo.email, password: novo.senha });
      if (authError) throw authError;
      await supabase.from("user_roles").insert({ user_id: authData.user!.id, role: "barbeiro" });
      const { data, error: profileError } = await supabase.from("barbeiros").insert({ id: authData.user!.id, nome: novo.nome, comissao_pct: novo.comissao_pct }).select().single();
      if (profileError) throw profileError;
      setBarbeiros(prev => [...prev, data]);
    } catch (e: any) { alert(e.message); }
  }, []);

  // --- ACÇÕES AGENDAMENTOS ---
  const adicionarAgendamento = useCallback(async (ag: any) => {
    const { error, data } = await supabase.from("agendamentos").insert({
      data: ag.data, horario: ag.horario, nome_cliente: ag.nomeCliente, telefone_cliente: ag.telefoneCliente,
      barbeiro_id: ag.barbeiroId, servico_id: ag.servicoId, status: "Pendente"
    }).select().single();
    if (!error && data) setAgendamentos(prev => [...prev, data]);
    return { error };
  }, []);

  const finalizarAgendamento = useCallback(async (id: string) => {
    const ag = agendamentos.find(a => a.id === id);
    const s = servicos.find(s => s.id === ag?.servico_id);
    const b = barbeiros.find(b => b.id === ag?.barbeiro_id);
    const comissao = s && b ? (s.preco * b.comissao_pct) / 100 : 0;
    await supabase.from("agendamentos").update({ status: "Finalizado", comissao_ganha: comissao }).eq("id", id);
    setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: "Finalizado", comissao_ganha: comissao } : a));
  }, [agendamentos, servicos, barbeiros]);

  const cancelarAgendamento = useCallback(async (id: string) => {
    await supabase.from("agendamentos").update({ status: "Cancelado" }).eq("id", id);
    setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: "Cancelado" } : a));
  }, []);

  // --- ACÇÕES DESPESAS ---
  const adicionarDespesa = useCallback(async (nova: { descricao: string, valor: number, data: string }) => {
    const { data, error } = await supabase.from("despesas").insert(nova).select().single();
    if (!error && data) setDespesas(prev => [data, ...prev]);
  }, []);

  const removerDespesa = useCallback(async (id: string) => {
    await supabase.from("despesas").delete().eq("id", id);
    setDespesas(prev => prev.filter(d => d.id !== id));
  }, []);

  // --- LÓGICA DE CÁLCULOS (DIÁRIO E MENSAL) ---
  const agendamentosNoDia = agendamentos.filter(ag => ag.data === dataFiltro);
  const faturamentoHoje = agendamentosNoDia.filter(ag => ag.status === "Finalizado").reduce((sum, ag) => sum + (servicos.find(s => s.id === ag.servico_id)?.preco ?? 0), 0);
  const comissoesHoje = agendamentosNoDia.filter(ag => ag.status === "Finalizado").reduce((sum, ag) => sum + (ag.comissao_ganha || 0), 0);
  const gastosHoje = despesas.filter(d => d.data === dataFiltro).reduce((sum, d) => sum + Number(d.valor), 0);

  // Lógica da Carteira Mensal (que estava faltando)
  const agora = new Date();
  const primeiroDiaMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString().split('T')[0];
  const agendamentosBarbeiroMes = agendamentos.filter(ag => 
    ag.barbeiro_id === barbeiroSelecionadoId && 
    ag.data >= primeiroDiaMes && 
    ag.status === "Finalizado"
  );

  return {
    barbeiros, servicos, agendamentos, despesas, dataFiltro, setDataFiltro,
    agendamentosBarbeiroHoje: agendamentosNoDia.filter(ag => ag.barbeiro_id === barbeiroSelecionadoId),
    
    // Variáveis da Carteira do Barbeiro
    comissaoBarbeiroHoje: agendamentosNoDia.filter(ag => ag.barbeiro_id === barbeiroSelecionadoId && ag.status === "Finalizado").reduce((sum, ag) => sum + (ag.comissao_ganha || 0), 0),
    comissaoTotalMes: agendamentosBarbeiroMes.reduce((sum, ag) => sum + (ag.comissao_ganha || 0), 0),
    totalCortesMes: agendamentosBarbeiroMes.length,

    // Variáveis do Dono
    faturamentoHoje, comissoesAPagarHoje: comissoesHoje, despesasNoDia: gastosHoje,
    lucroRealHoje: faturamentoHoje - comissoesHoje - gastosHoje,
    cortesRealizadosHoje: agendamentosNoDia.filter(ag => ag.status === "Finalizado").length, // Faltava essa também!
    comissaoPorBarbeiroHoje: barbeiros.map(b => ({
      barbeiro: b,
      total: agendamentosNoDia.filter(ag => ag.barbeiro_id === b.id && ag.status === "Finalizado").reduce((sum, ag) => sum + (ag.comissao_ganha || 0), 0),
      cortes: agendamentosNoDia.filter(ag => ag.barbeiro_id === b.id && ag.status === "Finalizado").length
    })),

    // Funções
    adicionarAgendamento, finalizarAgendamento, cancelarAgendamento, 
    adicionarDespesa, removerDespesa, adicionarBarbeiro, 
    removerBarbeiro: (id: string) => supabase.from("barbeiros").delete().eq("id", id),
    adicionarServico: (n: any) => supabase.from("servicos").insert(n),
    removerServico: (id: string) => supabase.from("servicos").delete().eq("id", id),
    loading, barbeiroSelecionadoId, setBarbeiroSelecionadoId,
    servicos_find: (id: string) => servicos.find(s => s.id === id),
    barbeiros_find: (id: string) => barbeiros.find(b => b.id === id),
    horariosOcupados: (data: string, bId: string) => agendamentos.filter(ag => ag.data === data && ag.barbeiro_id === bId && ag.status !== "Cancelado").map(ag => ag.horario)
  };
}