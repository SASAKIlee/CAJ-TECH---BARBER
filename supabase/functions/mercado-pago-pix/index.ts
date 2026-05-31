// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!MP_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Variáveis de ambiente não configuradas.");
    }

    const body = await req.json();

    // MODO 1: WEBHOOK
    if (body.type === "payment" && body.data?.id) {
      const paymentId = body.data.id;

      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
      });

      if (!mpResponse.ok) {
        throw new Error(`Erro ao consultar pagamento: ${mpResponse.status}`);
      }

      const payment = await mpResponse.json();

      if (payment.status === "approved") {
        const externalRef = payment.external_reference;
        if (!externalRef) {
          return new Response(JSON.stringify({ received: true }), { headers: corsHeaders, status: 200 });
        }

        const [barbeariaId, plano] = externalRef.split("|");
        if (!barbeariaId) {
          return new Response(JSON.stringify({ received: true }), { headers: corsHeaders, status: 200 });
        }

        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const novaData = new Date();
        novaData.setDate(novaData.getDate() + 30);

        const updateData: Record<string, unknown> = {
          data_vencimento: novaData.toISOString(),
          ativo: true,
        };
        if (plano) updateData.plano = plano;

        const { error: dbError } = await supabaseAdmin
          .from("barbearias")
          .update(updateData)
          .eq("id", barbeariaId);

        if (dbError) {
          console.error("[Webhook] Erro:", dbError.message);
        } else {
          console.log(`[Webhook] Barbearia ${barbeariaId} renovada`);
        }
      }

      return new Response(JSON.stringify({ received: true }), { headers: corsHeaders, status: 200 });
    }

    // MODO 2: CRIAR PIX
    const { barbearia_id, plano, email_dono } = body;

    if (!barbearia_id || !plano || !email_dono) {
      throw new Error("Campos obrigatórios: barbearia_id, plano, email_dono");
    }

    const valores: Record<string, number> = {
      starter: 35.0,
      pro: 50.0,
      elite: 497.0,
    };
    const valor = valores[plano];
    if (!valor) throw new Error(`Plano inválido: ${plano}`);

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        transaction_amount: valor,
        description: `Plano ${plano.toUpperCase()} - CAJ TECH`,
        payment_method_id: "pix",
        payer: { email: email_dono },
        external_reference: `${barbearia_id}|${plano}`,
        notification_url: `${SUPABASE_URL}/functions/v1/mercado-pago-pix`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao gerar PIX: ${errorText}`);
    }

    const payment = await response.json();

    const qrCode = payment.point_of_interaction?.transaction_data?.qr_code;

    return new Response(
      JSON.stringify({
        success: true,
        qr_code: qrCode,
        copiaECola: qrCode,
        pix_copy_paste: qrCode,
        status: payment.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[ERRO]:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});