# 📊 DIAGRAMAS E VISUALIZAÇÕES - CortePerfeito

Visualizações da arquitetura, fluxos e dependências do projeto.

---

## 1. DIAGRAMA DE ARQUITETURA GERAL

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vite + React)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ App.tsx (Router Principal)                               │   │
│  │  ├─ /auth → Auth.tsx                                    │   │
│  │  ├─ / → Index.tsx (Dashboard Orquestrador)             │   │
│  │  ├─ /agendar/:slug → AgendamentoPublico.tsx            │   │
│  │  ├─ /checkin/:slug/:ticket → Checkin.tsx               │   │
│  │  └─ /demo → Demo.tsx                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          ↓                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ AuthProvider (Context) - useAuth                         │   │
│  │  ├─ user: User | null                                   │   │
│  │  ├─ session: Session | null                             │   │
│  │  └─ userRole: "dono" | "barbeiro" | "vendedor" | "ceo" │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          ↓                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Index.tsx (Renderiza abas conforme role)                │   │
│  │  ├─ barbeiro → VisaoBarbeiro                            │   │
│  │  ├─ dono → VisaoDono + VIP                              │   │
│  │  ├─ vendedor → VisaoVendedor                            │   │
│  │  └─ ceo → VisaoCEO                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│                     HOOKS & STATE MANAGEMENT                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ useQueries() │  │ useDonoData()│  │ useAuth()            │  │
│  │              │  │              │  │                      │  │
│  │ TanStack Q.  │  │ Hook local + │  │ Context Hook         │  │
│  │ (Queries/    │  │ localStorage │  │                      │  │
│  │  Mutations)  │  │              │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│       ↓                   ↓                   ↓                   │
└───────┼───────────────────┼───────────────────┼──────────────────┘
        │                   │                   │
        │                   │                   │
┌───────┼───────────────────┼───────────────────┼──────────────────┐
│       ↓                   ↓                   ↓                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ SUPABASE (Backend as a Service)                          │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │                                                           │   │
│  │ ┌─ Auth (JWT)                                            │   │
│  │ │   └─ user_roles table (RLS)                            │   │
│  │ │       ├─ dono                                          │   │
│  │ │       ├─ barbeiro                                      │   │
│  │ │       ├─ vendedor                                      │   │
│  │ │       └─ ceo                                           │   │
│  │ │                                                        │   │
│  │ ├─ Database (PostgreSQL)                                │   │
│  │ │   ├─ profiles (RLS ✅)                                 │   │
│  │ │   ├─ user_roles (RLS ✅)                               │   │
│  │ │   ├─ barbearias                                       │   │
│  │ │   ├─ barbeiros (RLS ✅)                                │   │
│  │ │   ├─ servicos (RLS ✅)                                 │   │
│  │ │   ├─ agendamentos (RLS ✅ Completa)                 │   │
│  │ │   ├─ fila_espera (RLS ✅ Completa)                   │   │
│  │ │   ├─ produtos (RLS ✅ Completa)                      │   │
│  │ │   ├─ vendas_produtos (RLS ✅ Completa)               │   │
│  │ │   ├─ despesas (RLS ✅ Completa)                      │   │
│  │ │   ├─ audit_logs (RLS ✅ Completa)                    │   │
│  │ │   └─ feature_flags (RLS ❌ Não existe)                 │   │
│  │ │                                                        │   │
│  │ ├─ Storage (Files)                                      │   │
│  │ │   ├─ /barbearias (logos, fundos)                      │   │
│  │ │   ├─ /equipe (fotos barbeiro)                         │   │
│  │ │   └─ /servicos (imagens serviço)                      │   │
│  │ │                                                        │   │
│  │ └─ Realtime (Subscriptions)                            │   │
│  │     └─ Monitora mudanças em agendamentos                │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  External Services:                                              │
│  ┌────────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ Mercado Pago API   │  │  Vercel          │  │ Analytics    │ │
│  │ (PIX)              │  │  (Deploy + Edge) │  │ (Speed/Rev)  │ │
│  └────────────────────┘  └──────────────────┘  └──────────────┘ │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 2. FLUXO DE AUTENTICAÇÃO

