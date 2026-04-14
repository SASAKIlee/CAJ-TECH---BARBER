# 🔧 GUIA PRÁTICO DE REFATORAÇÃO - CortePerfeito

**Documento de Implementação das Melhorias Identificadas**

---

## PARTE 1: CRÍTICA - Implementar AGORA

### 1.1 Completar RLS Para Tabelas VIP

**Arquivo:** `supabase/migrations/20260410_add_rls_vip_tables.sql`

```sql
-- ============================================
-- RLS PARA FILA_ESPERA
-- ============================================
CREATE TABLE IF NOT EXISTS public.fila_espera (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbearia_id TEXT NOT NULL REFERENCES public.barbearias(slug),
  nome_cliente TEXT NOT NULL,
  telefone TEXT NOT NULL,
  servico_desejado TEXT NOT NULL,
  barbeiro_preferido UUID REFERENCES public.barbeiros(id),
  status TEXT DEFAULT 'aguardando',
  data_inscricao TIMESTAMP DEFAULT now(),
  data_notificacao TIMESTAMP
);

ALTER TABLE public.fila_espera ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only PRO+ barbearias can manage fila" ON public.fila_espera
FOR ALL
USING (
  -- Usuário deve ser dono da barbearia E barbearia must be PRO
  EXISTS (
    SELECT 1 FROM public.barbearias
    WHERE slug = fila_espera.barbearia_id
    AND dono_id = auth.uid()
    AND plano IN ('pro', 'elite')
  )
);

-- ============================================
-- RLS PARA PRODUTOS
-- ============================================
CREATE TABLE IF NOT EXISTS public.produtos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbearia_slug TEXT NOT NULL REFERENCES public.barbearias(slug),
  nome TEXT NOT NULL,
  preco NUMERIC NOT NULL,
  estoque INTEGER DEFAULT 0,
  criado_em TIMESTAMP DEFAULT now()
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only PRO+ can read/write products" ON public.produtos
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.barbearias b
    WHERE b.slug = produtos.barbearia_slug
    AND b.dono_id = auth.uid()
    AND b.plano IN ('pro', 'elite')
  )
);

-- ============================================
-- RLS PARA VENDAS_PRODUTOS
-- ============================================
CREATE TABLE IF NOT EXISTS public.vendas_produtos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbearia_slug TEXT NOT NULL,
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  quantidade INTEGER NOT NULL,
  valor_total NUMERIC NOT NULL,
  data TIMESTAMP DEFAULT now()
);

ALTER TABLE public.vendas_produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only PRO+ can manage sales" ON public.vendas_produtos
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.barbearias b
    WHERE b.slug = vendas_produtos.barbearia_slug
    AND b.dono_id = auth.uid()
    AND b.plano IN ('pro', 'elite')
  )
);

-- ============================================
-- RLS PARA DESPESAS
-- ============================================
CREATE TABLE IF NOT EXISTS public.despesas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  barbearia_slug TEXT NOT NULL REFERENCES public.barbearias(slug),
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  categoria TEXT NOT NULL,
  data DATE NOT NULL,
  criado_em TIMESTAMP DEFAULT now()
);

ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only PRO+ can manage expenses" ON public.despesas
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.barbearias b
    WHERE b.slug = despesas.barbearia_slug
    AND b.dono_id = auth.uid()
    AND b.plano IN ('pro', 'elite')
  )
);
```

---

### 1.2 Adicionar Audit Log Para CEO

**Arquivo:** `supabase/migrations/20260410_audit_logs.sql`

```sql
CREATE TABLE public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'impersonate', 'block', 'upgrade', etc
  target_resource TEXT, -- slug da barbearia
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Apenas o CEO pode ler seus próprios logs
CREATE POLICY "Users can read own logs" ON public.audit_logs
FOR SELECT
USING (
  user_id = auth.uid()
  OR auth.uid() = (SELECT dono_id FROM public.barbearias WHERE slug = (audit_logs.details->>'target_slug'))
);

-- Sistema pode inserir
CREATE POLICY "System can insert logs" ON public.audit_logs
FOR INSERT
WITH CHECK (true);
```

