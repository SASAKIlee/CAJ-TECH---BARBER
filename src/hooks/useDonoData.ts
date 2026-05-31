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
// Carregar dados da loja e se inscrever em tempo real
useEffect(() => {
  let authUser: { id: string } | null = null;
  let channel: ReturnType<typeof supabase.channel> | null = null;

  const fetchLoja = async () => {
    if (!authUser) return;
    
    const { data, error } = await supabase
      .from("barbearias")
      .select("*")
      .eq("dono_id", authUser.id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar dados da loja:", error);
      return;
    }

    if (!data) {
      console.log("Nenhuma barbearia encontrada para este dono.");
      return;
    }

    // ✅ Processar os dados da loja
    // Aqui você atualiza o estado com os dados recebidos
    // Exemplo:
    // setDadosLoja(data);
    // setHorariosLoja({
    //   abertura: data.horario_abertura || "09:00",
    //   fechamento: data.horario_fechamento || "18:00",
    //   ...
    // });
  };

  const carregarDadosLoja = async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return;
    authUser = authData.user;

    // ✅ Limpar canal anterior antes de criar um novo
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }

    await fetchLoja();

    channel = supabase
      .channel(`barbearia-dono-${authUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "barbearias",
          filter: `dono_id=eq.${authUser.id}`,
        },
        () => {
          fetchLoja();
        }
      )
      .subscribe();
  };

  carregarDadosLoja();

  // ✅ Cleanup ao desmontar
  return () => {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
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