```
┌─────────────┐
│   USER      │
└─────┬───────┘
      │
      │ 1. Submit email + senha
      ↓
┌─────────────────────────────┐
│ Auth.tsx (Página)           │
│ - Form validation (Zod)     │
│ - supabase.auth.signIn()    │
└─────┬───────────────────────┘
      │
      │ 2. Supabase JWT
      ↓
┌─────────────────────────────┐
│ Supabase Auth (JWT)         │
│ - Valida credenciais        │
│ - Cria session              │
│ - Retorna token             │
└─────┬───────────────────────┘
      │
      │ 3. JWT Token armazenado
      ↓
┌─────────────────────────────┐
│ AuthProvider (Context)      │
│ - Escuta auth state change  │
│ - setSession(), setUser()   │
└─────┬───────────────────────┘
      │
      │ 4. Query user_roles
      ↓
┌─────────────────────────────┐
│ Supabase: SELECT role       │
│ FROM user_roles WHERE user_id = ?
│                             │
│ ✅ Resultado: "dono"        │
│ ✅ Resultado: "barbeiro"    │
│ ✅ Resultado: "vendedor"    │
│ ✅ Resultado: "ceo"         │
│ ❌ Resultado: null (sem role)
└─────┬───────────────────────┘
      │
      │ 5. setUserRole()
      ↓
┌─────────────────────────────┐
│ AuthContext value:          │
│ {                           │
│   user: User,               │
│   userRole: "dono",  ← HERE │
│   loading: false,           │
│   signOut: Function         │
│ }                           │
└─────┬───────────────────────┘
      │
      │ 6. Consome no Index.tsx
      ↓
┌─────────────────────────────┐
│ Renderização Condicional:   │
│ if (userRole === "dono") {  │
│   <VisaoDono />             │
│ } else if (...) {           │
│   <VisaoBarbeiro />         │
│ }                           │
└─────────────────────────────┘

FLUXO DE SEGURANÇA:
       ↓
┌─────────────────────────┐
│ RLS Policies Ativadas   │
│ Cada query verifica:    │
│ - Usuário autenticado? │
│ - Tem permissão?        │
│ - Dados pertencem a ele?│
└─────────────────────────┘
```

---

## 3. FLUXO DE PLANOS E VIP

