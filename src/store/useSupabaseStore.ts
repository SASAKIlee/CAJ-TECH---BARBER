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
    try {
      const [bRes, sRes, aRes, dRes] = await Promise.all([
        supabase.from("barbeiros").select("*").order("nome"),
        supabase.from("servicos").select("*").order("nome"),
        supabase.from("agendamentos").select("*").order("horario"),
        supabase.from("despesas").select("*").order("data", { ascending: false }),
      ]);

      const bData = bRes.data || [];
      const sData = sRes.data || [];
      const aData = aRes.data || [];
      const dData = dRes.data || [];

      setBarbeiros(bData);
      setServicos(sData);
      setAgendamentos(aData);
      setDespesas(dData);

      localStorage.setItem("caj_barbeiros", JSON.stringify(bData));
      localStorage.setItem("caj_servicos", JSON.stringify(sData));
      localStorage.setItem("caj_agendamentos", JSON.stringify(aData));
      localStorage.setItem("caj_despesas", JSON.stringify(dData));

      if (bData.length > 0 && !barbeiroSelecionadoId) {
        setBarbeiroSelecionadoId(bData[0].id);
      }
    } catch (e) {
      setBarbeiros(JSON.parse(localStorage.getItem("caj_barbeiros") || "[]"));
      setServicos(JSON.parse(localStorage.getItem("caj_servicos") || "[]"));
      setAgendamentos(JSON.parse(localStorage.getItem("caj_agendamentos") || "[]"));
      setDespesas(JSON.parse(localStorage.getItem("caj_despesas") || "[]"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // --- CÁLCULOS SEGUROS ---
  const agendamentosNoDia = agendamentos?.filter(ag => ag.data === dataFiltro) || [];
  const faturamentoHoje = agendamentosNoDia.filter(ag => ag.status === "Finalizado").reduce((sum, ag) => sum + Number(servicos.find(s => s.id === ag.servico_id)?.preco || 0), 0);
  const comissoesHoje = agendamentosNoDia.filter(ag => ag.status === "Finalizado").reduce((sum, ag) => sum + Number(ag.comissao_ganha || 0), 0);
  const gastosHoje = despesas.filter(d => d.data === dataFiltro).reduce((sum, d) => sum + Number(d.valor || 0), 0);

  const agora = new Date();
  const primeiroDiaMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString().split('T')[0];
  const agendamentosBarbeiroMes = agendamentos.filter(ag => ag.barbeiro_id === barbeiroSelecionadoId && ag.data >= primeiroDiaMes && ag.status === "Finalizado");

  return {
    barbeiros, servicos, agendamentos, despesas, dataFiltro, setDataFiltro, loading, barbeiroSelecionadoId, setBarbeiroSelecionadoId,
    faturamentoHoje: Number(faturamentoHoje || 0),
    comissoesAPagarHoje: Number(comissoesHoje || 0),
    despesasNoDia: Number(gastosHoje || 0),
    lucroRealHoje: Number(faturamentoHoje - comissoesHoje - gastosHoje),
    cortesRealizadosHoje: agendamentosNoDia.filter(ag => ag.status === "Finalizado").length,
    agendamentosBarbeiroHoje: agendamentosNoDia.filter(ag => ag.barbeiro_id === barbeiroSelecionadoId),
    comissaoBarbeiroHoje: agendamentosNoDia.filter(ag => ag.barbeiro_id === barbeiroSelecionadoId && ag.status === "Finalizado").reduce((sum, ag) => sum + Number(ag.comissao_ganha || 0), 0),
    comissaoTotalMes: agendamentosBarbeiroMes.reduce((sum, ag) => sum + Number(ag.comissao_ganha || 0), 0),
    totalCortesMes: agendamentosBarbeiroMes.length,
    comissaoPorBarbeiroHoje: barbeiros.map(b => ({
      barbeiro: b,
      total: agendamentosNoDia.filter(ag => ag.barbeiro_id === b.id && ag.status === "Finalizado").reduce((sum, ag) => sum + Number(ag.comissao_ganha || 0), 0),
      cortes: agendamentosNoDia.filter(ag => ag.barbeiro_id === b.id && ag.status === "Finalizado").length
    })),

    // FUNÇÕES DE AÇÃO
    adicionarAgendamento: async (ag: any) => {
      const { data, error } = await supabase.from("agendamentos").insert({
        data: ag.data, horario: ag.horario, nome_cliente: ag.nomeCliente, telefone_cliente: ag.telefoneCliente,
        barbeiro_id: ag.barbeiroId, servico_id: ag.servicoId, status: "Pendente"
      }).select().single();
      if (!error && data) setAgendamentos(prev => [...prev, data]);
      return { error };
    },
    finalizarAgendamento: async (id: string) => {
      const { error } = await supabase.from("agendamentos").update({ status: "Finalizado" }).eq("id", id);
      if (!error) setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: "Finalizado" } : a));
    },
    cancelarAgendamento: async (id: string) => {
      await supabase.from("agendamentos").update({ status: "Cancelado" }).eq("id", id);
      setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: "Cancelado" } : a));
    },
    adicionarDespesa: async (nova: any) => {
      const { data, error } = await supabase.from("despesas").insert(nova).select().single();
      if (!error && data) setDespesas(prev => [data, ...prev]);
    },
    removerDespesa: async (id: string) => {
      await supabase.from("despesas").delete().eq("id", id);
      setDespesas(prev => prev.filter(d => d.id !== id));
    },
    adicionarBarbeiro: async (novo: any) => {
      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({ email: novo.email, password: novo.senha });
      if (authError) throw authError;
      await supabase.from("user_roles").insert({ user_id: authData.user!.id, role: "barbeiro" });
      const { data, error: profileError } = await supabase.from("barbeiros").insert({ id: authData.user!.id, nome: novo.nome, comissao_pct: novo.comissao_pct }).select().single();
      if (!profileError) setBarbeiros(prev => [...prev, data]);
    },
    removerBarbeiro: (id: string) => supabase.from("barbeiros").delete().eq("id", id),
    adicionarServico: (n: any) => supabase.from("servicos").insert(n),
    removerServico: (id: string) => supabase.from("servicos").delete().eq("id", id),
    
    // HELPERS (O que faltava!)
    servicos_find: (id: string) => servicos.find(s => s.id === id),
    barbeiros_find: (id: string) => barbeiros.find(b => b.id === id),
    horariosOcupados: (data: string, bId: string) => agendamentos.filter(ag => ag.data === data && ag.barbeiro_id === bId && ag.status !== "Cancelado").map(ag => ag.horario)
  };
}