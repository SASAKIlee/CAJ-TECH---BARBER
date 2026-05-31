import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PlanoType, HorariosLoja, FasePagamento } from "@/types/dono";

export interface DonoData {
  slug: string;
  isLojaAtiva: boolean | null;
  planoAtual: PlanoType;
  checkinHabilitado: boolean;
  vipRemindersEnabled: boolean;
  vipClubEnabled: boolean;
  horariosLoja: HorariosLoja;
  diasRestantes: number | null;
  fasePagamento: FasePagamento;
}

/**
 * Hook para carregar dados da barbearia do dono e gerenciar timer do PIX.
 */
export function useDonoData() {
  const [data, setData] = useState<DonoData>({
    slug: "",
    isLojaAtiva: null,
    planoAtual: "starter",
    checkinHabilitado: false,
    vipRemindersEnabled: false,
    vipClubEnabled: false,
    horariosLoja: {
      abertura: "09:00",
      fechamento: "18:00",
      dias_trabalho: [1, 2, 3, 4, 5, 6],
      inicio_almoco: "12:00",
      fim_almoco: "13:00",
      datas_fechadas: [],
    },
    diasRestantes: null,
    fasePagamento: 1,
  });

  const [pixGerado, setPixGerado] = useState<string | null>(null);
  const [tempoPix, setTempoPix] = useState(900);

  // Carregar dados da loja e se inscrever em tempo real
  useEffect(() => {
  let channel: ReturnType<typeof supabase.channel> | null = null;
  let mounted = true;

  const carregarTudo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !mounted) return;

    // 1. Busca os dados da loja
    const { data: loja } = await supabase
      .from("barbearias")
      .select("*")
      .eq("dono_id", user.id)
      .maybeSingle();

    if (!mounted) return;

    if (loja) {
      setData((prev) => ({
        ...prev,
        slug: loja.slug,
        isLojaAtiva: loja.ativo !== false,
        planoAtual: normalizePlano(loja.plano),
        // ... preencha os outros campos do seu state aqui
      }));

      // 2. Só cria o canal se a loja existir e NÃO houver um canal ativo
      if (!channel) {
        channel = supabase
          .channel(`perfil-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "barbearias",
              filter: `dono_id=eq.${user.id}`,
            },
            () => carregarTudo() // Recarrega se mudar
          );
        
        // Inscreve por último
        channel.subscribe();
      }
    }
  };

  carregarTudo();

  return () => {
    mounted = false;
    if (channel) {
      supabase.removeChannel(channel);
    }
  };
}, []);

  // Timer do PIX — rodando limpo, sem re-criar intervalo
  useEffect(() => {
    if (!pixGerado) return;

    const interval = setInterval(() => {
      setTempoPix((prev) => {
        if (prev <= 1) {
          setPixGerado(null);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pixGerado]);

  const updateData = (updates: Partial<DonoData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  return {
    data,
    updateData,
    pixGerado,
    setPixGerado,
    tempoPix,
    setTempoPix,
  };
}

/** Garante comparação de plano estável (DB pode enviar PRO/pro, etc.). */
function normalizePlano(raw: unknown): PlanoType {
  const p = String(raw ?? "starter").toLowerCase().trim();
  if (p === "pro" || p === "elite" || p === "starter") return p;
  return "starter";
}

function calcularFasePagamento(dataVencimento: string | null): FasePagamento {
  if (!dataVencimento) return 1;
  const hoje = new Date();
  const vencimento = new Date(dataVencimento);
  const diffDias = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDias > 3) return 1;
  if (diffDias >= 0 && diffDias <= 3) return 2;
  if (diffDias >= -3 && diffDias < 0) return 3;
  return 4;
}