```
┌──────────────────────────────────────────────────────────────────┐
│                    BARBEARIA (usuário dono)                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. LOGIN → AuthProvider → Determina userRole = "dono"           │
│                                                                   │
│  2. Index.tsx → Renderiza VisaoDono                              │
│                                                                   │
│  3. VisaoDono.tsx                                                │
│     ├─ useDonoData() → Busca:                                    │
│     │  ├─ planoAtual: "starter" | "pro" | "elite"               │
│     │  ├─ data_vencimento: Date                                  │
│     │  ├─ fasePagamento: 1 | 2 | 3 | 4                           │
│     │  └─ isLojaAtiva: boolean                                   │
│     │                                                             │
│     └─ Renderização Condicional:                                 │
│        │                                                          │
│        ├─ IF isLojaAtiva === false                               │
│        │  └─ <DonoBloqueio motivo="manual" />  (BLOQ)           │
│        │                                                          │
│        ├─ IF fasePagamento === 4  (>3 dias vencido)             │
│        │  └─ <DonoBloqueio motivo="inadimplencia" /> (BLOQ)     │
│        │                                                          │
│        └─ ELSE (OK)                                              │
│           └─ Renderiza 4 sub-abas:                               │
│                                                                   │
│              ┌─────────────────────────────────────────┐          │
│              │ 1. RESUMO (DonoTabResumo)               │          │
│              │    - Faturamento dia                    │          │
│              │    - Comissões                          │          │
│              │    - Lucro real                         │          │
│              │    ✅ Disponível: Todos os planos       │          │
│              └─────────────────────────────────────────┘          │
│                                                                   │
│              ┌─────────────────────────────────────────┐          │
│              │ 2. DASHBOARD (DonoTabDashboard)         │          │
│              │    - Gráficos de comissão/equipe       │          │
│              │    - Filtro por barbeiro                │          │
│              │    ✅ Disponível: Todos os planos       │          │
│              └─────────────────────────────────────────┘          │
│                                                                   │
│              ┌─────────────────────────────────────────┐          │
│              │ 3. VIP (DonoTabVIP)                     │          │
│              │                                         │          │
│              │ ┌─────────────────────────────────────┐│          │
│              │ │ STARTER | ELITE → Bloqueado ❌     ││          │
│              │ │ - Modal dizendo "Upgrade necessário"││          │
│              │ │ - Botão "Evoluir para PRO"         ││          │
│              │ └─────────────────────────────────────┘│          │
│              │                                         │          │
│              │ ┌─────────────────────────────────────┐│          │
│              │ │ PRO → Sub-abas ✅                   ││          │
│              │ │                                     ││          │
│              │ │ a) Automações (parcial)            ││          │
│              │ │    - Lista features "Em Breve"     ││          │
│              │ │    - WhatsApp (desabilitado)       ││          │
│              │ │                                     ││          │
│              │ │ b) Radar de Vendas (✅ funcional)   ││          │
│              │ │    - Clientes não visitam >X dias   ││          │
│              │ │    - Query: agendamentos finalizados││          │
│              │ │                                     ││          │
│              │ │ c) Fila de Espera (✅ funcional)    ││          │
│              │ │    - CRUD fila_espera               ││          │
│              │ │    - Notificação WhatsApp           ││          │
│              │ │                                     ││          │
│              │ │ d) Lojinha PDV (✅ funcional)       ││          │
│              │ │    - Gerenciar produtos             ││          │
│              │ │    - Registrar vendas               ││          │
│              │ │    - Controle estoque               ││          │
│              │ │                                     ││          │
│              │ │ e) Despesas (✅ funcional)          ││          │
│              │ │    - CRUD despesas                  ││          │
│              │ │    - Categorias                     ││          │
│              │ │    - Filtro por período             ││          │
│              │ └─────────────────────────────────────┘│          │
│              │                                         │          │
│              │ ELITE → "Em Breve" (opacidade 50%)     │          │
│              │ - Marketing Completo                   │          │
│              │ - Gestão de Tráfego Pago               │          │
│              │                                         │          │
│              └─────────────────────────────────────────┘          │
│                                                                   │
│              ┌─────────────────────────────────────────┐          │
│              │ 4. CONFIG (DonoTabConfig)               │          │
│              │    - Barbeiros (CRUD)                 │          │
│              │    - Serviços (CRUD)                  │          │
│              │    - Horários                          │          │
│              │    - Data de fechamento                │          │
│              │    - Branding (logo, fundo)           │          │
│              │    - Gerenciar Check-in                │          │
│              │                                         │          │
│              │    ✅ Disponível: Todos os planos      │          │
│              │                                         │          │
│              │    RESTRICÃO (Starter):                │          │
│              │    ├─ Máximo 2 barbeiros               │          │
│              │    └─ if (length >= 2) {               │          │
│              │        showModalUpgrade()              │          │
│              │       }                                │          │
│              └─────────────────────────────────────────┘          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. FLUXO DE PAGAMENTO (PIX)

```
┌───────────────────────────────────────────────────────────────┐
│ BARBEARIA DONO - Próximo ao vencimento                        │
│                                                               │
│ useDonoData() → data_vencimento = "2026-04-14"               │
│                 fasePagamento = 2 (0-3 dias)                 │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ↓
┌───────────────────────────────────────────────────────────────┐
│ DonoBannersAlerta                                             │
│ Mostra: "Sua assinatura vence em 2 dias"                     │
│ Botão: [Renovar Agora]                                        │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ├─ Click: "Renovar Agora"
                        │
                        ↓
