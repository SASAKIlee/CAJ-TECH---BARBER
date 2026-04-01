import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Scissors, Crown } from "lucide-react";
import { toast } from "sonner";

export default function SelecionarPapel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSelect = async (role: "dono" | "barbeiro") => {
    if (!user) return;
    setLoading(true);
    
    try {
      // 1. Salva a função no banco de dados
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role });

      if (error) {
        // Se o erro for que já existe, a gente só segue em frente
        if (error.code !== "23505") throw error;
      }

      toast.success(`Papel definido como ${role === "dono" ? "Dono" : "Barbeiro"}!`);

      // 2. O PULO DO GATO: Em vez de window.location.href, vamos dar um tempo 
      // para o banco processar e então forçar o redirecionamento.
      setTimeout(() => {
        window.location.assign("/"); // Mais suave que o .href
      }, 500);

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao definir papel");
      setLoading(false);
    }
  };

  return (
    <div className="dark min-h-screen bg-background flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Qual é o seu papel?</h1>
          <p className="text-sm text-muted-foreground italic">
            Configurando seu acesso ao CAJ Tec...
          </p>
        </div>

        <div className="space-y-3">
          <Card
            className={`p-5 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all duration-300 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !loading && handleSelect("dono")}
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-bold text-lg">Dono / Gerente</p>
                <p className="text-xs text-muted-foreground">Controle total, equipe e financeiro.</p>
              </div>
            </div>
          </Card>

          <Card
            className={`p-5 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all duration-300 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !loading && handleSelect("barbeiro")}
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center">
                <Scissors className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <p className="font-bold text-lg">Barbeiro</p>
                <p className="text-xs text-muted-foreground">Minha agenda e minhas comissões.</p>
              </div>
            </div>
          </Card>
        </div>

        {loading && (
          <div className="flex flex-col items-center gap-2 pt-4">
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-primary font-medium animate-pulse">Finalizando configuração...</p>
          </div>
        )}
      </div>
    </div>
  );
}