**Uso no TypeScript:**

```typescript
// [src/pages/Index.tsx - dentro de sairImpersonacao]

const logImpersonation = async () => {
  const { data: authData } = await supabase.auth.getUser();
  
  await supabase.from('audit_logs').insert({
    user_id: authData.user.id,
    action: 'impersonate_exit',
    target_resource: impersonateSlug,
    details: {
      impersonate_name: imperssonateName,
      duration_seconds: Math.round((Date.now() - impersonateStartTime) / 1000)
    },
    ip_address: null, // Client-side não consegue IP facilmente
    user_agent: navigator.userAgent
  });
};

const sairImpersonacao = useCallback(async () => {
  await logImpersonation();
  localStorage.removeItem("ceo_impersonate_slug");
  localStorage.removeItem("ceo_impersonate_name");
  setImpersonateSlug(null);
  setImpersonateName(null);
  toast.info("Saindo do modo de visualização...");
}, []);
```

---

### 1.3 Validar Plano NO BACKEND (Request Defender)

**Arquivo:** `src/hooks/useQueries.ts`

```typescript
// Adicionar no topo do arquivo:
const validatePlanBefore = async (slug: string, requiredPlan: 'pro' | 'elite'): Promise<boolean> => {
  const { data: barbearia, error } = await supabase
    .from('barbearias')
    .select('plano')
    .eq('slug', slug)
    .single();

  if (error || !barbearia) {
    throw new Error('Barbearia não encontrada');
  }

  const planoHierarchy = { starter: 0, pro: 1, elite: 2 };
  const currentLevel = planoHierarchy[barbearia.plano as any] || 0;
  const requiredLevel = planoHierarchy[requiredPlan] || 0;

  if (currentLevel < requiredLevel) {
    throw new Error(`Plano ${requiredPlan.toUpperCase()} requerido. Atual: ${barbearia.plano}`);
  }

  return true;
};

// Exemplo: useFila
export function useFilaEspera(slug?: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["fila_espera", slug],
    queryFn: async () => {
      if (!slug) throw new Error("Slug necessário");
      
      // ← NOVO: Validar plano antes
      await validatePlanBefore(slug, 'pro');

      const { data, error } = await supabase
        .from("fila_espera")
        .select("*")
        .eq("barbearia_id", slug)
        .order("data_inscricao");

      if (error) throw error;
      return data || [];
    },
    enabled: !!slug,
  });
}
```

---

## PARTE 2: URGENT - Este Mês

### 2.1 Implementar PIX Webhook

**Arquivo:** `supabase/functions/handle-pix-webhook/index.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.41.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function handlePixWebhook(event: any) {
  // Validar assinatura do Mercado Pago
  const signature = event.headers['x-signature'];
  // ... validar signature

  const { action, data } = event.body;

  if (action === 'payment.created' || action === 'payment.updated') {
    const { external_reference, status, amount } = data;

    if (status === 'approved' || status === 'success') {
      // Parsear reference: "BARBEARIA_ID::PLANO"
      const [barbearia_id, plano] = external_reference.split('::');

      // Calcular nova data de vencimento (30 dias a partir de hoje)
      const newVencimento = new Date();
      newVencimento.setDate(newVencimento.getDate() + 30);

      // Atualizar barbearia
      await supabase
        .from('barbearias')
        .update({
          plano: plano,
          data_vencimento: newVencimento.toISOString(),
          ativo: true, // Desbloquear
        })
        .eq('id', barbearia_id);

      // Log sucesso
      await supabase
        .from('pagamentos')
        .insert({
          barbearia_id,
          plano,
          valor: amount,
          status: 'approved',
          timestamp: new Date(),
        });

      // Enviar email
      await sendEmail({
        to: 'dono@example.com',
        subject: 'Pagamento Confirmado',
        body: `Seu plano ${plano} foi renovado!`
      });
    }
  }

  return { ok: true };
}
```

**Registrar webhook com Mercado Pago:**
```bash
curl -X POST https://api.mercadopago.com/v1/notifications \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d "url=https://seu-projeto.vercel.app/functions/handle-pix-webhook&events=payment.created,payment.updated"
```