┌───────────────────────────────────────────────────────────────┐
│ VisaoDono.tsx: handleAbrirCheckout("renovacao")              │
│                                                               │
│ - setModalPagamentoAberto(true)                              │
│ - setPlanoPagamento(data.planoAtual)  // "starter", "pro", etc
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ↓
┌───────────────────────────────────────────────────────────────┐
│ DonoModalRenovacao                                            │
│ - Exibe valor: R$ 50.00 (starter) / R$ 99.90 (pro) / etc    │
│ - Botão: [Gerar PIX]                                          │
│                                                               │
│ Click: onGerarPix()                                           │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ↓
┌───────────────────────────────────────────────────────────────┐
│ VisaoDono.tsx: handleGerarPixDinâmico()                       │
│                                                               │
│ 1. Chamada API:                                               │
│    supabase.functions.invoke("mercado-pago-pix", {           │
│      barbearia_id: "xxx",                                    │
│      plano: "pro",                                            │
│      email_dono: "..."                                        │
│    })                                                         │
│                                                               │
│ 2. Supabase Function retorna:                                 │
│    { qr_code: "00020126..." }                                │
│                                                               │
│ 3. Frontend:                                                  │
│    - setPixGerado(qr_code)                                   │
│    - setTempoPix(900)  // 15 minutos                         │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ↓
┌───────────────────────────────────────────────────────────────┐
│ DonoModalRenovacao - PIX Gerado                              │
│                                                               │
│ Exibe:                                                        │
│ - QR Code                                                     │
│ - Código PIX Copia e Cola                                     │
│ - Timer: 15:00, 14:59, ... (decrementa a cada segundo)       │
│ - Botão: [Copiar PIX]                                         │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        ├─ Timer atinge 0
                        │  └─ Limpa automaticamente
                        │
                        └─ User escaneia QR code ou copia código
                           │
                           ↓
                ┌──────────────────────────────┐
                │ Mercado Pago (External API)  │
                │ - Recebe pagamento           │
                │ - Marca como "approved"      │
                └──────────────────────────────┘
                           │
                           ├─ ⚠️ PROBLEMA:
                           │   SEM WEBHOOK!
                           │   Frontend NÃO sabe que pagou
                           │
                           └─ Só desbloqueia se:
                              ├─ User recarrega página
                              ├─ User faz login novamente
                              └─ Espera cron job noturno
                                 (não implementado)

