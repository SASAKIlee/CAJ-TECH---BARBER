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

// Variáveis de ambiente (necessárias para criar contas de barbeiro sem deslogar o dono)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

const getInicioDoMes = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

// ==========================================
// 1. BARBEARIA (O coração do SaaS)
// ==========================================
export function useBarbearia(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["barbearia"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não logado");

      // Checa se o usuário é o DONO de alguma barbearia
      const { data: lojaDono } = await supabase.from("barbearias").select("*").eq("dono_id", user.id).maybeSingle();
      
      let lojaData = lojaDono;
      const isDono = !!lojaDono;

      // Se não for dono, checa se é BARBEIRO
      if (!isDono) {
        const { data: barbeiroRef } = await supabase.from("barbeiros").select("barbearia_slug").eq("id", user.id).maybeSingle();
        if (barbeiroRef) {
          const { data: lojaBarb } = await supabase.from("barbearias").select("*").eq("slug", barbeiroRef.barbearia_slug).maybeSingle();
          lojaData = lojaBarb;
        }
      }

      if (!lojaData) throw new Error("Nenhuma barbearia vinculada a esta conta.");

      return {
        slug: lojaData.slug,
        isDono,
        userId: user.id,
        nome: lojaData.nome,
        cor_primaria: lojaData.cor_primaria?.trim() || "#D4AF37",
        cor_secundaria: lojaData.cor_secundaria?.trim() || "#18181B",
        cor_destaque: lojaData.cor_destaque?.trim() || "#FFFFFF",
        url_fundo: lojaData.url_fundo?.trim() || null,
        url_logo: lojaData.url_logo?.trim() || null,
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

  useEffect(() => {
    if (!slug) return;
    const canal = supabase.channel(`agenda-${slug}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agendamentos', filter: `barbearia_slug=eq.${slug}` }, 
      () => { queryClient.invalidateQueries({ queryKey: ["agendamentos", slug] }); })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [slug, queryClient]);

  return useQuery({
    queryKey: ["agendamentos", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("agendamentos").select("*")
        .eq("barbearia_slug", slug).gte("data", getInicioDoMes()).order("horario");
      if (error) throw error;
      return data || [];
    },
    enabled: !!slug,
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
        // Verifica duplicidade usando a chave
        const { data: existing } = await supabase
          .from("agendamentos")
          .select("id")
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();

        if (existing) {
          return { alreadyExists: true };
        }

        // Adiciona a chave e slug a cada agendamento
        const agendamentosComChave = ag.map(item => ({
          ...item,
          idempotency_key: idempotencyKey,
          barbearia_slug: slug,
        }));

        const { error } = await supabase.from("agendamentos").insert(agendamentosComChave);
        if (error) throw error;
        return { success: true };
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: ["agendamentos", vars.slug] });
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
      // Cache Otimista para UX Instantânea
      onMutate: async (novoStatus) => {
        await queryClient.cancelQueries({ queryKey: ["agendamentos", novoStatus.slug] });
        const anterior = queryClient.getQueryData(["agendamentos", novoStatus.slug]);
        queryClient.setQueryData(
          ["agendamentos", novoStatus.slug],
          (velhos: AgendamentoInsert[] | undefined) =>
            velhos?.map((ag) =>
              (ag as unknown as { id: string }).id === novoStatus.id
                ? { ...(ag as object), status: novoStatus.status }
                : ag
            )
        );
        return { anterior };
      },
      onError: (err: SupabaseError, vars: AgendamentoUpdate, context?: QueryCacheContext) => {
        logError(err, "atualizarStatusAgendamento");
        queryClient.setQueryData(["agendamentos", vars.slug], (context as QueryCacheContext)?.anterior);
        toast.error(getErrorMessage(err));
      },
      onSettled: (_data, _error, vars) => {
        if (vars?.slug) {
          queryClient.invalidateQueries({ queryKey: ["agendamentos", vars.slug] });
        }
      }
    })
  };
}

// ==========================================
// 3. BARBEIROS
// ==========================================
export function useBarbeiros(slug?: string) {
  return useQuery({
    queryKey: ["barbeiros", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("barbeiros").select("*").eq("barbearia_slug", slug).order("nome");
      if (error) throw error;
      return data || [];
    },
    enabled: !!slug,
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
          id: userId, nome, comissao_pct, barbearia_slug: slug, ativo: true, url_foto
        });
        if (barbError) throw barbError;
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: ["barbeiros", vars.slug] });
        toast.success("Barbeiro contratado com sucesso!");
      },
      onError: (err: SupabaseError) => {
        logError(err, "adicionarBarbeiro");
        toast.error(getErrorMessage(err));
      }
    }),

    alternarStatusBarbeiro: useMutation({
      mutationFn: async ({ id, novoStatus, slug }: BarbeiroStatusUpdate) => {
        const { error } = await supabase.from("barbeiros").update({ ativo: novoStatus }).eq("id", id);
        if (error) throw error;
      },
      onSuccess: (_, vars) => { queryClient.invalidateQueries({ queryKey: ["barbeiros", vars.slug] }); }
    }),

    atualizarMetaBarbeiro: useMutation({
      mutationFn: async ({ id, meta, slug }: BarbeiroMetaUpdate) => {
        const { error } = await supabase.from("barbeiros").update({ meta_diaria: meta }).eq("id", id);
        if (error) throw error;
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: ["barbeiros", vars.slug] });
        toast.success("Meta diária atualizada! 🎯");
      }
    }),

    removerBarbeiro: useMutation({
      mutationFn: async ({ id, estaAtivo, slug }: BarbeiroRemove) => {
        if (estaAtivo) throw new Error("Desative o barbeiro primeiro.");
        const { error } = await supabase.from("barbeiros").delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: ["barbeiros", vars.slug] });
        toast.success("Barbeiro removido.");
      },
      onError: (err: SupabaseError) => {
        logError(err, "removerBarbeiro");
        toast.error(getErrorMessage(err));
      }
    })
  };
}

// ==========================================
// 4. SERVIÇOS
// ==========================================
export function useServicos(slug?: string) {
  return useQuery({
    queryKey: ["servicos", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("servicos").select("*").eq("barbearia_slug", slug).order("nome");
      if (error) throw error;
      return data || [];
    },
    enabled: !!slug,
  });
}

export function useMutacoesServico() {
  const queryClient = useQueryClient();
  return {
    adicionarServico: useMutation({
      mutationFn: async ({ nome, preco, duracao_minutos, url_imagem, slug }: ServicoInsert) => {
        const { error } = await supabase.from("servicos").insert({
          nome, preco, duracao_minutos, url_imagem, barbearia_slug: slug
        });
        if (error) throw error;
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: ["servicos", vars.slug] });
        toast.success("Serviço na vitrine!");
      }
    }),
    removerServico: useMutation({
      mutationFn: async ({ id, slug }: ServicoRemove) => {
        const { error } = await supabase.from("servicos").delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess: (_, vars) => { queryClient.invalidateQueries({ queryKey: ["servicos", vars.slug] }); }
    })
  };
}

// ==========================================
// 5. DESPESAS (Fluxo de Caixa) 🚀 NOVO
// ==========================================
export function useDespesas(slug?: string) {
  return useQuery({
    queryKey: ["despesas", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("despesas").select("*").eq("barbearia_slug", slug).gte("data", getInicioDoMes());
      if (error) throw error;
      return data || [];
    },
    enabled: !!slug,
  });
}

export function useMutacoesDespesa() {
  const queryClient = useQueryClient();
  return {
    adicionarDespesa: useMutation({
      mutationFn: async ({ descricao, valor, data, slug }: DespesaInsert) => {
        const { error } = await supabase.from("despesas").insert({
          descricao, valor, data, barbearia_slug: slug
        });
        if (error) throw error;
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: ["despesas", vars.slug] });
        toast.success("Despesa registrada no caixa.");
      }
    })
  };
}

// ==========================================
// 6. CLIENTES VIP
// ==========================================
interface LeadRow {
  id?: string;
  vendedor_id?: string;
  status?: string;
  dados_adicionais?: Record<string, unknown> | null;
}

export function useClientesVIP(vendedorId?: string) {
  return useQuery({
    queryKey: ["clientesVIP", vendedorId],
    queryFn: async () => {
      if (!vendedorId) return [];
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("vendedor_id", vendedorId)
        .neq("status", "deleted");

      if (error) throw error;

      // Filtra apenas leads marcados como VIP
      return (data as LeadRow[] || []).filter((lead) => lead.dados_adicionais?.vip === true);
    },
    enabled: !!vendedorId,
  });
}