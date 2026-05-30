import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.41.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Tratar requisições preflight do CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const mpAccessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase URL or Service Role key is missing.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();

    console.log("Recebendo webhook do Mercado Pago:", JSON.stringify(body));

    // O Mercado Pago envia notificações contendo o tipo do recurso e seu respectivo id
    // O payload padrão de notificação tem: { "action": "payment.created", "data": { "id": "123456" } } ou { "type": "payment", "data": { "id": "123456" } }
    const paymentId = body.data?.id || body.id;
    const actionType = body.action || body.type;

    if (!paymentId || (actionType && !actionType.includes("payment"))) {
      return new Response(JSON.stringify({ message: "Ignorado. Não é um evento de pagamento." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!mpAccessToken) {
      throw new Error("MERCADO_PAGO_ACCESS_TOKEN não está configurado nas variáveis de ambiente do Supabase.");
    }

    // Consulta direta à API do Mercado Pago para evitar fraudes (Server-to-Server validation)
    const mpUrl = `https://api.mercadopago.com/v1/payments/${paymentId}`;
    const mpResponse = await fetch(mpUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
      },
    });

    if (!mpResponse.ok) {
      throw new Error(`Erro ao consultar o pagamento ${paymentId} no Mercado Pago: ${mpResponse.statusText}`);
    }

    const paymentData = await mpResponse.json();
    console.log("Dados do pagamento consultado:", JSON.stringify(paymentData));

    const status = paymentData.status;
    const externalReference = paymentData.external_reference; // Esperado: "barbearia_uuid::plano"

    if (status === "approved" && externalReference) {
      const parts = externalReference.split("::");
      if (parts.length < 2) {
        throw new Error(`Referência externa inválida: ${externalReference}`);
      }

      const [barbeariaId, plano] = parts;
      console.log(`Pagamento aprovado para a barbearia ${barbeariaId} no plano ${plano}`);

      // Calcular nova data de vencimento (hoje + 30 dias)
      const dataVencimento = new Date();
      dataVencimento.setDate(dataVencimento.getDate() + 30);
      const dataVencimentoStr = dataVencimento.toISOString().split("T")[0]; // Formato YYYY-MM-DD

      // Atualizar a barbearia no banco de dados (Service Role ultrapassa RLS com segurança)
      const { error: updateError } = await supabase
        .from("barbearias")
        .update({
          plano: plano.toLowerCase(),
          data_vencimento: dataVencimentoStr,
          ativo: true,
          fase_pagamento: 1, // Redefine para OK
          updated_at: new Date().toISOString(),
        })
        .eq("id", barbeariaId);

      if (updateError) {
        throw updateError;
      }

      // Logar o sucesso no banco para fins financeiros
      await supabase.from("audit_logs").insert({
        action: "payment_approved",
        details: {
          payment_id: paymentId,
          barbearia_id: barbeariaId,
          plano: plano,
          amount: paymentData.transaction_amount,
        },
      });

      console.log(`Barbearia ${barbeariaId} reativada com sucesso! Vencimento definido para ${dataVencimentoStr}`);

      return new Response(JSON.stringify({ success: true, message: "Barbearia ativada com sucesso!" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ success: false, message: `Status do pagamento é ${status}. Nenhuma ação tomada.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("Erro no processamento do webhook:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
