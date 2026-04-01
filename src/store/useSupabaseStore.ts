import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

// Mantemos o fuso horário corrigido para o Brasil
const getLocalDate = () => {
  const data = new Date();
  data.setMinutes(data.getMinutes() - data.getTimezoneOffset());
  return data.toISOString().split("T")[0];
};

export function useSupabaseStore() {
  const [barbeiros, setBarbeiros] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [despesas, setDespesas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [barbeariaSlug, setBarbeariaSlug] = useState<string>("");
  const [barbeiroSelecionadoId, setBarbeiroSelecionadoId] = useState<string>("");
  const [dataFiltro, setDataFiltro] = useState<string>(getLocalDate());

  // --- NOVOS ESTADOS PARA HIERARQUIA ---
  const [isDono, setIsDono] = useState<boolean>(false);
  const [loggedUserId, setLoggedUserId] = useState<string>("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não logado");

      setLoggedUserId(user.id);

      // 1. Busca a barbearia
      const { data: bList }: any = await (supabase as any)
        .from("barbearias")
        .select("slug")
        .eq("dono_id", user.id);

      let bInfo = bList && bList.length > 0 ? bList[0] : null;

      if (bInfo) {
        setIsDono(true); // É o dono da barbearia
      } else {
        setIsDono(false); // É um barbeiro
        const { data: barbList }: any = await (supabase as any)
          .from("barbeiros")
          .select("barbearia_slug")
          .eq("id", user.id);
        
        if (barbList && barbList.length > 0) {
          bInfo = { slug: barbList[0].barbearia_slug };
        }
      }

      if (!bInfo?.slug) {
        console.warn("Nenhuma barbearia encontrada para este perfil.");
        setLoading(false);
        return;
      }

      setBarbeariaSlug(bInfo.slug);

      // 2. Busca todos os dados em paralelo filtrando pelo Slug
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

      if (bRes.data && bRes.data.length > 0 && !barbeiroSelecionadoId) {
        // Auto-seleciona o usuário logado para o modal de agendamento (ou o 1º da lista)
        const defaultBarber = bRes.data.find((b: any) => b.id === user.id) || bRes.data[0];
        setBarbeiroSelecionadoId(defaultBarber.id);
      }

    } catch (e) {
      console.error("Erro no carregamento dos dados:", e);
    } finally {
      setLoading(false);
    }
  }, [barbeiroSelecionadoId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // --- LÓGICA FINANCEIRA E VISÃO ---
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

  // A MÁGICA: Se for dono, vê a agenda inteira da loja. Se for barbeiro, vê só a dele!
  const agendamentosBarbeiroHoje = isDono 
    ? agendamentosNoDia 
    : agendamentosNoDia.filter(ag => ag.barbeiro_id === loggedUserId);

  // A carteira mensal do barbeiro puxa sempre pelo ID dele
  const agMes = agendamentos.filter(ag => 
    ag.barbeiro_id === loggedUserId && 
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
    agendamentosBarbeiroHoje, // <- Atualizado para visão hierárquica
    comissaoBarbeiroHoje: agendamentosNoDia.filter(ag => ag.barbeiro_id === loggedUserId && ag.status === "Finalizado").reduce((sum, ag) => sum + Number(ag.comissao_ganha || 0), 0),
    comissaoTotalMes: agMes.reduce((sum, ag) => sum + Number(ag.comissao_ganha || 0), 0),
    totalCortesMes: agMes.length,
    comissaoPorBarbeiroHoje: barbeiros.map(b => ({
      barbeiro: b,
      total: agendamentosNoDia.filter(ag => ag.barbeiro_id === b.id && ag.status === "Finalizado").reduce((sum, ag) => sum + Number(ag.comissao_ganha || 0), 0),
      cortes: agendamentosNoDia.filter(ag => ag.barbeiro_id === b.id && ag.status === "Finalizado").length
    })),

    // --- AÇÕES ---
    adicionarAgendamento: async (ag: any) => {
      const { data, error }: any = await (supabase as any).from("agendamentos").insert({
        data: ag.data,
        horario: ag.horario,
        nome_cliente: ag.nomeCliente,
        telefone_cliente: ag.telefoneCliente,
        barbeiro_id: ag.barbeiroId,
        servico_id: ag.servicoId,
        status: "Pendente",
        barbearia_slug: barbeariaSlug
      }).select().single();
      if (!error && data) setAgendamentos(prev => [...prev, data]);
      return { error };
    },

    finalizarAgendamento: async (id: string) => {
      try {
        const agendamentoAtual = agendamentos.find(a => a.id === id);
        if (!agendamentoAtual) return;

        const servico = servicos.find(s => s.id === agendamentoAtual.servico_id);
        const barbeiro = barbeiros.find(b => b.id === agendamentoAtual.barbeiro_id);

        if (!servico || !barbeiro) throw new Error("Dados insuficientes");

        const valorComissao = (Number(servico.preco) * Number(barbeiro.comissao_pct)) / 100;

        await (supabase as any)
          .from("agendamentos")
          .update({ 
            status: "Finalizado",
            comissao_ganha: valorComissao 
          })
          .eq("id", id);

        setAgendamentos(prev => prev.map(a => 
          a.id === id ? { ...a, status: "Finalizado", comissao_ganha: valorComissao } : a
        ));
      } catch (err) {
        console.error("Erro ao finalizar:", err);
      }
    },

    cancelarAgendamento: async (id: string) => {
      await (supabase as any).from("agendamentos").update({ status: "Cancelado" }).eq("id", id);
      setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: "Cancelado" } : a));
    },

    adicionarDespesa: async (nova: any) => {
      const { data, error }: any = await (supabase as any).from("despesas").insert({ ...nova, barbearia_slug: barbeariaSlug }).select().single();
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
      const { data, error }: any = await (supabase as any).from("servicos").insert({ nome, preco, barbearia_slug: barbeariaSlug }).select().single();
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