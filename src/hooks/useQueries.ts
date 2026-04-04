import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { useEffect } from "react";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

const getInicioDoMes = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

// ============================================================================
// 1. BARBEARIA (IDENTIFICAÇÃO E PERMISSÕES)
// ============================================================================
export type UseBarbeariaOptions = {
  enabled?: boolean;
};

export function useBarbearia(options?: UseBarbeariaOptions) {
  return useQuery({
    queryKey: ["barbearia"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não logado");

      const { data: bList } = await supabase.from("barbearias").select("slug").eq("dono_id", user.id);
      let slug = bList?.[0]?.slug;
      let isDono = !!slug;

      if (!slug) {
        const { data: barbList } = await supabase.from("barbeiros").select("barbearia_slug").eq("id", user.id);
        slug = barbList?.[0]?.barbearia_slug;
        isDono = false;
      }

      if (!slug) throw new Error("Nenhuma barbearia vinculada");
      return { slug, isDono, userId: user.id };
    },
    staleTime: Infinity,
    enabled: options?.enabled ?? true,
  });
}

// ============================================================================
// 2. AGENDAMENTOS (AGENDA E REALTIME)
// ============================================================================
export function useAgendamentos(slug?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!slug) return;
    const canal = supabase
      .channel(`agenda-global-${slug}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agendamentos', filter: `barbearia_slug=eq.${slug}` }, 
      () => {
        queryClient.invalidateQueries({ queryKey: ["agendamentos", slug] });
      })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [slug, queryClient]);

  return useQuery({
    queryKey: ["agendamentos", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("*")
        .eq("barbearia_slug", slug)
        .gte("data", getInicioDoMes())
        .order("horario");
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
      mutationFn: async ({ ag, slug }: any) => {
        const { data, error } = await supabase.from("agendamentos").insert({
          ...ag, 
          barbearia_slug: slug, 
          status: "Pendente"
        }).select().single();
        
        if (error) throw error;
        return data;
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: ["agendamentos", vars.slug] });
        toast.success("Agendado com sucesso! ✂️");
      },
      onError: (err: any) => toast.error(`Erro ao agendar: ${err.message}`)
    }),

    atualizarStatusAgendamento: useMutation({
      mutationFn: async ({ id, status, comissaoGanha = 0, slug }: any) => {
        const { error } = await supabase
          .from("agendamentos")
          .update({ status, comissao_ganha: comissaoGanha })
          .eq("id", id);
        if (error) throw error;
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: ["agendamentos", vars.slug] });
        toast.success(`Status atualizado para ${vars.status}`);
      }
    })
  };
}

// ============================================================================
// 3. BARBEIROS (EQUIPE COM REMOÇÃO PROTEGIDA)
// ============================================================================
export function useBarbeiros(slug?: string) {
  return useQuery({
    queryKey: ["barbeiros", slug],
    queryFn: async () => {
      // Agora buscamos a coluna 'ativo' também
      const { data, error } = await supabase
        .from("barbeiros")
        .select("*")
        .eq("barbearia_slug", slug)
        .order("nome");
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
      mutationFn: async ({ nome, comissao_pct, email, senha, slug }: any) => {
        if (!email || !email.includes("@")) throw new Error("E-mail inválido.");
        if (!senha || senha.length < 6) throw new Error("A senha deve ter no mínimo 6 caracteres.");

        const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
        
        const { data: authData, error: authError } = await tempSupabase.auth.signUp({ 
          email, 
          password: senha 
        });

        if (authError) throw authError;
        const userId = authData.user!.id;
        
        const { error: roleError } = await supabase.from("user_roles").insert({ user_id: userId, role: "barbeiro" });
        if (roleError) throw roleError;

        const { error: barbError } = await supabase.from("barbeiros").insert({ 
          id: userId, nome, comissao_pct, barbearia_slug: slug, ativo: true 
        });
        if (barbError) throw barbError;
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: ["barbeiros", vars.slug] });
        toast.success("Barbeiro cadastrado!");
      },
      onError: (err: any) => toast.error(`Falha no cadastro: ${err.message}`)
    }),

    // NOVA LÓGICA: ATIVAR/DESATIVAR
    alternarStatusBarbeiro: useMutation({
      mutationFn: async ({ id, novoStatus, slug }: any) => {
        const { error } = await supabase
          .from("barbeiros")
          .update({ ativo: novoStatus })
          .eq("id", id);
        if (error) throw error;
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: ["barbeiros", vars.slug] });
        toast.success(vars.novoStatus ? "Barbeiro ativado!" : "Barbeiro desativado!");
      }
    }),

    // REMOÇÃO PROTEGIDA: SÓ DELETA SE ESTIVER DESATIVADO
    removerBarbeiro: useMutation({
      mutationFn: async ({ id, estaAtivo, slug }: any) => {
        if (estaAtivo) {
          throw new Error("Não é possível remover um barbeiro ATIVO. Desative-o primeiro.");
        }
        
        const { error } = await supabase.from("barbeiros").delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: ["barbeiros", vars.slug] });
        toast.success("Barbeiro e agenda removidos com sucesso.");
      },
      onError: (err: any) => toast.error(err.message)
    })
  };
}

// ============================================================================
// 4. SERVIÇOS (TABELA DE PREÇOS)
// ============================================================================
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
      mutationFn: async ({ nome, preco, slug }: any) => {
        const { error } = await supabase.from("servicos").insert({ nome, preco, barbearia_slug: slug });
        if (error) throw error;
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: ["servicos", vars.slug] });
        toast.success("Serviço adicionado!");
      }
    }),
    removerServico: useMutation({
      mutationFn: async ({ id, slug }: any) => {
        const { error } = await supabase.from("servicos").delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: ["servicos", vars.slug] });
        toast.success("Serviço removido!");
      }
    })
  };
}