┌───────────────────────────────────────────────────────────────┐
│ ✅ O QUE DEVERIA ACONTECER:                                   │
│                                                               │
│ 1. User envia PIX                                             │
│ 2. Mercado Pago chama webhook:                                │
│    POST /api/handle-pix-webhook {status: "approved"}         │
│ 3. Backend (Supabase Edge Function) atualiza:                │
│    UPDATE barbearias SET                                      │
│      plano = 'pro',                                           │
│      data_vencimento = NOW() + 30 days,                      │
│      ativo = true                                             │
│    WHERE id = '...'                                           │
│ 4. Frontend é notificado (Realtime ou polling)                │
│ 5. Desbloqueia automaticamente e mostra sucesso               │
└───────────────────────────────────────────────────────────────┘
```

---

## 5. HIERARQUIA DE COMPONENTES (VisaoDono)

```
VisaoDono.tsx (850 linhas)
│
├─ Props:
│  ├─ faturamentoHoje: number
│  ├─ comissoesAPagarHoje: number
│  ├─ barbeiros: Barbeiro[]
│  ├─ servicos: Servico[]
│  ├─ onAddBarbeiro: Function
│  ├─ onRemoveBarbeiro: Function
│  ├─ onAddServico: Function
│  └─ ... 6 mais
│
├─ State:
│  ├─ subTab: "resumo" | "dashboard" | "vip" | "config"
│  ├─ subDir: 1 | -1 (animação direção)
│  ├─ vipSubTab: "radar" | "fila" | "lojinha" | "despesas" | "automacoes"
│  ├─ data: { planoAtual, fasePagamento, horariosLoja, ... }
│  ├─ pixGerado: string | null
│  ├─ modalUpgradeAberto: boolean
│  └─ ... 15 mais
│
├─ Hooks:
│  ├─ useDonoData() → data, updateData, pixGerado, tempoPix
│  ├─ useCallback() × 10 (otimização)
│  ├─ useMemo() × 2
│  └─ useEffect() × 1 (buscar aviso global)
│
├─ Render Condicional:
│  │
│  ├─ if (isLojaAtiva === false)
│  │  └─ <DonoBloqueio motivo="manual" />
│  │
│  ├─ if (fasePagamento === 4)
│  │  └─ <DonoBloqueio motivo="inadimplencia" />
│  │
│  └─ else
│     │
│     ├─ <DonoBannersAlerta />
│     │
│     ├─ Tabs (sticky):
│     │  ├─ Resumo
│     │  ├─ Métricas
│     │  ├─ VIP
│     │  └─ Ajustes
│     │
│     ├─ if (subTab === "resumo")
│     │  └─ <DonoTabResumo stats={stats} />
│     │
│     ├─ if (subTab === "dashboard")
│     │  └─ <DonoTabDashboard
│     │      stats={stats}
│     │      barbeiros={barbeiros}
│     │      onFiltroChange={setBarbeiroFiltroId}
│     │     />
│     │
│     ├─ if (subTab === "vip")
│     │  │
│     │  ├─ Sub-tabs VIP:
│     │  │  ├─ Automações
│     │  │  ├─ Radar
│     │  │  ├─ Fila
│     │  │  ├─ Lojinha
│     │  │  └─ Despesas
│     │  │
│     │  └─ if (vipSubTab === "radar")
│     │     └─ <RadarVendas slug={data.slug} />
│     │
│     │  ├─ if (vipSubTab === "fila")
│     │  │  └─ <FilaEsperaInteligente
│     │  │      slug={data.slug}
│     │  │      barbeiros={barbeiros}
│     │  │     />
│     │  │
│     │  ├─ if (vipSubTab === "lojinha")
│     │  │  └─ <LojinhaPDV slug={data.slug} />
│     │  │
│     │  ├─ if (vipSubTab === "despesas")
│     │  │  └─ <GestaoDespesas
│     │  │      slug={data.slug}
│     │  │      faturamentoMes={faturamentoMensalProp}
│     │  │     />
│     │  │
│     │  └─ if (vipSubTab === "automacoes")
│     │     └─ <DonoTabVIP
│     │         planoAtual={data.planoAtual}
│     │        />
│     │
│     └─ if (subTab === "config")
│        └─ <DonoTabConfig
│            barbeiros={barbeiros}
│            servicos={servicos}
│            horariosLoja={data.horariosLoja}
│            nBarbeiro={nBarbeiro}
│            nServico={nServico}
│            planoAtual={data.planoAtual}
│            ... 15 mais props
│           />
│
└─ Modals:
   ├─ <DonoModalUpgrade
   │   open={modalUpgradeAberto}
   │   planoAtual={data.planoAtual}
   │   onUpgrade={handleUpgradeClick}
   │  />
   │
   └─ <DonoModalRenovacao
       open={modalPagamentoAberto}
       pixGerado={pixGerado}
       tempoPix={tempoPix}
       onGerarPix={handleGerarPixDinâmico}
       onCopiarPix={copiarPix}
      />
