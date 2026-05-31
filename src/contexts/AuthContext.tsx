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
        // 1. Busca a role na tabela user_roles
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;

        if (isMounted) {
          if (data?.role) {
            setUserRole(data.role as AppRole);
          } else {
            // 2. FALLBACK: Se não tem role, verifica se é barbeiro
            const { data: barbeiroData } = await supabase
              .from("barbeiros")
              .select("id")
              .eq("id", user.id)
              .maybeSingle();

            if (barbeiroData) {
              // É barbeiro mas está sem role → corrige automaticamente
              await supabase.from("user_roles").insert({ user_id: user.id, role: "barbeiro" });
              setUserRole("barbeiro");
            } else {
              // 3. Verifica se é dono
              const { data: donoData } = await supabase
                .from("barbearias")
                .select("id")
                .eq("dono_id", user.id)
                .maybeSingle();

              if (donoData) {
                await supabase.from("user_roles").insert({ user_id: user.id, role: "dono" });
                setUserRole("dono");
              } else {
                setUserRole(null);
              }
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