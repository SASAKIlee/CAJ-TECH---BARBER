import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

  // Carregar dados da loja
  useEffect(() => {
    async function carregarDadosLoja() {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) return;

      const { data, error } = await supabase
        .from("barbearias")
        .select("*")
        .eq("dono_id", authData.user.id)
        .single();

      if (data && !error) {
        setData((prev) => ({
          ...prev,
          slug: data.slug,
          isLojaAtiva: data.ativo !== false,
          planoAtual: normalizePlano(data.plano),
          checkinHabilitado: data.checkin_habilitado ?? false,
          vipRemindersEnabled: data.vip_reminders_enabled ?? false,
          vipClubEnabled: data.vip_club_enabled ?? false,
          horariosLoja: {
            abertura: data.horario_abertura || "09:00",
            fechamento: data.horario_fechamento || "18:00",
            inicio_almoco: data.pausa_inicio || "12:00",
            fim_almoco: data.pausa_fim || "13:00",
            dias_trabalho: Array.isArray(data.dias_abertos) ? data.dias_abertos : [1, 2, 3, 4, 5, 6],
            datas_fechadas: Array.isArray(data.datas_fechadas) ? data.datas_fechadas : [],
          },
          diasRestantes: data.data_vencimento
            ? Math.ceil((new Date(data.data_vencimento).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null,
          fasePagamento: calcularFasePagamento(data.data_vencimento),
        }));
      }
    }
    carregarDadosLoja();
  }, []);

  // Timer do PIX
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (pixGerado && tempoPix > 0) {
      interval = setInterval(() => setTempoPix((t) => t - 1), 1000);
    } else if (tempoPix === 0) {
      setPixGerado(null);
    }
    return () => clearInterval(interval);
  }, [pixGerado, tempoPix]);

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
