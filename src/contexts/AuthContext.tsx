import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

// 👑 ADICIONADO "ceo" NA INTERFACE
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: "dono" | "barbeiro" | "vendedor" | "ceo" | null;
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
  
  // 👑 ADICIONADO "ceo" NO ESTADO INICIAL
  const [userRole, setUserRole] = useState<"dono" | "barbeiro" | "vendedor" | "ceo" | null>(null);

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

  // Busca o cargo no banco sempre que o usuário mudar
  useEffect(() => {
    if (!user) return;
    
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          // 👑 ADICIONADO "ceo" NO CASTING DE DADOS PARA O TS NÃO RECLAMAR
          setUserRole(data[0].role as "dono" | "barbeiro" | "vendedor" | "ceo");
        } else {
          setUserRole(null);
        }
        setLoading(false);
      });
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