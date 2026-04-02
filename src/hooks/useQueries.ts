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
// 1. BARBEARIA (IDENTIFICAÇÃO)
// ============================================================================
export function useBarbearia() {
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
  });
}

// ============================================================================
// 2. AGENDAMENTOS
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
          ...ag, barbearia_slug: slug, status: "Pendente"
        }).select().single();
        if (error) {
          console.error("Erro no Agendamento:", error.message);
          throw error;
        }
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
// 3. BARBEIROS (GESTÃO DE EQUIPE)
// ============================================================================
export function useMutacoesBarbeiro() {
  const queryClient = useQueryClient();
  return {
    adicionarBarbeiro: useMutation({
      mutationFn: async ({ nome, comissao_pct, email, senha, slug }: any) => {
        // Validação manual para evitar o erro 422 bobo
        if (!email.includes("@")) throw new Error("E-mail inválido.");
        if (senha.length < 6) throw new Error("A senha deve ter no mínimo 6 caracteres.");

        // Criamos o cliente temporário para não deslogar o admin atual
        const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
        
        const { data: authData, error: authError } = await tempSupabase.auth.signUp({ 
          email, 
          password: senha 
        });

        if (authError) throw authError;

        const userId = authData.user!.id;
        
        // Inserções em cascata
        const roleRes = await supabase.from("user_roles").insert({ user_id: userId, role: "barbeiro" });
        if (roleRes.error) throw roleRes.error;

        const barbRes = await supabase.from("barbeiros").insert({ 
          id: userId, 
          nome, 
          comissao_pct, 
          barbearia_slug: slug 
        });
        if (barbRes.error) throw barbRes.error;
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: ["barbeiros", vars.slug] });
        toast.success("Barbeiro cadastrado e liberado! ✂️");
      },
      onError: (err: any) => {
        console.error("Erro no cadastro de Barbeiro:", err);
        toast.error(`Falha no cadastro: ${err.message}`);
      }
    }),
    removerBarbeiro: useMutation({
      mutationFn: async ({ id, slug }: any) => {
        const { error } = await supabase.from("barbeiros").delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: ["barbeiros", vars.slug] });
        toast.success("Barbeiro removido.");
      }
    })
  };
}

// ============================================================================
// 4. SERVIÇOS
// ============================================================================
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
      },
      onError: (err: any) => toast.error(`Erro: ${err.message}`)
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

// ============================================================================
// 5. DESPESAS
// ============================================================================
export function useDespesas(slug?: string) {
  return useQuery({
    queryKey: ["despesas", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("despesas").select("*").eq("barbearia_slug", slug).gte("data", getInicioDoMes()).order("data", { ascending: false });
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
      mutationFn: async ({ nova, slug }: any) => {
        const { error } = await supabase.from("despesas").insert({ ...nova, barbearia_slug: slug });
        if (error) throw error;
      },
      onSuccess: (_, vars) => {
        queryClient.invalidateQueries({ queryKey: ["despesas", vars.slug] });
        toast.success("Despesa lançada!");
      }
    }),
    removerDespesa: useMutation({
      mutationFn: async ({ id, slug }: any) => {
        const { error } = await supabase.from("despesas").delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: ["despesas", vars.slug] })
    })
  };
}