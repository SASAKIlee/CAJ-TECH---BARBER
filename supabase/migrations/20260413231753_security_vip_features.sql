-- Security and VIP Features Migration
-- Adds Row Level Security for VIP tables and audit logging

-- ==========================================
-- 1. CREATE BARBEARIAS TABLE (if not exists)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.barbearias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dono_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  plano TEXT NOT NULL DEFAULT 'starter' CHECK (plano IN ('starter', 'pro', 'elite')),
  data_vencimento DATE,
  fase_pagamento INTEGER DEFAULT 1,
  is_ativa BOOLEAN DEFAULT true,
  url_logo TEXT,
  url_fundo TEXT,
  horario_abertura TEXT,
  horario_fechamento TEXT,
  dias_abertos INTEGER[],
  pausa_inicio TEXT,
  pausa_fim TEXT,
  datas_fechadas DATE[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.barbearias ENABLE ROW LEVEL SECURITY;

-- RLS for barbearias
CREATE POLICY "Users can view own barbearia" ON public.barbearias FOR SELECT TO authenticated
  USING (dono_id = auth.uid() OR
         EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ceo'));

CREATE POLICY "Users can update own barbearia" ON public.barbearias FOR UPDATE TO authenticated
  USING (dono_id = auth.uid() OR
         EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ceo'));

CREATE POLICY "Users can insert own barbearia" ON public.barbearias FOR INSERT TO authenticated
  WITH CHECK (dono_id = auth.uid());

-- ==========================================
-- 2. VIP TABLES WITH RLS
-- ==========================================

-- FILA_ESPERA (VIP Feature)
CREATE TABLE IF NOT EXISTS public.fila_espera (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbearia_id TEXT NOT NULL REFERENCES public.barbearias(slug) ON DELETE CASCADE,
  nome_cliente TEXT NOT NULL,
  telefone TEXT,
  servico_solicitado TEXT,
  horario_preferido TEXT,
  status TEXT NOT NULL DEFAULT 'esperando' CHECK (status IN ('esperando', 'atendido', 'cancelado')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fila_espera ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only PRO+ barbearias can manage fila" ON public.fila_espera
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.barbearias
      WHERE slug = fila_espera.barbearia_id
      AND plano IN ('pro', 'elite')
      AND (dono_id = auth.uid() OR
           EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ceo'))
    )
  );

-- PRODUTOS (Lojinha PDV)
CREATE TABLE IF NOT EXISTS public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbearia_slug TEXT NOT NULL REFERENCES public.barbearias(slug) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  preco NUMERIC NOT NULL,
  estoque INTEGER DEFAULT 0,
  url_imagem TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only PRO+ can read/write products" ON public.produtos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.barbearias b
      WHERE b.slug = produtos.barbearia_slug
      AND b.plano IN ('pro', 'elite')
      AND (b.dono_id = auth.uid() OR
           EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ceo'))
    )
  );

-- VENDAS_PRODUTOS (Lojinha PDV)
CREATE TABLE IF NOT EXISTS public.vendas_produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbearia_slug TEXT NOT NULL REFERENCES public.barbearias(slug) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL,
  preco_unitario NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  data_venda DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vendas_produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only PRO+ can manage sales" ON public.vendas_produtos
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.barbearias b
      WHERE b.slug = vendas_produtos.barbearia_slug
      AND b.plano IN ('pro', 'elite')
      AND (b.dono_id = auth.uid() OR
           EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ceo'))
    )
  );

-- DESPESAS (Gestão de Despesas)
CREATE TABLE IF NOT EXISTS public.despesas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbearia_slug TEXT NOT NULL REFERENCES public.barbearias(slug) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  data_despesa DATE NOT NULL DEFAULT CURRENT_DATE,
  recorrente BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only PRO+ can manage expenses" ON public.despesas
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.barbearias b
      WHERE b.slug = despesas.barbearia_slug
      AND b.plano IN ('pro', 'elite')
      AND (b.dono_id = auth.uid() OR
           EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ceo'))
    )
  );

-- ==========================================
-- 3. AUDIT LOGS (Security Tracking)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own logs
CREATE POLICY "Users can read own logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR
         EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ceo') OR
         auth.uid() = (SELECT dono_id FROM public.barbearias WHERE slug = (audit_logs.details->>'target_slug')));

-- System/service can insert logs (for impersonation tracking)
CREATE POLICY "System can insert logs" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- ==========================================
-- 4. UPDATE EXISTING POLICIES (if needed)
-- ==========================================

-- Ensure agendamentos RLS is properly restricted
DROP POLICY IF EXISTS "Authenticated can insert agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Authenticated can update agendamentos" ON public.agendamentos;

CREATE POLICY "Barbeiros can manage agendamentos" ON public.agendamentos
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'dono') OR
    public.has_role(auth.uid(), 'barbeiro') OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ceo')
  );

-- ==========================================
-- 5. INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_fila_espera_barbearia ON public.fila_espera(barbearia_id);
CREATE INDEX IF NOT EXISTS idx_produtos_barbearia ON public.produtos(barbearia_slug);
CREATE INDEX IF NOT EXISTS idx_vendas_produtos_barbearia ON public.vendas_produtos(barbearia_slug);
CREATE INDEX IF NOT EXISTS idx_despesas_barbearia ON public.despesas(barbearia_slug);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_barbearias_dono ON public.barbearias(dono_id);
CREATE INDEX IF NOT EXISTS idx_barbearias_slug ON public.barbearias(slug);