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
  const [barbeariaSlug, setBarbeariaSlug] = useState<string>(""); // O "Nome da Pasta"
  const [barbeiroSelecionadoId, setBarbeiroSelecionadoId] = useState<string>("");
  const [dataFiltro, setDataFiltro] = useState<string>(new Date().toISOString().split("T")[0]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Identifica o usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não logado");

      // 2. Descobre qual é o Slug da barbearia deste usuário
      // Procuramos na tabela barbearias onde o dono_id é o usuário atual
      let { data: bInfo } = await supabase
        .from("barbearias")
        .select("slug")
        .eq("dono_id", user.id)
        .single();

      // Se não achar como dono, tenta procurar como barbeiro vinculado
      if (!bInfo) {
        const { data: barbData } = await supabase
          .from("barbeiros")
          .select("barbearia_slug")
          .eq("id", user.id)
          .single();
        if (barbData) bInfo = { slug: barbData.barbearia_slug };
      }

      if (!bInfo?.slug) throw new Error("Barbearia não encontrada para este usuário");
      setBarbeariaSlug(bInfo.slug);

      // 3. Busca tudo filtrando pelo SLUG (A "Pasta")
      const [bRes, sRes, aRes, dRes] = await Promise.all([
        supabase.from("barbeiros").select("*").eq("barbearia_slug", bInfo.slug).order("nome"),
        supabase.from("servicos").select("*").eq("barbearia_slug", bInfo.slug).order("nome"),
        supabase.from("agendamentos").select("*").eq("barbearia_slug", bInfo.slug).order("horario"),
        supabase.from("despesas").select("*").eq("barbearia_slug", bInfo.slug).order("data", { ascending: false }),
      ]);

      setBarbeiros(bRes.data || []);
      setServicos(sRes.data || []);
      setAgendamentos(aRes.data || []);
      setDespesas(dRes.data || []);

      // Cache para modo Offline
      localStorage.setItem("caj_cache", JSON.stringify({
        barbeiros: bRes.data, servicos: sRes.data, agendamentos: aRes.data, despesas: dRes.data, slug: bInfo.slug
      }));

      if (bRes.data?.[0] && !barbeiroSelecionadoId) setBarbeiroSelecionadoId(bRes.data[0].id);

    } catch (e) {
      console.warn("Modo Offline/Erro: Carregando cache.");
      const cache = JSON.parse(localStorage.getItem("caj_cache") || "{}");
      if (cache.slug) {
        setBarbeiros(cache.barbeiros || []);
        setServicos(cache.servicos || []);
        setAgendamentos(cache.agendamentos || []);
        setDespesas(cache.despesas || []);
        setBarbeariaSlug(cache.slug);
      }
    } finally {
      setLoading(false);
    }
  }, [barbeiroSelecionadoId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // --- CÁLCULOS FINANCEIROS (BLINDADOS CONTRA TELA BRANCA) ---
  const agendamentosNoDia = agendamentos?.filter(ag => ag.data === dataFiltro) || [];
  
  const faturamentoHoje = agendamentosNoDia
    .filter(ag => ag.status === "Finalizado")
    .reduce((sum, ag) => sum + Number(servicos.find(s => s.id === ag.servico_id)?.preco || 0), 0);
  
  const comissoesHoje = agendamentosNoDia
    .filter(ag => ag.status === "Finalizado")
    .reduce((sum, ag) => sum + Number(ag.comissao_ganha || 0), 0);
  
  const gastosHoje = despesas
    .filter(d => d.data === dataFiltro)
    .reduce((sum, d) => sum + Number(d.valor || 0), 0);

  const agora = new Date();
  const primeiroDiaMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString().split('T')[0];
  const agMes = agendamentos.filter(ag => ag.barbeiro_id === barbeiroSelecionadoId && ag.data >= primeiroDiaMes && ag.status === "Finalizado");

  return {
    barbeiros, servicos, agendamentos, despesas, dataFiltro, setDataFiltro, loading, barbeiroSelecionadoId, setBarbeiroSelecionadoId, barbeariaSlug,
    
    // Dashboards
    faturamentoHoje: Number(faturamentoHoje || 0),
    comissoesAPagarHoje: Number(comissoesHoje || 0),
    despesasNoDia: Number(gastosHoje || 0),
    lucroRealHoje: Number(faturamentoHoje - comissoesHoje - gastosHoje),
    cortesRealizadosHoje: agendamentosNoDia.filter(ag => ag.status === "Finalizado").length,
    agendamentosBarbeiroHoje: agendamentosNoDia.filter(ag => ag.barbeiro_id === barbeiroSelecionadoId),
    
    // Carteira Barbeiro
    comissaoBarbeiroHoje: agendamentosNoDia.filter(ag => ag.barbeiro_id === barbeiroSelecionadoId && ag.status === "Finalizado").reduce((sum, ag) => sum + Number(ag.comissao_ganha || 0), 0),
    comissaoTotalMes: agMes.reduce((sum, ag) => sum + Number(ag.comissao_ganha || 0), 0),
    totalCortesMes: agMes.length,
    
    // Performance Dono
    comissaoPorBarbeiroHoje: barbeiros.map(b => ({
      barbeiro: b,
      total: agendamentosNoDia.filter(ag => ag.barbeiro_id === b.id && ag.status === "Finalizado").reduce((sum, ag) => sum + Number(ag.comissao_ganha || 0), 0),
      cortes: agendamentosNoDia.filter(ag => ag.barbeiro_id === b.id && ag.status === "Finalizado").length
    })),

    // AÇÕES (AGORA COM CARIMBO DE SLUG)
    adicionarAgendamento: async (ag: any) => {
      const { data, error } = await supabase.from("agendamentos").insert({
        data: ag.data, horario: ag.horario, nome_cliente: ag.nomeCliente, telefone_cliente: ag.telefoneCliente,
        barbeiro_id: ag.barbeiroId, servico_id: ag.servicoId, status: "Pendente", barbearia_slug: barbeariaSlug
      }).select().single();
      if (!error && data) setAgendamentos(prev => [...prev, data]);
      return { error };
    },
    finalizarAgendamento: async (id: string) => {
      await supabase.from("agendamentos").update({ status: "Finalizado" }).eq("id", id);
      setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: "Finalizado" } : a));
    },
    cancelarAgendamento: async (id: string) => {
      await supabase.from("agendamentos").update({ status: "Cancelado" }).eq("id", id);
      setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: "Cancelado" } : a));
    },
    adicionarDespesa: async (nova: any) => {
      const { data, error } = await supabase.from("despesas").insert({ ...nova, barbearia_slug: barbeariaSlug }).select().single();
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
      const { data, error: profileError } = await supabase.from("barbeiros").insert({ 
        id: authData.user!.id, nome: novo.nome, comissao_pct: novo.comissao_pct, barbearia_slug: barbeariaSlug 
      }).select().single();
      if (!profileError) setBarbeiros(prev => [...prev, data]);
    },
    removerBarbeiro: (id: string) => supabase.from("barbeiros").delete().eq("id", id),
    adicionarServico: (n: any) => supabase.from("servicos").insert({ ...n, barbearia_slug: barbeariaSlug }),
    removerServico: (id: string) => supabase.from("servicos").delete().eq("id", id),
    
    // HELPERS
    servicos_find: (id: string) => servicos.find(s => s.id === id),
    barbeiros_find: (id: string) => barbeiros.find(b => b.id === id),
    horariosOcupados: (data: string, bId: string) => agendamentos.filter(ag => ag.data === data && ag.barbeiro_id === bId && ag.status !== "Cancelado").map(ag => ag.horario)
  };
}