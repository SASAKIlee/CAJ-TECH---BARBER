import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useEffect } from "react";
import type {
  AgendamentoInsert,
  AgendamentoUpdate,
  BarbeiroInsert,
  BarbeiroStatusUpdate,
  BarbeiroMetaUpdate,
  BarbeiroRemove,
  ServicoInsert,
  ServicoRemove,
  DespesaInsert,
  QueryCacheContext,
  SupabaseError,
} from "@/types/queries";
import { getErrorMessage, logError } from "@/lib/error-handler";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

const getInicioBusca = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

// ==========================================
// 1. BARBEARIA
// ==========================================
export function useBarbearia(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["barbearia"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não logado");

      const { data: lojaDono } = await supabase.from("barbearias").select("*").eq("dono_id", user.id).maybeSingle();
      let lojaData = lojaDono;
      const isDono = !!lojaDono;

      if (!isDono) {
        const { data: barbeiroRef } = await supabase.from("barbeiros").select("barbearia_slug").eq("id", user.id).maybeSingle();
        if (barbeiroRef) {
          const { data: lojaBarb } = await supabase.from("barbearias").select("*").eq("slug", barbeiroRef.barbearia_slug).maybeSingle();
          lojaData = lojaBarb;
        }
      }

      if (!lojaData) throw new Error("Nenhuma barbearia vinculada.");

      return {
        slug: String(lojaData.slug).trim().toLowerCase(),
        isDono,
        userId: user.id,
        nome: lojaData.nome,
        cor_primaria: lojaData.cor_primaria?.trim() || "#D4AF37",
        cor_secundaria: lojaData.cor_secundaria?.trim() || "#18181B",
        cor_destaque: lojaData.cor_destaque?.trim() || "#FFFFFF",
        url_fundo: lojaData.url_fundo?.trim() || null,
        url_logo: lojaData.url_logo?.trim() || null,
        checkin_habilitado: lojaData.checkin_habilitado ?? false,
      };
    },
    staleTime: Infinity,
    enabled: options?.enabled ?? true,
  });
}