---

### 2.2 WhatsApp Automação (Twilio)

**Instalação:**
```bash
npm install twilio
```

**Arquivo:** `src/lib/whatsapp.ts`

```typescript
import twilio from 'twilio';

const accountSid = process.env.VITE_TWILIO_ACCOUNT_SID || '';
const authToken = process.env.VITE_TWILIO_AUTH_TOKEN || '';
const fromNumber = process.env.VITE_TWILIO_PHONE || '';

const client = twilio(accountSid, authToken);

export async function enviarLembreteWhatsApp(
  telefone: string,
  nomeCliente: string,
  nomeServico: string,
  horario: string,
) {
  try {
    await client.messages.create({
      body: `Olá ${nomeCliente}! 👋 Lembrete: você tem um agendamento amanhã às ${horario} para ${nomeServico}. Confirme AQUI: https://seu-site.com/confirmar`,
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:+55${telefone}`, // Validar E.164
    });
    return { success: true };
  } catch (err) {
    console.error('Erro ao enviar WhatsApp:', err);
    return { success: false, error: err.message };
  }
}

export async function notificarFilaEspera(
  telefone: string,
  nomeCliente: string,
  servico: string,
) {
  return enviarLembreteWhatsApp(
    telefone,
    nomeCliente,
    servico,
    'em breve'
  );
}
```

**Integração em FilaEsperaInteligente:**

```typescript
// [src/components/dono/FilaEsperaInteligente.tsx]

import { notificarFilaEspera } from '@/lib/whatsapp';

const handleNotificar = async (item: FilaEspera) => {
  try {
    // Antes: window.open WhatsApp manual
    // Agora: Twilio automático
    
    const result = await notificarFilaEspera(
      item.telefone,
      item.nome_cliente,
      item.servico_desejado
    );

    if (result.success) {
      // Atualizar status
      const { error } = await supabase
        .from("fila_espera")
        .update({ status: "notificado", data_notificacao: new Date() })
        .eq("id", item.id);

      toast.success(`✓ WhatsApp enviado para ${item.nome_cliente}`);
      carregarFila();
    } else {
      toast.error('Erro ao enviar: ' + result.error);
    }
  } catch (err: any) {
    toast.error("Erro: " + err.message);
  }
};
```

---

## PARTE 3: IMPORTANTE - Próximas 2 Semanas

### 3.1 Limpar Props Não Utilizadas

**Arquivo:** `src/components/VisaoDono.tsx`

```typescript
// ❌ REMOVER:
interface VisaoDonoProps {
  despesasNoDia?: number;        // Não utilizado
  onAddDespesa?: (...) => void;  // Não utilizado
  // ... resto OK
}

// Atualizar chamada em Index.tsx:
<VisaoDono
  faturamentoHoje={...}
  // remover: despesasNoDia
  // remover: onAddDespesa
  // ...
/>
```

**Arquivo:** `src/components/VisaoBarbeiro.tsx`

```typescript
// ❌ REMOVER ou USAR:
interface VisaoBarbeiroProps {
  checkinHabilitado?: boolean;  // ESTÁ AQUI mas não é extraído
}

// Opção 1: Usar no componente
export function VisaoBarbeiro({
  // ...
  checkinHabilitado,  // ← Adicionar aqui
}: VisaoBarbeiroProps) {
  // Usar para renderizar QR Code, etc
}

// Opção 2: Remover se não usar
// (remover da interface E da chamada em Index.tsx)
```

---

### 3.2 Melhorar Performance de Animações

**Arquivo:** `src/components/VisaoDono.tsx`

```typescript
// ❌ ANTES:
const tabVariants = {
  enter: (dir: number) => ({ x: dir * 56, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -56, opacity: 0 }),
};

// ✅ DEPOIS:
const tabVariants = useMemo(() => ({
  enter: (dir: number) => ({ x: dir * 56, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -56, opacity: 0 }),
}), []);

// E melhorar transition:
transition={{ 
  type: "tween",  // ← Muda de "spring" para mais controle
  duration: 0.2   // ← Mais rápido
}}
```

