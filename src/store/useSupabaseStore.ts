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
  const [barbeariaSlug, setBarbeariaSlug] = useState<string>("");
  const [barbeiroSelecionadoId, setBarbeiroSelecionadoId] = useState<string>("");
  const [dataFiltro, setDataFiltro] = useState<string>(new Date().toISOString().split("T")[0]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não logado");

      // 1. Busca a barbearia (Usando lista para evitar erro 406)
      const { data: bList }: any = await (supabase as any)
        .from("barbearias")
        .select("slug")
        .eq("dono_id", user.id);

      let bInfo = bList && bList.length > 0 ? bList[0] : null;

      if (!bInfo) {
        const { data: barbList }: any = await (supabase as any)
          .from("barbeiros")
          .select("barbearia_slug")
          .eq("id", user.id);
        
        if (barbList && barbList.length > 0) {
          bInfo = { slug: barbList[0].barbearia_slug };
        }
      }

      if (!bInfo?.slug) {
        setLoading(false);
        return;
      }

      setBarbeariaSlug(bInfo.slug);

      // 2. Busca dados filtrando pelo Slug
      const [bRes, sRes, aRes, dRes]: any = await Promise.all([
        (supabase as any).from("barbeiros").select("*").eq("barbearia_slug", bInfo.slug).order("nome"),
        (supabase as any).from("servicos").select("*").eq("barbearia_slug", bInfo.slug).order("nome"),
        (supabase as any).from("agendamentos").select("*").eq("barbearia_slug", bInfo.slug).order("horario"),
        (supabase as any).from("despesas").select("*").eq("barbearia_slug", bInfo.slug).order("data", { ascending: false }),
      ]);

      setBarbeiros(bRes.data || []);
      setServicos(sRes.data || []);
      setAgendamentos(aRes.data || []);
      setDespesas(dRes.data || []);

      if (bRes.data?.[0] && !barbeiroSelecionadoId) {
        setBarbeiroSelecionadoId(bRes.data[0].id);
      }

    } catch (e) {
      console.error("Erro no fetchAll:", e);
    } finally {
      setLoading(false);
    }
  }, [barbeiroSelecionadoId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // --- CÁLCULOS FINANCEIROS ---
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

  const agMes = agendamentos.filter(ag => 
    ag.barbeiro_id === barbeiroSelecionadoId && 
    ag.status === "Finalizado"
  );

  return {
    barbeiros, servicos, agendamentos, despesas, dataFiltro, setDataFiltro, loading, 
    barbeiroSelecionadoId, setBarbeiroSelecionadoId, barbeariaSlug,
    faturamentoHoje: Number(faturamentoHoje || 0),
    comissoesAPagarHoje: Number(comissoesHoje || 0),
    despesasNoDia: Number(gastosHoje || 0),
    lucroRealHoje: Number(faturamentoHoje - comissoesHoje - gastosHoje),
    cortesRealizadosHoje: agendamentosNoDia.filter(ag => ag.status === "Finalizado").length,
    agendamentosBarbeiroHoje: agendamentosNoDia.filter(ag => ag.barbeiro_id === barbeiroSelecionadoId),
    comissaoBarbeiroHoje: agendamentosNoDia.filter(ag => ag.barbeiro_id === barbeiroSelecionadoId && ag.status === "Finalizado").reduce((sum, ag) => sum + Number(ag.comissao_ganha || 0), 0),
    comissaoTotalMes: agMes.reduce((sum, ag) => sum + Number(ag.comissao_ganha || 0), 0),
    totalCortesMes: agMes.length,
    comissaoPorBarbeiroHoje: barbeiros.map(b => ({
      barbeiro: b,
      total: agendamentosNoDia.filter(ag => ag.barbeiro_id === b.id && ag.status === "Finalizado").reduce((sum, ag) => sum + Number(ag.comissao_ganha || 0), 0),
      cortes: agendamentosNoDia.filter(ag => ag.barbeiro_id === b.id && ag.status === "Finalizado").length
    })),

    // --- AÇÃO DE AGENDAR (CORRIGIDA) ---
    adicionarAgendamento: async (ag: any) => {
      const { data, error }: any = await (supabase as any).from("agendamentos").insert({
        data: ag.data,
        horario: ag.horario,
        nome_cliente: ag.nomeCliente,        // Mapeado para snake_case
        telefone_cliente: ag.telefoneCliente, // Mapeado para snake_case
        barbeiro_id: ag.barbeiroId,           // Mapeado para snake_case
        servico_id: ag.servicoId,             // Mapeado para snake_case
        status: "Pendente",
        barbearia_slug: barbeariaSlug
      }).select().single();

      if (!error && data) setAgendamentos(prev => [...prev, data]);
      return { error };
    },

    finalizarAgendamento: async (id: string) => {
      await (supabase as any).from("agendamentos").update({ status: "Finalizado" }).eq("id", id);
      setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: "Finalizado" } : a));
    },
    cancelarAgendamento: async (id: string) => {
      await (supabase as any).from("agendamentos").update({ status: "Cancelado" }).eq("id", id);
      setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: "Cancelado" } : a));
    },
    adicionarDespesa: async (nova: any) => {
      const { data, error }: any = await (supabase as any).from("despesas").insert({ 
        ...nova, 
        barbearia_slug: barbeariaSlug 
      }).select().single();
      if (!error && data) setDespesas(prev => [data, ...prev]);
    },
    removerDespesa: async (id: string) => {
      await (supabase as any).from("despesas").delete().eq("id", id);
      setDespesas(prev => prev.filter(d => d.id !== id));
    },
    adicionarBarbeiro: async (nome: string, comissao: number, email: string, senha: string) => {
      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({ email, password: senha });
      if (authError) throw authError;
      await (supabase as any).from("user_roles").insert({ user_id: authData.user!.id, role: "barbeiro" });
      const { data, error: profileError }: any = await (supabase as any).from("barbeiros").insert({ 
        id: authData.user!.id, nome, comissao_pct: comissao, barbearia_slug: barbeariaSlug 
      }).select().single();
      if (!profileError) setBarbeiros(prev => [...prev, data]);
    },
    removerBarbeiro: async (id: string) => {
      await (supabase as any).from("barbeiros").delete().eq("id", id);
      setBarbeiros(prev => prev.filter(b => b.id !== id));
    },
    adicionarServico: async (nome: string, preco: number) => {
      const { data, error }: any = await (supabase as any).from("servicos").insert({ 
        nome, preco, barbearia_slug: barbeariaSlug 
      }).select().single();
      if (!error && data) setServicos(prev => [...prev, data]);
    },
    removerServico: async (id: string) => {
      await (supabase as any).from("servicos").delete().eq("id", id);
      setServicos(prev => prev.filter(s => s.id !== id));
    },
    servicos_find: (id: string) => servicos.find(s => s.id === id),
    barbeiros_find: (id: string) => barbeiros.find(b => b.id === id),
    horariosOcupados: (data: string, bId: string) => agendamentos.filter(ag => ag.data === data && ag.barbeiro_id === bId && ag.status !== "Cancelado").map(ag => ag.horario)
  };
}