// ==========================================
// 2. AGENDAMENTOS
// ==========================================
export function useAgendamentos(slug?: string) {
  const queryClient = useQueryClient();
  const safeSlug = String(slug || "").trim().toLowerCase();

  useEffect(() => {
    if (!safeSlug) return;
    const canal = supabase.channel(`agenda-${safeSlug}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agendamentos', filter: `barbearia_slug=eq.${safeSlug}` }, 
      () => { queryClient.invalidateQueries({ queryKey: ["agendamentos", safeSlug] }); })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [safeSlug, queryClient]);

  return useQuery({
    queryKey: ["agendamentos", safeSlug],
    queryFn: async () => {
      if (!safeSlug) return [];
      const { data, error } = await supabase.from("agendamentos")
        .select("*")
        .ilike("barbearia_slug", safeSlug)
        .gte("data", getInicioBusca())
        .order("horario");
      if (error) throw error;
      return data || [];
    },
    enabled: !!safeSlug,
  });
}

export function useMutacoesAgendamento() {
  const queryClient = useQueryClient();
  return {
    adicionarAgendamento: useMutation({
      mutationFn: async ({ ag, slug, idempotencyKey }: {
        ag: AgendamentoInsert[];
        slug: string;
        idempotencyKey: string;
      }) => {
        const { data: existing } = await supabase
          .from("agendamentos")
          .select("id")
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();

        if (existing) return { alreadyExists: true };

        const agendamentosComChave = ag.map(item => ({
          ...item,
          idempotency_key: idempotencyKey,
          barbearia_slug: slug.trim().toLowerCase(),
        }));

        const { error } = await supabase.from("agendamentos").insert(agendamentosComChave);
        if (error) throw error;
        return { success: true };
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: ["agendamentos", vars.slug.toLowerCase()] });
        toast.success("Agendado com sucesso! ✂️");
      },
      onError: (err: SupabaseError) => {
        logError(err, "adicionarAgendamento");
        toast.error(getErrorMessage(err));
      }
    }),

    atualizarStatusAgendamento: useMutation({
      mutationFn: async ({ id, status, comissaoGanha = 0, slug }: AgendamentoUpdate) => {
        const { error } = await supabase.from("agendamentos").update({ status, comissao_ganha: comissaoGanha }).eq("id", id);
        if (error) throw error;
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: ["agendamentos", vars.slug.toLowerCase()] });
      }
    })
  };
}

// ==========================================
// 3. BARBEIROS
// ==========================================
export function useBarbeiros(slug?: string) {
  const safeSlug = String(slug || "").trim().toLowerCase();
  return useQuery({
    queryKey: ["barbeiros", safeSlug],
    queryFn: async () => {
      const { data, error } = await supabase.from("barbeiros").select("*").ilike("barbearia_slug", safeSlug).order("nome");
      if (error) throw error;
      return data || [];
    },
    enabled: !!safeSlug,
  });
}

export function useMutacoesBarbeiro() {
  const queryClient = useQueryClient();
  return {
    adicionarBarbeiro: useMutation({
      mutationFn: async ({ nome, comissao_pct, email, senha, slug, url_foto }: BarbeiroInsert) => {
        const tempClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
        const { data: authData, error: authError } = await tempClient.auth.signUp({ email, password: senha });
        if (authError) throw authError;

        const userId = authData.user!.id;
        await supabase.from("user_roles").insert({ user_id: userId, role: "barbeiro" });
        const { error: barbError } = await supabase.from("barbeiros").insert({
          id: userId, nome, comissao_pct, barbearia_slug: slug.toLowerCase(), ativo: true, url_foto
        });
        if (barbError) throw barbError;
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: ["barbeiros", vars.slug.toLowerCase()] });
        toast.success("Barbeiro contratado!");
      }
    }),
    alternarStatusBarbeiro: useMutation({
      mutationFn: async ({ id, novoStatus, slug }: BarbeiroStatusUpdate) => {
        const { error } = await supabase.from("barbeiros").update({ ativo: novoStatus }).eq("id", id);
        if (error) throw error;
      },
      onSuccess: (_, vars) => { queryClient.invalidateQueries({ queryKey: ["barbeiros", vars.slug.toLowerCase()] }); }
    }),
    // 👇 A FUNÇÃO QUE ESTAVA FALTANDO AQUI!
    atualizarMetaBarbeiro: useMutation({
      mutationFn: async ({ id, meta, slug }: BarbeiroMetaUpdate) => {
        const { error } = await supabase.from("barbeiros").update({ meta_diaria: meta }).eq("id", id);
        if (error) throw error;
      },
      onSuccess: (_, vars) => { 
        queryClient.invalidateQueries({ queryKey: ["barbeiros", vars.slug.toLowerCase()] }); 
        toast.success("Meta atualizada!");
      }
    }),
    removerBarbeiro: useMutation({
      mutationFn: async ({ id, estaAtivo, slug }: BarbeiroRemove) => {
        if (estaAtivo) throw new Error("Desative o barbeiro primeiro.");
        const { error } = await supabase.from("barbeiros").delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess: (_, vars) => { queryClient.invalidateQueries({ queryKey: ["barbeiros", vars.slug.toLowerCase()] }); }
    })
  };
}

// ==========================================
// 4. SERVIÇOS
// ==========================================
export function useServicos(slug?: string) {
  const safeSlug = String(slug || "").trim().toLowerCase();
  return useQuery({
    queryKey: ["servicos", safeSlug],
    queryFn: async () => {
      const { data, error } = await supabase.from("servicos").select("*").ilike("barbearia_slug", safeSlug).order("nome");
      if (error) throw error;
      return data || [];
    },
    enabled: !!safeSlug,
  });
}

export function useMutacoesServico() {
  const queryClient = useQueryClient();
  return {
    adicionarServico: useMutation({
      mutationFn: async ({ nome, preco, duracao_minutos, url_imagem, slug }: ServicoInsert) => {
        const { error } = await supabase.from("servicos").insert({
          nome, preco, duracao_minutos, url_imagem, barbearia_slug: slug.toLowerCase()
        });
        if (error) throw error;
      },
      onSuccess: (_, vars) => { queryClient.invalidateQueries({ queryKey: ["servicos", vars.slug.toLowerCase()] }); }
    }),
    removerServico: useMutation({
      mutationFn: async ({ id, slug }: ServicoRemove) => {
        const { error } = await supabase.from("servicos").delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess: (_, vars) => { queryClient.invalidateQueries({ queryKey: ["servicos", vars.slug.toLowerCase()] }); }
    })
  };
}

// ==========================================
// 5. DESPESAS
// ==========================================
export function useDespesas(slug?: string) {
  const safeSlug = String(slug || "").trim().toLowerCase();
  return useQuery({
    queryKey: ["despesas", safeSlug],
    queryFn: async () => {
      const { data, error } = await supabase.from("despesas").select("*").ilike("barbearia_slug", safeSlug).gte("data", getInicioBusca());
      if (error) throw error;
      return data || [];
    },
    enabled: !!safeSlug,
  });
}

export function useMutacoesDespesa() {
  const queryClient = useQueryClient();
  return {
    adicionarDespesa: useMutation({
      mutationFn: async ({ descricao, valor, data, slug }: DespesaInsert) => {
        const { error } = await supabase.from("despesas").insert({
          descricao, valor, data, barbearia_slug: slug.toLowerCase()
        });
        if (error) throw error;
      },
      onSuccess: (_, vars) => { queryClient.invalidateQueries({ queryKey: ["despesas", vars.slug.toLowerCase()] }); }
    })
  };
}

// ==========================================
// 6. CLIENTES VIP
// ==========================================
export function useClientesVIP(vendedorId?: string) {
  return useQuery({
    queryKey: ["clientesVIP", vendedorId],
    queryFn: async () => {
      if (!vendedorId) return [];
      const { data, error } = await supabase.from("leads").select("*").eq("vendedor_id", vendedorId).neq("status", "deleted");
      if (error) throw error;
      return (data || []).filter((lead: any) => lead.dados_adicionais?.vip === true);
    },
    enabled: !!vendedorId,
  });
}