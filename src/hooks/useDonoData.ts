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
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let mounted = true;

    const init = async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user || !mounted) return;

      const userId = authData.user.id;

      // Buscar dados iniciais
      const { data: lojaData, error: lojaError } = await supabase
        .from("barbearias")
        .select("*")
        .eq("dono_id", userId)
        .maybeSingle();

      if (!mounted) return;

      if (lojaError) {
        console.error("Erro ao carregar dados da loja:", lojaError);
        return;
      }

      if (!lojaData) {
        console.log("Nenhuma barbearia encontrada para este dono.");
        return;
      }

      // ✅ ATUALIZE SEU ESTADO AQUI
      // Exemplo (adapte para os campos que você usa):
      // updateData({
      //   slug: lojaData.slug,
      //   planoAtual: lojaData.plano,
      //   isLojaAtiva: lojaData.ativo,
      //   checkinHabilitado: lojaData.checkin_habilitado ?? false,
      //   horariosLoja: {
      //     abertura: lojaData.horario_abertura || "",
      //     fechamento: lojaData.horario_fechamento || "",
      //     inicio_almoco: lojaData.pausa_inicio || "",
      //     fim_almoco: lojaData.pausa_fim || "",
      //     dias_trabalho: lojaData.dias_abertos || [],
      //     datas_fechadas: lojaData.datas_fechadas || [],
      //   },
      //   fasePagamento: lojaData.fase_pagamento ?? 1,
      //   diasRestantes: lojaData.dias_restantes ?? 0,
      // });

      // Inscrever em mudanças em tempo real
      channel = supabase
        .channel(`barbearia-dono-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "barbearias",
            filter: `dono_id=eq.${userId}`,
          },
          async (payload) => {
            if (!mounted) return;

            // Se for UPDATE, usa o payload direto (mais rápido)
            if (payload.eventType === "UPDATE" && payload.new) {
              const d = payload.new as Record<string, unknown>;
              // ✅ ATUALIZE SEU ESTADO AQUI (REALTIME UPDATE)
              // updateData({
              //   slug: d.slug as string,
              //   planoAtual: d.plano as string,
              //   isLojaAtiva: d.ativo as boolean,
              //   checkinHabilitado: d.checkin_habilitado as boolean,
              //   horariosLoja: {
              //     abertura: (d.horario_abertura as string) || "",
              //     fechamento: (d.horario_fechamento as string) || "",
              //     inicio_almoco: (d.pausa_inicio as string) || "",
              //     fim_almoco: (d.pausa_fim as string) || "",
              //     dias_trabalho: (d.dias_abertos as number[]) || [],
              //     datas_fechadas: (d.datas_fechadas as string[]) || [],
              //   },
              //   fasePagamento: (d.fase_pagamento as number) ?? 1,
              //   diasRestantes: (d.dias_restantes as number) ?? 0,
              // });
            } else {
              // Para INSERT ou DELETE, busca no banco
              const { data: freshData } = await supabase
                .from("barbearias")
                .select("*")
                .eq("dono_id", userId)
                .maybeSingle();

              if (freshData && mounted) {
                // ✅ ATUALIZE SEU ESTADO AQUI (REFETCH)
                // updateData({ ... });
              }
            }
          }
        )
        .subscribe();
    };

    init();

    // Cleanup ao desmontar
    return () => {
      mounted = false;
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