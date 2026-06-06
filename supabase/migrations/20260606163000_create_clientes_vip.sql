-- Migration: Create clientes_vip table
-- Description: Adds a table for custom VIP clients and configures its RLS policies.

CREATE TABLE IF NOT EXISTS public.clientes_vip (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbearia_slug TEXT NOT NULL REFERENCES public.barbearias(slug) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  observacao TEXT,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_vip_barbearia_telefone UNIQUE(barbearia_slug, telefone)
);

-- Active RLS
ALTER TABLE public.clientes_vip ENABLE ROW LEVEL SECURITY;

-- Select/Insert/Update/Delete policy for PRO/ELITE plan owners
CREATE POLICY "Only PRO+ can manage VIP clients" ON public.clientes_vip
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.barbearias b
      WHERE b.slug = clientes_vip.barbearia_slug
      AND b.plano IN ('pro', 'elite')
      AND (b.dono_id = auth.uid() OR
           EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'ceo'))
    )
  );

-- Indexes for search speed
CREATE INDEX IF NOT EXISTS idx_clientes_vip_barbearia ON public.clientes_vip(barbearia_slug);
