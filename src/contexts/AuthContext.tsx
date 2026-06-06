import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type AppRole = "dono" | "barbeiro" | "vendedor" | "ceo";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: AppRole | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  userRole: null,
  signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<AppRole | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
        setUserRole(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    async function fetchRole() {
      try {
        // 1. Busca TODAS as roles do usuário (removido o maybeSingle para evitar erro se tiver mais de 1)
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (error) throw error;

        const roles = (data || []).map(r => r.role as AppRole);

        if (roles.length > 0) {
          // SEGURANÇA: Se for DONO, garante que também seja BARBEIRO no banco de dados
          if (roles.includes("dono") && !roles.includes("barbeiro")) {
            await supabase.from("user_roles").insert({ user_id: user.id, role: "barbeiro" });
            roles.push("barbeiro"); // Adiciona no array local também
          }

          // Garante que o dono também exista na tabela 'barbeiros'
          if (roles.includes("dono")) {
            const { data: barbExists } = await supabase
              .from("barbeiros")
              .select("id")
              .eq("id", user.id)
              .maybeSingle();

            if (!barbExists) {
              // Pega o nome do metadata (caso tenha sido salvo no signup) ou usa o email
              const nomeDono = user.user_metadata?.full_name || user.email?.split('@')[0] || "Dono";

              // Busca o ID da barbearia dele
              const { data: barbeariaData } = await supabase
                .from("barbearias")
                .select("id")
                .eq("dono_id", user.id)
                .maybeSingle();

              if (barbeariaData) {
                await supabase.from("barbeiros").upsert({
                  id: user.id,
                  barbearia_slug: barbeariaData.id,
                  nome: nomeDono,
                  comissao_pct: 0, // Dono não paga comissão pra ele mesmo
                  ativo: true,
                });
              }
            }
          }

          if (isMounted) {
            // Define a role principal para o estado (prioridade: ceo > dono > barbeiro > vendedor)
            if (roles.includes("ceo")) setUserRole("ceo");
            else if (roles.includes("dono")) setUserRole("dono");
            else if (roles.includes("barbeiro")) setUserRole("barbeiro");
            else if (roles.includes("vendedor")) setUserRole("vendedor");
            else setUserRole(null);
          }
        } else {
          // 2. FALLBACK: Se não tem nenhuma role, verifica se é barbeiro
          const { data: barbeiroData } = await supabase
            .from("barbeiros")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();

          if (barbeiroData) {
            await supabase.from("user_roles").insert({ user_id: user.id, role: "barbeiro" });
            if (isMounted) setUserRole("barbeiro");
          } else {
            // 3. Verifica se é dono
            const { data: donoData } = await supabase
              .from("barbearias")
              .select("id")
              .eq("dono_id", user.id)
              .maybeSingle();

            if (donoData) {
              // Insere AMBAS as roles de uma vez
              await supabase.from("user_roles").insert([
                { user_id: user.id, role: "dono" },
                { user_id: user.id, role: "barbeiro" }
              ]);

              // Cria o dono como barbeiro também
              const nomeDono = user.user_metadata?.full_name || user.email?.split('@')[0] || "Dono";
              await supabase.from("barbeiros").upsert({
                id: user.id,
                barbearia_slug: donoData.id,
                nome: nomeDono,
                comissao_pct: 0,
                ativo: true,
              });

              if (isMounted) setUserRole("dono");
            } else {
              if (isMounted) setUserRole(null);
            }
          }
        }
      } catch (err) {
        console.error("Erro ao buscar papel do usuário:", err);
        if (isMounted) setUserRole(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchRole();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, userRole, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}