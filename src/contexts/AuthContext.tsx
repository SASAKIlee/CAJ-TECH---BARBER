import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

// 🚀 CLEAN CODE: Definimos os cargos em um lugar só. Se criar um novo, muda só aqui!
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
  signOut: async () => {},
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

  // 🚀 BLINDAGEM: Busca o cargo com async/await e Try/Catch (Evita o loading infinito)
  useEffect(() => {
    if (!user) return;

    let isMounted = true; // Previne vazamento de memória se o componente desmontar

    async function fetchRole() {
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user!.id)
          .maybeSingle();

        if (error) throw error;

        if (isMounted) {
          if (data) {
            setUserRole(data.role as AppRole);
          } else {
            setUserRole(null);
          }
        }
      } catch (err) {
        console.error("Erro ao buscar papel do usuário:", err);
        if (isMounted) setUserRole(null);
      } finally {
        if (isMounted) setLoading(false); // 🛡️ GARANTE que o loading vai parar, mesmo se der erro
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