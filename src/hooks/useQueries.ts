import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

// Type definitions
interface Barbearia {
  slug: string;
  dono_id: string;
}

interface Barbeiro {
  id: string;
  nome: string;
  comissao_pct: number;
  barbearia_slug: string;
}

interface UserRole {
  user_id: string;
  role: "dono" | "barbeiro";
}

// ============================================================================
// 1. GAVETA DA BARBEARIA (Descobre quem tá logado e pega o Slug)
// ============================================================================
export function useBarbearia() {
  return useQuery({
    queryKey: ["barbearia"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não logado");

      // Tenta achar como dono
      const { data: bList, error: bError } = await supabase
        .from("barbearias")
        .select("slug")
        .eq("dono_id", user.id);
      
      if (bError) throw bError;
        
      let slug = bList?.[0]?.slug;
      let isDono = !!slug;

      // Se não for dono, acha como funcionário
      if (!slug) {
        const { data: barbList, error: barbError } = await supabase
          .from("barbeiros")
          .select("barbearia_slug")
          .eq("id", user.id);
          
        if (barbError) throw barbError;
        slug = barbList?.[0]?.barbearia_slug;
        isDono = false;
      }

      if (!slug) throw new Error("Nenhuma barbearia encontrada");
      return { slug, isDono, userId: user.id };
    },
    staleTime: Infinity,
  });
}


// ============================================================================
// 2. GAVETA DOS BARBEIROS (Baixa a lista e guarda no cache)
// ============================================================================
export function useBarbeiros(slug?: string) {
  return useQuery({
    queryKey: ["barbeiros", slug],
    queryFn: async (): Promise<Barbeiro[]> => {
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


// ============================================================================
// 3. AÇÕES DOS BARBEIROS (Adicionar e Deletar)
// ============================================================================
export function useMutacoesBarbeiro() {
  const queryClient = useQueryClient();

  const adicionarBarbeiro = useMutation({
    mutationFn: async ({ nome, comissao, email, senha, slug }: { nome: string; comissao: number; email: string; senha: string; slug: string }) => {
      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({ email, password: senha });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Falha ao criar usuário");

      const { error: roleError } = await supabase.from("user_roles").insert({ user_id: authData.user.id, role: "barbeiro" });
      if (roleError) throw roleError;

      const { data, error }: { data: Barbeiro | null; error: any } = await supabase.from("barbeiros").insert({ 
        id: authData.user.id, nome, comissao_pct: comissao, barbearia_slug: slug 
      }).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variaveis) => {
      queryClient.invalidateQueries({ queryKey: ["barbeiros", variaveis.slug] });
    },
    onError: (erro) => {
      console.error(erro);
      toast.error("Erro ao adicionar o barbeiro no banco de dados.");
    }
  });

  const removerBarbeiro = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("barbeiros").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barbeiros"] });
      toast.success("Barbeiro removido com sucesso!");
    }
  });

  return { adicionarBarbeiro, removerBarbeiro };
}
// ============================================================================
// 4. GAVETA DOS SERVIÇOS
// ============================================================================
export function useServicos(slug?: string) {
  return useQuery({
    queryKey: ["servicos", slug],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("servicos")
        .select("*")
        .eq("barbearia_slug", slug)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
    enabled: !!slug,
  });
}

export function useMutacoesServico() {
  const queryClient = useQueryClient();

  const adicionarServico = useMutation({
    mutationFn: async ({ nome, preco, slug }: any) => {
      const { data, error } = await (supabase as any).from("servicos").insert({ nome, preco, barbearia_slug: slug }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: ["servicos", vars.slug] })
  });

  const removerServico = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("servicos").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["servicos"] })
  });

  return { adicionarServico, removerServico };
}

// ============================================================================
// 5. GAVETA DAS DESPESAS
// ============================================================================
export function useDespesas(slug?: string) {
  return useQuery({
    queryKey: ["despesas", slug],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("despesas")
        .select("*")
        .eq("barbearia_slug", slug)
        .order("data", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!slug,
  });
}

export function useMutacoesDespesa() {
  const queryClient = useQueryClient();

  const adicionarDespesa = useMutation({
    mutationFn: async ({ nova, slug }: any) => {
      const { data, error } = await (supabase as any).from("despesas").insert({ ...nova, barbearia_slug: slug }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: ["despesas", vars.slug] })
  });

  const removerDespesa = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("despesas").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["despesas"] })
  });

  return { adicionarDespesa, removerDespesa };
}

// ============================================================================
// 6. GAVETA DOS AGENDAMENTOS
// ============================================================================
export function useAgendamentos(slug?: string) {
  return useQuery({
    queryKey: ["agendamentos", slug],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("agendamentos")
        .select("*")
        .eq("barbearia_slug", slug)
        .order("horario");
      if (error) throw error;
      return data || [];
    },
    enabled: !!slug,
  });
}

export function useMutacoesAgendamento() {
  const queryClient = useQueryClient();

  const adicionarAgendamento = useMutation({
    mutationFn: async ({ ag, slug }: any) => {
      const { data, error } = await (supabase as any).from("agendamentos").insert({
        data: ag.data, horario: ag.horario, nome_cliente: ag.nomeCliente, telefone_cliente: ag.telefoneCliente,
        barbeiro_id: ag.barbeiroId, servico_id: ag.servicoId, status: "Pendente", barbearia_slug: slug
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => queryClient.invalidateQueries({ queryKey: ["agendamentos", vars.slug] })
  });

  const atualizarStatusAgendamento = useMutation({
    mutationFn: async ({ id, status, comissaoGanha = 0 }: any) => {
      const { error } = await (supabase as any).from("agendamentos").update({ status, comissao_ganha: comissaoGanha }).eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agendamentos"] })
  });

  return { adicionarAgendamento, atualizarStatusAgendamento };
}