```

---

## 6. MATRIZ DE RLS (Row Level Security)

```
┌─────────────────────────┬──────────┬─────────┬────────────┬──────────┐
│ Tabela                  │ SELECT   │ INSERT  │ UPDATE     │ DELETE   │
├─────────────────────────┼──────────┼─────────┼────────────┼──────────┤
│ profiles                │ ✅ALL    │ ✅SELF  │ ✅SELF     │ ❌       │
│ user_roles              │ ✅ALL    │ ✅DONO  │ ✅DONO     │ ✅DONO   │
│ barbearias              │ ✅ALL    │ ✅CEO   │ ✅DONO     │ ✅CEO    │
│ barbeiros               │ ✅ALL    │ ✅DONO  │ ✅DONO     │ ✅DONO   │
│ servicos                │ ✅ALL    │ ✅DONO  │ ✅DONO     │ ✅DONO   │
│ agendamentos            │ ✅ALL    │ ✅AUTH  │ ✅AUTH     │ ✅AUTH   │
│ fila_espera             │ ✅DONO   │ ✅DONO  │ ✅DONO     │ ✅DONO   │
│ produtos                │ ✅DONO   │ ✅DONO  │ ✅DONO     │ ✅DONO   │
│ vendas_produtos         │ ✅DONO   │ ✅DONO  │ ✅DONO     │ ✅DONO   │
│ despesas                │ ✅DONO   │ ✅DONO  │ ✅DONO     │ ✅DONO   │
│ audit_logs              │ ✅CEO    │ ✅SYS   │ ❌         │ ✅CEO    │
└─────────────────────────┴──────────┴─────────┴────────────┴──────────┘

LEGENDAS:
✅ = OK / Seguro e Configurada
❌ = Não aplicável (auditoria não permite deleção)

STATUS ATUAL: TODAS AS RLS IMPLEMENTADAS ✅
```

---

## 7. FLUXO DE CHECKIN DIGITAL

```
┌─────────────────────────────────────────────────────┐
│ CLIENTE                                             │
│ Recebe SMS/WhatsApp com link:                       │
│ https://barbearia.com/checkin/seuslug/TICKET123    │
└────────────────────┬────────────────────────────────┘
                     │
                     ↓ Click no link
┌────────────────────────────────────────────────────┐
│ Checkin.tsx                                        │
│                                                    │
│ 1. Extract params:                                 │
│    slug = "seuslug"                                │
│    ticket = "TICKET123"                            │
│                                                    │
│ 2. Validações:                                     │
│    - User autenticado?                             │
│    - Barbearia tem check-in habilitado?             │
│    - Ticket existe e é válido?                     │
│    - Agendamento não foi cancelado?                 │
│    - Check-in já realizado?                        │
│                                                    │
│ 3. Se tudo OK:                                     │
│    - Busca agendamento completo                    │
│    - Gera PIN: hash do ticket_codigo               │
│    - Exibe: Detalhes do agendamento               │
│            + Horário                              │
│            + Barbeiro                             │
│            + Serviço                              │
│            + PIN                                  │
│                                                    │
│ 4. User vê tela:                                  │
│    ┌─────────────────────────────┐                │
│    │ Seu Agendamento             │                │
│    │                             │                │
│    │ Carlos (Barbeiro)           │                │
│    │ Corte Degradê               │                │
│    │ 15:30 (hoje)                │                │
│    │                             │                │
│    │ PIN: 1234                   │                │
│    │                             │                │
│    │ [Confirmar Check-in]         │                │
│    └─────────────────────────────┘                │
│      ↓ Click                                       │
│    Atualiza status:                               │
│    status → "Check-in"                            │
│    comissao_ganha → Calcula (preco * comissao%)   │
└────────────────────────────────────────────────────┘
```

---

## 8. DEPENDÊNCIAS DE ESTADO (Index.tsx)

```
┌──────────────────────────┐
│ useAuth() [AuthContext]  │
│ - user: User             │
│ - userRole: Role         │
│ - loading: boolean       │
└────────────┬─────────────┘
             │
             ├─ Determina qual visão renderizar
             │  ├─ VisaoBarbeiro
             │  ├─ VisaoDono
             │  ├─ VisaoVendedor
             │  └─ VisaoCEO
             │
             └─ Habilita queries:
                ├─ barbiariaQueryEnabled = userRole !== "ceo" && userRole !== "vendedor"
                ├─ useBarbearia(barbiariaQueryEnabled)
                ├─ useBarbeiros(slug)
                ├─ useServicos(slug)
                ├─ useAgendamentos(slug)
                └─ useClientesVIP(user?.id)


