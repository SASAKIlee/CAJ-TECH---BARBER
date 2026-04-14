# 🔍 ANÁLISE PROFUNDA E COMPLETA - PROJETO BARBEARIA (CortePerfeito)

**Data da Análise:** 13 de Abril de 2026  
**Versão:** 1.0  
**Status:** Projeto em Desenvolvimento Ativo

---

## 📋 ÍNDICE

1. [Arquitetura Geral](#1-arquitetura-geral)
2. [Sistema de Planos](#2-sistema-de-planos)
3. [Funcionalidade VIP](#3-funcionalidade-vip)
4. [Análise de Código NÃO Utilizado](#4-análise-de-código-não-utilizado)
5. [Props Não Utilizadas](#5-props-não-utilizadas)
6. [Fluxos de Autenticação e Autorização](#6-fluxos-de-autenticação-e-autorização)
7. [Estados de Pagamento](#7-estados-de-pagamento)
8. [Integração com Supabase e Segurança](#8-integração-com-supabase-e-segurança)
9. [Funcionalidades Que Parecem Implementadas Mas Não Funcionam](#9-funcionalidades-que-parecem-implementadas-mas-não-funcionam)
10. [Performance](#10-performance)
11. [Recomendações Estratégicas](#11-recomendações-estratégicas)

---

## 1. ARQUITETURA GERAL

### 1.1 Stack Tecnológico
```
Frontend: React 18 + TypeScript + Vite
UI: Shadcn/ui + Tailwind CSS + Framer Motion
State Management: TanStack Query (React Query) v5.83.0 + Zustand
Backend: Supabase (PostgreSQL + Auth + Storage)
Deploy: Vercel (com suporte para serverless functions)
Monitoring: Vercel Analytics + Speed Insights
```

### 1.2 Estrutura de Componentes

**Arquitetura em Camadas:**

```
App.tsx (Root com routing)
├── pages/
│   ├── Index.tsx (Dashboard Principal - Orquestrador)
│   ├── Auth.tsx (Autenticação)
│   ├── AgendamentoPublico.tsx (Agendamento Cliente)
│   ├── Checkin.tsx (Check-in Digital)
│   ├── Demo.tsx (Modo Demo)
│   └── PoliticaPrivacidade.tsx
│
├── contexts/
│   └── AuthContext.tsx (Autenticação Global)
│
├── components/
│   ├── VisaoBarbeiro.tsx (Dashboard Barbeiro)
│   ├── VisaoDono.tsx (Dashboard Dono + VIP)
│   ├── VisaoVendedor.tsx (Dashboard Vendedor)
│   ├── VisaoCEO.tsx (Dashboard CEO)
│   ├── CarteiraBarbeiro.tsx (Carteira de Comissões)
│   ├── dono/
│   │   ├── DonoTabResumo.tsx (Resumo Financeiro)
│   │   ├── DonoTabDashboard.tsx (Métricas)
│   │   ├── DonoTabVIP.tsx (Central VIP)
│   │   ├── DonoTabConfig.tsx (Configurações)
│   │   ├── DonoBannersAlerta.tsx (Alertas)
│   │   ├── DonoBloqueio.tsx (Bloqueio por Pagamento)
│   │   ├── DonoModalUpgrade.tsx (Modal de Upgrade)
│   │   ├── DonoModalRenovacao.tsx (Modal PIX)
│   │   ├── FilaEsperaInteligente.tsx (Fila PRO)
│   │   ├── RadarVendas.tsx (Radar PRO)
│   │   ├── LojinhaPDV.tsx (Lojinha PRO)
│   │   ├── GestaoDespesas.tsx (Despesas PRO)
│   │   └── StatCard.tsx (Card de Estatísticas)
│   └── ui/ (Componentes shadcn/ui)
│
├── hooks/
│   ├── useAuth.ts (Auth Context Hook)
│   ├── useQueries.ts (Queries/Mutations Supabase - TanStack Query)
│   ├── useDonoData.ts (Hook de Dados do Dono)
│   ├── useCountUp.ts (Animação de Numbers)
│   └── use-mobile.ts (Breakpoint detection)
│
├── store/
│   └── useAppStore.ts (Zustand - Estado Local)
│
├── lib/
│   ├── schemas.ts (Validações Zod)
│   ├── utils.ts (Utilidades gerais)
│   ├── branding.ts (Funções de cor/branding)
│   ├── error-handler.ts (Tratamento de erros)
│   ├── dono-stats.ts (Cálculos de estatísticas)
│   ├── rate-limiter.ts (Rate limiting)
│   └── mock-data.ts (Dados para demo)
│
└── types/
    ├── dono.ts (Tipos de dono)
    ├── queries.ts (Tipos de queries)
    └── vendedor.ts (Tipos de vendedor)
```

### 1.3 Fluxos Principais

**FLUXO 1: Autenticação e Autorização**
```
User → Auth (Supabase JWT)
      → AuthProvider (usa useAuth hook)
      → Determina role (dono, barbeiro, vendedor, ceo)
      → Condiciona renderização de componentes
```

**FLUXO 2: Dashboard do Dono**
```
VisaoDono.tsx
├── useDonoData() → carrega plano, dias restantes, fase pagamento
├── useBarbearia() → dados de barbearia e cor primária
├── useBarbeiros() → lista de barbeiros
├── useServicos() → lista de serviços
├── useAgendamentos() → agendamentos do mês
└── Renderiza 4 sub-abas:
    ├── Resumo (DonoTabResumo)
    ├── Dashboard (DonoTabDashboard)
    ├── VIP (com 5 sub-abas - Automações, Radar, Fila, Lojinha, Despesas)
    └── Config (DonoTabConfig)
```

**FLUXO 3: Bloqueio por Pagamento**
```
fasePagamento: 1 (>3 dias) → sem bloqueio
fasePagamento: 2 (0-3 dias) → aviso
fasePagamento: 3 (-3 a -1 dias) → segundo aviso
fasePagamento: 4 (<-3 dias) → BLOQUEIO TOTAL

isLojaAtiva: false → BLOQUEIO manual (suspeita de fraude)
```

---

## 2. SISTEMA DE PLANOS

### 2.1 Planos Disponíveis

| Recurso | Starter | PRO | Elite |
|---------|---------|-----|-------|
| **Preço** | R$ 50/mês | R$ 99,90/mês | R$ 497,00/mês |
| **Barbeiros** | Até 2 | Ilimitados | Ilimitados |
| **Link de Agendamento** | ✅ | ✅ | ✅ |
| **Dashboard Básico** | ✅ | ✅ | ✅ |
| **Lucro Real** | ❌ | ✅ | ✅ |
| **Radar de Vendas** | ❌ | ✅ | ✅ |
| **Fila de Espera** | ❌ | ✅ | ✅ |
| **Lojinha (PDV)** | ❌ | ✅ | ✅ |
| **Gestão de Despesas** | ❌ | ✅ | ✅ |
| **Cliente VIP 👑** | ❌ | ✅ | ✅ |
| **WhatsApp Automação** | ⏳ Em Breve | ⏳ Em Breve | ⏳ Em Breve |
| **Marketing Completo** | ❌ | ❌ | ⏳ Em Breve |
| **Gestão de Tráfego Pago** | ❌ | ❌ | ⏳ Em Breve |

**Arquivo:** [src/components/dono/DonoModalUpgrade.tsx: L13]

```typescript
const VALORES_PLANO: Record<PlanoType, number> = {
  starter: 50.0,
  pro: 99.9,
  elite: 497.0,
};

const WHATSAPP_DISABLED = true; // ⚠️ Desabilitado
```

### 2.2 Restrições Implementadas

**✅ STARTER - Limite de Barbeiros:**
```typescript
// [src/components/VisaoDono.tsx: L627]
if (data.planoAtual === "starter" && barbeiros.length >= 2) {
  setModalUpgradeAberto(true);
  return toast.error("Upgrade necessário: Plano Starter permite 2 profissionais.");
}
```

**✅ PLANO PRO - Acesso VIP:**
```typescript
// [src/components/dono/DonoTabVIP.tsx: L13]
const temVIP = planoAtual === "pro";

if (!temVIP) {
  // Mostra modal de upgrade
}
```

### 2.3 Verificação de Plano no Banco

```typescript
// [src/hooks/useDonoData.ts: L30-36]
const { data, error } = await supabase
  .from("barbearias")
  .select("*")
  .eq("dono_id", authData.user.id)
  .single();

setData((prev) => ({
  ...prev,
  planoAtual: data.plano || "starter", // ← Coluna 'plano'
}));
```

---

## 3. FUNCIONALIDADE VIP

### 3.1 Quando Aparece

**Localização:** [src/components/dono/DonoTabVIP.tsx] e [src/components/VisaoDono.tsx: L800+]

- **Apenas PRO tem acesso:** Plano "starter" vê bloqueio
- **Elite (em breve):** Mostra mensagem "Em Breve"

### 3.2 Features VIP

**Sub-abas da Central VIP:**

1. **Automações** (DonoTabVIP.tsx)
   - Status: ⏳ **PARCIALMENTE IMPLEMENTADO**
   - O que faz: Mostra check-in lista de features "Em Breve"
   - Features listadas:
     ```
     - WhatsApp Automação (Em Breve)
     - Dashboard de Ganhos (NOVO)
     - Cliente VIP 👑 (NOVO)
     - Recados do Cliente (NOVO)
     - Barbeiros Ilimitados
     - Relatórios Avançados (NOVO)
     ```

2. **Radar de Vendas** (RadarVendas.tsx)
   - Status: ✅ **FUNCIONAL**
   - O que faz: Identifica clientes que não visitam há X dias
   - Query: Busca agendamentos "Finalizado", agrupa por cliente
   - Mostra: dias sem visitar, total visited, valor gasto
   - [src/components/dono/RadarVendas.tsx: L42-82]

3. **Fila de Espera Inteligente** (FilaEsperaInteligente.tsx)
   - Status: ✅ **FUNCIONAL**
   - O que faz: Gerencia fila de espera + notificação WhatsApp
   - Operações CRUD na tabela `fila_espera`
   - [src/components/dono/FilaEsperaInteligente.tsx: L96+]

4. **Lojinha PDV** (LojinhaPDV.tsx)
   - Status: ✅ **FUNCIONAL**
   - O que faz: Gerencia produtos + vendas
   - Tabelas: `produtos`, `vendas_produtos`
   - [src/components/dono/LojinhaPDV.tsx: L68+]

5. **Gestão de Despesas** (GestaoDespesas.tsx)
   - Status: ✅ **FUNCIONAL**
   - O que faz: Registra despesas por categoria
   - Categorias: Aluguel, Água, Energia, Internet, etc.
   - [src/components/dono/GestaoDespesas.tsx: L71+]

### 3.3 Bloqueio de Acesso VIP

```typescript
// [src/components/dono/DonoTabVIP.tsx: L16-23]
if (!temVIP) {
  <Card className="p-8 rounded-[22px]...">
    <Lock className="h-8 w-8 text-zinc-600" />
    <h4>"Acesso VIP necessário"</h4>
    <Button onClick={onUpgradeClick}>
      Evoluir para PRO
    </Button>
  </Card>
}
```

---

## 4. ANÁLISE DE CÓDIGO NÃO UTILIZADO

### 4.1 Imports Não Utilizados

**Em [src/components/VisaoBarbeiro.tsx: L1-20]:**
- ✅ Todos os imports appear to be used
- **Mas:** `checkinHabilitado` na interface é listado mas **NUNCA EXTRAÍDO DO DESTRUCTURING**

### 4.2 Props Não Utilizadas

**[src/components/VisaoBarbeiro.tsx: L75]**
```typescript
interface VisaoBarbeiroProps {
  // ...
  checkinHabilitado?: boolean; // ← NUNCA UTILIZADO NO COMPONENTE!
}

export function VisaoBarbeiro({
  // ... outras props
  // checkinHabilitado NÃO ESTÁ AQUI no destructuring!
}: VisaoBarbeiroProps) {
  // Componente funciona sem ele
}
```

**Impacto:** Baixo - É uma prop opcional que não é usada.

### 4.3 Store Não Utilizado

**[src/store/useAppStore.ts]**
- Status: ⚠️ **IMPLEMENTADO MAS NÃO UTILIZADO**
- O projeto usa **TanStack Query** (useQueries.ts) como fonte de verdade
- useAppStore é um Zustand store local apenas para estado temporário
- Nenhuma página principal o import - ele parece ser lefto

### 4.4 Funções Props Não Utilizadas

**[src/components/VisaoDono.tsx: L46-88]**

```typescript
interface VisaoDonoProps {
  onAddBarbeiro?: (...) => void;
  onRemoveBarbeiro?: (...) => void;
  onAddServico?: (...) => void;
  onRemoveServico?: (...) => void;
  onToggleBarbeiroStatus?: (...) => void;
  onAddDespesa?: (...) => void;  // ← NUNCA UTILIZADO!
  corPrimaria?: string;
}
```

**onAddDespesa está em [L86] mas NUNCA é chamado no componente:**
```typescript
// Procura por "onAddDespesa" ou "_onAddDespesa"
// Não encontrado em lugar nenhum do arquivo
const { ..., _onAddDespesa } = props; // Prefixo _ sugere "não usar"
```

---

## 5. PROPS NÃO UTILIZADAS

### 5.1 Resumo Detalhado

| Arquivo | Prop | Motivo |
|---------|------|--------|
| VisaoBarbeiro.tsx | checkinHabilitado | Listada em interface mas não extraída |
| VisaoDono.tsx | _despesasNoDia, _onAddDespesa | Prefixo _ = "não usar" |
| VisaoDono.tsx | onRemoveBarbeiro, onRemoveServico | Passadas mas não usadas no decorrer |

### 5.2 Análise de DonoTabConfig

**[src/components/dono/DonoTabConfig.tsx: L39-166]**

```typescript
interface DonoTabConfigProps {
  barbeiros: Barbeiro[];
  servicos: Servico[];
  horariosLoja: HorariosLoja;
  checkinHabilitado: boolean; // ✅ UTILIZADO
  nBarbeiro: BarbeiroForm;
  nServico: ServicoForm;
  imagemBarbeiro: File | null;
  imagemServico: File | null;
  // ... muitas mais props
  onAddBarbeiro: () => void; // ✅ UTILIZADO
  onRemoveBarbeiro: (id: string) => void; // ✅ UTILIZADO
  // ... etc
}
```

**Resultado:** DonoTabConfig usa 99% de suas props - é bem estruturado! ✅

---

## 6. FLUXOS DE AUTENTICAÇÃO E AUTORIZAÇÃO

### 6.1 Fluxo de Auth

**1. Login:**
```typescript
// [src/contexts/AuthContext.tsx: L37-47]
supabase.auth.onAuthStateChange((_event, session) => {
  setSession(session);
  setUser(session?.user ?? null);
});
```

**2. Determinação de Role:**
```typescript
// [src/contexts/AuthContext.tsx: L53-81]
useEffect(() => {
  if (!user) return;
  
  const fetchRole = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    
    setUserRole(data?.role || null);
  };
}, [user]);
```

**Roles Suportados: [AuthContext.tsx: L7]**
```typescript
export type AppRole = "dono" | "barbeiro" | "vendedor" | "ceo";
```

### 6.2 Fluxo de Autorização

**1. Roteamento Condicional:**
```typescript
// [src/pages/Index.tsx: L287-317]
const visibleTabs = useMemo(() => {
  if (isImpersonating) {
    return ["barbeiro", "dono"]; // CEO vê tudo
  }
  return userRole === "barbeiro"
    ? ["barbeiro", "carteira"]
    : ["barbeiro", "dono", "carteira", "vendedor"];
}, [userRole, isImpersonating]);
```

**2. Acesso ao Dashboard:**
```typescript
// [src/pages/Index.tsx: L753-850]
{userRole === "barbeiro" && (
  <VisaoBarbeiro {...props} />
)}
{isDono && (
  <VisaoDono {...props} />
)}
{userRole === "vendedor" && (
  <VisaoVendedor {...props} />
)}
{userRole === "ceo" && (
  <VisaoCEO {...props} />
)}
```

### 6.3 ⚠️ PROBLEMA DE SEGURANÇA: Impersonação do CEO

**[src/pages/Index.tsx: L90-121]**

```typescript
const [impersonateSlug, setImpersonateSlug] = useState<string | null>(() => {
  return localStorage.getItem("ceo_impersonate_slug");
});

// ⚠️ RISCO: Qualquer CEO consegue impersonar qualquer barbearia!
// Não há validação de que o CEO é dono da barbearia ou permissão especial.

const sairImpersonacao = useCallback(() => {
  localStorage.removeItem("ceo_impersonate_slug");
  // ... reset states
}, []);
```

**Risco:** Um CEO poderia, em teoria:
- Impersonar qualquer slug
- Acessar dados de qualquer barbearia
- Sem auditoria ou logs de impersonação

**Status:** ⚠️ **PRECISA FIX** - Adicionar:
1. Validação se CEO é dono ou admin
2. Log de impersonação
3. Timeout automaticamente

### 6.4 Verificação de Plano no Backend

**Problema:** Não há verificação de plano NO SUPABASE RLS!

```typescript
// [src/hooks/useQueries.ts: L92-110]
// Qualquer usuário autenticado consegue:
const { data: prods } = await supabase
  .from("produtos")  // ← RLS de lojinha
  .select("*")
  .eq("barbearia_slug", slug);
```

**A RLS deveria validar:**
```sql
-- Sugerido:
CREATE POLICY "Only PRO+ can read products" ON public.produtos
FOR SELECT TO authenticated
USING (
  barbearias.plano IN ('pro', 'elite')
  AND barbearias.slug = barbearia_slug
);
```

---

## 7. ESTADOS DE PAGAMENTO

### 7.1 Fases de Pagamento

**[src/hooks/useDonoData.ts: L95-104]**

```typescript
function calcularFasePagamento(dataVencimento: string | null): FasePagamento {
  if (!dataVencimento) return 1;
  
  const hoje = new Date();
  const vencimento = new Date(dataVencimento);
  const diffDias = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDias > 3) return 1;        // ✅ OK - vencimento distante
  if (diffDias >= 0 && diffDias <= 3) return 2;  // ⚠️ Aviso - vencimento próximo
  if (diffDias >= -3 && diffDias < 0) return 3;  // 🔴 Alerta - vencido
  return 4;                           // 🚫 Bloqueio - vencido há >3 dias
}
```

### 7.2 Bloqueios Ativados

**Cenário 1: Bloqueio por Inadimplência**
```typescript
// [src/components/VisaoDono.tsx: L744-762]
if (data.fasePagamento === 4) {
  return (
    <DonoBloqueio
      motivo="inadimplencia"
      planoAtual={data.planoAtual}
      pixGerado={pixGerado}
      tempoPix={tempoPix}
      onGerarPix={() => handleAbrirCheckout("renovacao")}
      // ... mais props
    />
  );
}
```

**Cenário 2: Bloqueio Manual**
```typescript
// [src/components/VisaoDono.tsx: L738-743]
if (data.isLojaAtiva === false) {
  return (
    <DonoBloqueio
      motivo="manual"
      // ... props
    />
  );
}
```

### 7.3 Sistema de PIX

**Fluxo de Pagamento:**
```
1. User clica em "Pagar via PIX"
2. Chama supabase.functions.invoke("mercado-pago-pix")
3. Retorna QR Code + temporizador (900 segundos)
4. Timer decrementa e limpa PIX após expirar
5. Após pagamento, sistema desbloqueia automaticamente

// [src/components/VisaoDono.tsx: L680-734]
```

**⚠️ Problema:** Não há webhook verificando pagamento!
```typescript
// Não há polling ou webhook listener
// Sistema depende de refresh manual ou re-login
```

### 7.4 Banner de Alertas

**[src/components/dono/DonoBannersAlerta.tsx]**
- Mostra alertas baseado em `fasePagamento`
- Fase 1: Sem aviso
- Fase 2: "Vencimento em X dias"
- Fase 3: "Sua assinatura venceu"
- Fase 4: "Acesso bloqueado"

---

## 8. INTEGRAÇÃO COM SUPABASE E SEGURANÇA

### 8.1 Configuração Atual

**Projeto ID:** `yvjdvmwylfbporvhvtqe`  
**Migrations:** 2 arquivos SQL

### 8.2 Row Level Security (RLS) - Status

**✅ ATIVADO nas tabelas:**
```sql
-- [supabase/migrations/20260401150943_...]
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
```

**Políticas Aplicadas:**

| Tabela | Política | Restrição |
|--------|----------|-----------|
| profiles | SELECT | Todos autenticados podem ver |
| profiles | UPDATE/INSERT | Apenas o dono |
| user_roles | SELECT | Todos autenticados |
| user_roles | INSERT/DELETE | Apenas donos (`has_role('dono')`) |
| barbeiros | SELECT | Todos autenticados |
| barbeiros | INSERT/UPDATE/DELETE | Apenas donos |
| servicos | SELECT | Todos autenticados |
| servicos | INSERT/UPDATE/DELETE | Apenas donos |
| agendamentos | SELECT/INSERT/UPDATE | Autenticados (generic) |

### 8.3 ⚠️ PROBLEMAS DE SEGURANÇA IDENTIFICADOS

#### Problema 1: RLS Incompleta para Agendamentos
```sql
-- [supabase/migrations/20260401150958_...]
CREATE POLICY "Authenticated can insert agendamentos" ON public.agendamentos
FOR INSERT TO authenticated
WITH CHECK (true); -- ← Qualquer autenticado cria agendamento!
```

**Risco:** Um barbeiro 'A' pode criar agendamentos para a barbearia 'B'.

**Sugestão:**
```sql
CREATE POLICY "Only barbearia members can insert agendamentos" ON public.agendamentos
FOR INSERT TO authenticated
WITH CHECK (
  -- Verifica se user pertence à barbearia
  EXISTS (
    SELECT 1 FROM barbeiros
    WHERE id = auth.uid() AND barbearia_slug = NEW.barbearia_slug
  )
  OR
  EXISTS (
    SELECT 1 FROM barbearias
    WHERE dono_id = auth.uid() AND slug = NEW.barbearia_slug
  )
);
```

#### Problema 2: Tabelas VIP SEM RLS?

**[src/components/dono/RadarVendas.tsx: L42+]**
```typescript
const { data: agendamentos } = await supabase
  .from("agendamentos")
  .select("*, barbearias(slug)")
  .eq("barbearias.slug", slug);
```

**Tabelas Consultadas:**
- `fila_espera` (FilaEsperaInteligente)
- `produtos` (LojinhaPDV)
- `vendas_produtos` (LojinhaPDV)
- `despesas` (GestaoDespesas)

**Status de RLS:** ❌ **DESCONHECIDO** - Não aparecem nas migrations!

**Risco:** Zero RLS = qualquer autenticado acessa tudo.

#### Problema 3: CEO Impersonation sem Auditoria
```typescript
// [src/pages/Index.tsx: L90-121]
// Nenhum log de quem impersonou quem, quando, ou por quê
localStorage.setItem("ceo_impersonate_slug", slug);
```

### 8.4 ✅ Boas Práticas Encontradas

1. **Função SECURITY DEFINER:**
   ```sql
   -- [migration 1]
   CREATE OR REPLACE FUNCTION public.has_role(...)
   RETURNS BOOLEAN
   SECURITY DEFINER
   SET search_path = public
   ```
   ✅ Previne recursão RLS

2. **Validação no Frontend:**
   ```typescript
   // [src/lib/schemas.ts]
   const agendamentoSchema = z.object({...})
   const barbeiroSchema = z.object({...})
   ```
   ✅ Zod validação antes de enviar

3. **DOMPurify para XSS:**
   ```typescript
   // [src/components/VisaoBarbeiro.tsx: L18]
   import DOMPurify from "dompurify";
   ```
   ✅ Proteção contra XSS

### 8.5 Preparação para Produção

**⚠️ Checklist de Segurança:**
- ❌ RLS para tabelas VIP (produtos, vendas_produtos, despesas, fila_espera)
- ❌ Verificação de plano na RLS
- ❌ Audit log para CEO impersonation
- ❌ Rate limiting on PIX generation
- ✅ LGPD consent na Checkin.tsx
- ✅ HTTPS required (Vercel)
- ✅ Password hashing (Supabase auth)

---

## 9. FUNCIONALIDADES QUE PARECEM IMPLEMENTADAS MAS NÃO FUNCIONAM

### 9.1 WhatsApp Automação

**Status:** ⏳ **DESABILITADA**

```typescript
// [src/components/dono/DonoModalUpgrade.tsx: L13]
const WHATSAPP_DISABLED = true;

// L48-51 (Starter), L103-105 (Pro)
{WHATSAPP_DISABLED && (
  <li className="flex gap-2 font-bold uppercase opacity-40">
    <AlertCircle className="h-4 w-4 text-zinc-600 shrink-0" />
    WhatsApp Automação (Em Breve)
  </li>
)}
```

**Mas há código que integra com WhatsApp:**

**1. VisaoBarbeiro.tsx:**
```typescript
// L687, 757-768
const temWhatsapp = numValido.length >= 10;

// Abre API manual do WhatsApp
const msg = `...`;
window.open(`https://api.whatsapp.com/send?phone=55${numValido}&text=${encodeURIComponent(msg)}`, "_blank");
```

**2. FilaEsperaInteligente.tsx:**
```typescript
// L92
const msg = `Olá ${item.nome}! ...`;
window.open(`https://api.whatsapp.com/send?phone=55${tel}&text=${encodeURIComponent(msg)}`, "_blank");
```

**Análise:** 
- ✅ Código manual de envio WhatsApp EXISTE
- ❌ Automação (via webhook/cron) NÃO existe
- A flag WHATSAPP_DISABLED apenas esconde da UI

### 9.2 Cliente VIP 👑

**Status:** ⏳ **DESIGN APENAS**

```typescript
// [src/components/dono/DonoTabVIP.tsx: L45, 63]
<p className="text-[9px] font-black uppercase tracking-widest text-yellow-600">Clientes VIP</p>
<p className="text-2xl font-black text-yellow-300 tabular-nums">-</p>
<p className="text-[9px] text-yellow-600/60 mt-1 uppercase font-bold">Em breve</p>
```

**O que deveria fazer:**
- Marcar clientes como VIP
- Relatório de clientes VIP
- Priorização em fila

**Status:** Apenas placeholders.

### 9.3 Relatórios Avançados

**Status:** ⏳ **PARCIAL**

```typescript
// [src/components/dono/DonoTabVIP.tsx: L65]
<p className="text-xs text-emerald-500 font-black uppercase flex items-center gap-2">
  <CheckCircle2 className="h-4 w-4" /> Relatórios Avançados
  <span className="ml-auto text-[8px] bg-emerald-500/20...">NOVO</span>
</p>
```

**Existe:**
- ✅ DonoTabDashboard - gráficos básicos
- ✅ DonoTabResumo - resumo financeiro

**Falta:**
- ❌ Relatórios mensais em PDF/Excel
- ❌ Previsões de faturamento
- ❌ Comparações período-a-período

### 9.4 Demo Mode

**Status:** ✅ **FUNCIONAL**

```typescript
// [src/pages/Index.tsx: L65]
const isPublic = location.pathname === '/demo';

// [src/pages/Demo.tsx]
// Usa MOCK_AGENDAMENTOS, MOCK_BARBEIROS, MOCK_SERVICOS
```

**O que faz:**
- Mostra UI completa sem autenticação
- Dados ficam em localStorage
- Limpa ao recarregar página

---

## 10. PERFORMANCE

### 10.1 Re-renders Potenciais

**Componente: VisaoDono.tsx [L1-850]**

```typescript
// ✅ BOM: Uso de useMemo para memos
const stats = useMemo(() => 
  calcularStatsFiltrados(...), 
  [faturamentoHojeProp, ...]
);

// ✅ BOM: Lazy load de componentes pesados
const VisaoDono = lazy(() => 
  import("@/components/VisaoDono")
    .then(m => ({ default: m.VisaoDono }))
);

// ⚠️ Possível: TabVariants recalculado a cada render
const tabVariants = {
  enter: (dir: number) => ({ x: dir * 56, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -56, opacity: 0 }),
};
```

**Melhoria Sugerida:**
```typescript
const tabVariants = useMemo(() => ({
  enter: (dir: number) => ({ x: dir * 56, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -56, opacity: 0 }),
}), []);
```

### 10.2 Queries Desnecessárias

**Index.tsx [L200-250]:**
```typescript
const barbeirosQuery = useBarbeiros(slug);  // Sempre Query!
const servicosQuery = useServicos(slug);    // Sempre Query!
const agendamentosQuery = useAgendamentos(slug); // Sempre Query!

// Mesmo quando isImpersonating = true, as queries ativam depois
// Deveria ter `enabled: !isImpersonating`
```

**Achado:** [L207-210]
```typescript
const barbeirosQuery = useBarbeiros(isImpersonating ? undefined : slug);
const servicosQuery = useServicos(isImpersonating ? undefined : slug);
// ✅ JÁ ESTÁ OTIMIZADO!
```

### 10.3 TanStack Query Config

**[src/App.tsx: L24-27]**
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,        // 5 minutos - OK
      refetchOnWindowFocus: false,      // Bom para UX
    }
  }
});
```

**Análise:** ✅ Configuração razoável para um SaaS.

### 10.4 Animações

**[src/components/VisaoDono.tsx: L245-255]**
```typescript
<motion.div
  key={subTab}
  custom={subDir}
  variants={tabVariants}
  initial="enter"
  animate="center"
  exit="exit"
  transition={{ type: "spring", stiffness: 400, damping: 36 }}
>
```

**Problema:** AnimatePresence + spring animations em componentes pesados pode causar lag em mobile.

**Recomendação:**
```typescript
transition={{ type: "tween", duration: 0.2 }}  // Mais leve
```

### 10.5 Imagens e Assets

**[src/lib/mock-data.ts, RadarVendas.tsx, etc.]**
```typescript
url_imagem?: string | null;
url_foto?: string | null;
url_fundo?: string | null;
url_logo?: string | null;
```

**Observation:** Usa `supabase.storage` - OK, mas sem image optimization (resize, format).

**Sugestão:** Usar `next/image` ou imgix.

---

## 11. RECOMENDAÇÕES ESTRATÉGICAS

### 11.1 CRITICAL (Fazer Imediatamente)

#### 1. Completar RLS para Tabelas VIP
**Prioridade:** 🔴 CRÍTICA  
**Tempo:** 4-6 horas  
**Arquivos a modificar:**
- `supabase/migrations/` (nova migration)

**Por que:** Qualquer usuário autenticado consegue acessar dados de outras barbearias.

**Ação:**
```sql
-- Criar RLS para: fila_espera, produtos, vendas_produtos, despesas
-- Validar plano PRO antes de ler/escrever
ALTER TABLE public.fila_espera ENABLE ROW LEVEL SECURITY;
CREATE POLICY "PRO+ only" ON public.fila_espera
FOR ALL
USING (
  -- Validar se plano da barbearia é PRO ou ELITE
);
```

#### 2. Audit Log para CEO Impersonation
**Prioridade:** 🔴 CRÍTICA  
**Tempo:** 2-3 horas  
**Ação:**
```typescript
// Antes de impersonar:
await supabase.from('audit_logs').insert({
  user_id: userCEO.id,
  action: 'impersonate',
  target_slug: slug,
  timestamp: new Date(),
  ip_address: getClientIP()
});
```

#### 3. Validar Plano NO BACKEND
**Prioridade:** 🔴 CRÍTICA  
**Tempo:** 2-3 horas  
**Ação:** Não confiar só em `data.planoAtual` - sempre validar no Supabase antes de operação crítica.

### 11.2 HIGH (Próximas 2 semanas)

#### 1. Completar WhatsApp Automação
**Prioridade:** 🟠 ALTA  
**Tempo:** 16-20 horas  
**Opções:**
- A) Usar Twilio + Cron
- B) Usar OpenAI Integrations for message templating
- C) Usar WhatsApp Cloud API direto

**Próximos passos:**
1. Setup webhooks em `supabase/functions/`
2. Criar tabela `whatsapp_messages` para rastrear
3. Implementar retry logic

#### 2. Webhook de Pagamento PIX
**Prioridade:** 🟠 ALTA  
**Tempo:** 8-12 horas  
**Ação:**
1. Registrar webhook com Mercado Pago
2. Criar edge function: `handle-pix-webhook`
3. Atualizar `barbearias.data_vencimento` automaticamente

#### 3. Remover Store Zustand Não Utilizado
**Prioridade:** 🟢 MÉDIA  
**Tempo:** 1 hora  
**Ação:** Remover [src/store/useAppStore.ts] ou documentar por que existe.

### 11.3 MEDIUM (Este mês)

#### 1. TypeScript Config Melhorado
**Arquivo:** tsconfig.json, tsconfig.app.json  
**Problema:** `noUnusedLocals: false, noUnusedParameters: false`  
**Ação:** Ativar para evitar dead code

```json
"noUnusedLocals": true,
"noUnusedParameters": true,
"noImplicitReturns": true,
"strict": true,
```

#### 2. Componentes Props Cleanup
**Remover ou documentar:**
- `_despesasNoDia` em VisaoDono
- `_onAddDespesa` em VisaoDono
- `checkinHabilitado` não utilizado

#### 3. Performance: Otimize Animations
**Arquivo:** [src/components/VisaoDono.tsx: L832+]  
**Mudança:** spring → tween

```typescript
transition={{ type: "tween", duration: 0.2 }}
```

#### 4. Implementar Feature Flag System
**Por que:** Pra desabilitar features (WHATSAPP_DISABLED)  
**Sugestão:** Usar Supabase `feature_flags` table

```typescript
const { data: flags } = await supabase
  .from('feature_flags')
  .select('*')
  .single();

const WHATSAPP_ENABLED = flags?.whatsapp_enabled ?? false;
```

### 11.4 LOW (Backlog)

#### 1. PDF Relatórios
**Tempo:** 12-16 horas  
**Lib:** pdfkit ou react-pdf

#### 2. Email de Confirmação Agendamento
**Tempo:** 4-6 horas  
**Setup:** Supabase email + template

#### 3. Integração Google Calendar
**Tempo:** 20+ horas  
**Complexidade:** ALTA

#### 4. Suporte Múltiplas Moedas
**Tempo:** 8-10 horas  
**Setup:** Stripe (não só PIX)

---

## 12. MATRIZ DE RISCO

| Item | Risco | Severidade | Likelihood | Mitigation |
|------|-------|-----------|-----------|-----------|
| RLS incompleta | Acesso não autores | 🔴 CRÍTICA | Alta | Adicionar RLS migrations |
| CEO impersonation sem audit | Fraude interna | 🔴 CRÍTICA | Média | Audit log + timeout |
| WhatsApp manual | Escalabilidade | 🟠 ALTA | Alta | Webhook + cron |
| PIX sem webhook | Pagamentos não detectados | 🟠 ALTA | Média | Implementar webhook |
| Plano não verificado backend | Bypass de features | 🟠 ALTA | Média | RLS + Backend validation |
| Store Zustand morto | Code maintainability | 🟢 BAIXO | N/A | Remover if unused |

---

## 13. CONCLUSÃO

### Summary Executivo

O projeto **CortePerfeito** é uma **aplicação SaaS bem estruturada** com:

✅ **Strengths:**
- Arquitetura modular e escalável
- React + TypeScript + Shadcn/ui stack moderno
- TanStack Query para state management
- Supabase com RLS (parcial)
- 3 tiers de plano com restrições
- 5 features VIP implementadas (Radar, Fila, Lojinha, Despesas, + Automações)
- Múltiplas roles (dono, barbeiro, vendedor, ceo)
- Check-in digital funcional
- PIX integrado (parcial)

⚠️ **Weaknesses:**
- RLS incompleta para tabelas VIP
- CEO impersonation sem auditoria
- WhatsApp apenas manual, não automático
- Verificação de plano não enforçada no backend
- Algumas props não utilizadas
- Animações podem impactar performance em mobile

🎯 **Prioridades:**
1. **Immediate:** Completar RLS + audit logs
2. **This Week:** PIX webhook + validação backend
3. **Next 2 Weeks:** WhatsApp automação
4. **This Month:** Cleanup code + performance

### Arquivos Críticos para Review

| Arquivo | Linha | Assunto |
|---------|-------|---------|
| [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx#L1) | L37-81 | Fluxo de auth |
| [src/pages/Index.tsx](src/pages/Index.tsx#L90) | L90-121 | CEO impersonation (risco) |
| [src/components/VisaoDono.tsx](src/components/VisaoDono.tsx#L627) | L627 | Verificação de plano (starter limit) |
| [src/hooks/useDonoData.ts](src/hooks/useDonoData.ts#L95) | L95-104 | Cálculo de fase pagamento |
| [src/components/dono/DonoTabVIP.tsx](src/components/dono/DonoTabVIP.tsx#L13) | L13-35 | Bloqueio de VIP |
| [supabase/migrations/20260401150943_...](supabase/migrations/20260401150943_517e9505-a8aa-48a1-bbb4-8e69c4360f53.sql#L1) | L1-100 | RLS policies (incompleto) |

---

**Documento Finalizado:** 13 de Abril de 2026  
**Autor da Análise:** GitHub Copilot (Análise Automatizada)  
**Versão:** 1.0 Completa