---

### 3.3 Implementar Feature Flags

**Arquivo:** `supabase/migrations/20260410_feature_flags.sql`

```sql
CREATE TABLE public.feature_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  description TEXT,
  updated_at TIMESTAMP DEFAULT now()
);

INSERT INTO public.feature_flags (name, enabled, description) VALUES
  ('whatsapp_automacao', false, 'WhatsApp automático via Twilio'),
  ('cliente_vip', false, 'Sistema de classificação VIP'),
  ('relatorios_avancados', true, 'Relatórios em PDF'),
  ('integracao_google_calendar', false, 'Sincronizar com Google Calendar');

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read flags" ON public.feature_flags
FOR SELECT TO authenticated USING (true);
```

**Hook para usar flags:**

```typescript
// [src/hooks/useFeatureFlags.ts]
export function useFeatureFlags() {
  return useQuery({
    queryKey: ["feature_flags"],
    queryFn: async () => {
      const { data } = await supabase.from("feature_flags").select("*");
      return Object.fromEntries(
        (data || []).map(f => [f.name, f.enabled])
      );
    },
    staleTime: 1000 * 60 * 5, // 5 min cache
  });
}

// Uso:
const { data: flags } = useFeatureFlags();

{flags?.whatsapp_automacao && (
  <DonoTabWhatsApp />
)}
```

---

### 3.4 Ativar TypeScript Strict Mode

**Arquivo:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
  }
}
```

**Depois:**
```bash
npm run lint
```

Vai identificar:
- ❌ Props não utilizadas
- ❌ Variáveis mortas
- ❌ Retornos implícitos `undefined`

---

## PARTE 4: BOAS PRÁTICAS - Daqui em Diante

### 4.1 Padrão de Componente Seguro

```typescript
// ✅ BOM:
interface SafeComponentProps {
  userId: string;
  onSuccess?: () => void;
}

export function SafeComponent({ userId, onSuccess }: SafeComponentProps) {
  // Validar permissões SEMPRE
  const { data: user } = useAuth();
  
  useEffect(() => {
    if (user?.id !== userId) {
      throw new Error("Unauthorized");
    }
  }, [user, userId]);

  return (...);
}
```

### 4.2 Padrão de Query com Plan Check

```typescript
// ✅ BOM:
export function usePROMutation(slug: string) {
  return useMutation({
    mutationFn: async (data: any) => {
      // SEMPRE validar plano antes
      await validatePlanBefore(slug, 'pro');
      
      // Then execute
      return await supabase.from(...).insert(data);
    },
  });
}
```

### 4.3 Padrão de Teste (Vitest)

```typescript
// [src/test/plano-validation.test.ts]
import { describe, it, expect } from 'vitest';
import { validatePlanBefore } from '@/hooks/useQueries';

describe('Plan Validation', () => {
  it('should throw for starter on PRO feature', async () => {
    // Mock barbearia com plano starter
    // Expect error when accessing PRO feature
  });

  it('should allow PRO on PRO feature', async () => {
    // Mock barbearia com plano pro
    // Expect success
  });
});
```

---

## PARTE 5: CHECKLISTS P/ CADA ITERAÇÃO

### Semana 1
- [ ] Criar migration RLS para VIP tables
- [ ] Criar audit_logs table
- [ ] Adicionar validatePlanBefore() em useQueries
- [ ] Testar bloqueio de features

### Semana 2
- [ ] Setup Twilio
- [ ] Implementar handle-pix-webhook
- [ ] Testes de webhook
- [ ] Documentação de como registrar webhook

### Semana 3
- [ ] Remover props não utilizadas
- [ ] Ativar TypeScript strict
- [ ] Corrigir todos os erros TS
- [ ] CI/CD com ESLint

### Semana 4
- [ ] Feature flags table + hook
- [ ] Refatorar animações
- [ ] Performance testing
- [ ] Preparar deploy em produção

---

**Próximos Passos:** Escolha uma prioridade e comece! 🚀