┌──────────────────────────────────────────┐
│ Queries (TanStack Query + Supabase)      │
│                                          │
│ Dependências: slug (de barbearia)        │
│                                          │
│ ├─ barbeiros[] → Renderiz Abas View      │
│ ├─ servicos[] → Renderiz Abas View       │
│ ├─ agendamentos[] → Calcs Stats          │
│ │                → Realtime listening    │
│ │                                        │
│ └─ clientesVIP[] → Carteira (opcional)   │
│                                          │
│ Cache: 5 minutos                         │
│ Refetch on window focus: NO              │
│ Refetch interval: realtime subs          │
└──────────────────────────────────────────┘
         │
         ├─ Computed Stats (useMemo)
         │  ├─ calcularStatsFiltrados()
         │  └─ Agregações:
         │     ├─ Faturamento dia
         │     ├─ Comissões
         │     ├─ Lucro
         │     └─ Top barbeiro
         │
         └─ Tab State (useState)
            ├─ tab: string
            ├─ tabSlideDir: 1 | -1
            ├─ barbeiroSelecionadoId: string
            └─ dataFiltro: string


┌────────────────────────────────────┐
│ Impersonação (CEO only)            │
│                                    │
│ impersonateSlug → localStorage     │
│ impersonateName → localStorage     │
│ loadingImpersonate → state         │
│                                    │
│ IF impersonateSLug:                │
│  └─ Carrega tudo manualmente       │
│     (não usa queries)              │
└────────────────────────────────────┘
```

---

## 9. CHECKLIST DE SEGURANÇA

```
AUTENTICAÇÃO:
☐ ✅ Supabase JWT
☐ ✅ Session storage
☐ ✅ Logout function
☐ ✅ Protected routes

AUTORIZAÇÃO:
☐ ✅ Role-based access (dono, barbeiro, etc)
☐ ⚠️ Plan-based access (RLS incompleta)
☐ ❌ Audit log para ações críticas
☐ ⚠️ CEO impersonation (sem auditoria)

SUPABASE RLS:
☐ ✅ profiles ENABLE RLS
☐ ✅ user_roles ENABLE RLS
☐ ✅ barbeiros ENABLE RLS
☐ ✅ servicos ENABLE RLS
☐ ⚠️ agendamentos (incompleta)
☐ ❌ fila_espera NÃO ENABLE
☐ ❌ produtos NÃO ENABLE
☐ ❌ vendas_produtos NÃO ENABLE
☐ ❌ despesas NÃO ENABLE

DADOS SENSÍVEIS:
☐ ✅ PIX em modal seguro
☐ ✅ Senhas não expostas
☐ ⚠️ Email de dono visível
☐ ✅ Storage com autenticação

VALIDAÇÃO:
☐ ✅ Frontend: Zod schemas
☐ ⚠️ Backend: RLS (incompleta)
☐ ⚠️ LGPD: Apenas em Checkin
☐ ✅ XSS: DOMPurify

INTEGRAÇÃO EXTERNA:
☐ ✅ PIX via Mercado Pago (parcial)
☐ ⚠️ PIX sem webhook
☐ ⚠️ WhatsApp manual (não automático)
☐ ⏳ Twilio (não implementado)
```

---

**Documento de Visualização Completo** 📊

Use este documento junto com ANALISE_COMPLETA.md para entender a arquitetura visualmente.
