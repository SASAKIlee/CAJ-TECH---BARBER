-- Adicionar colunas para as novas funcionalidades
ALTER TABLE public.agendamentos
ADD COLUMN IF NOT EXISTS gorjeta NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS observacao TEXT;
