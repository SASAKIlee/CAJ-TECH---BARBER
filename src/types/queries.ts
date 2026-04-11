// ==========================================
// TIPOS PARA useQueries.ts
// ==========================================

export interface BarbeariaRow {
  id?: string;
  slug?: string;
  nome?: string;
  dono_id?: string;
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
  cor_destaque?: string | null;
  url_fundo?: string | null;
  url_logo?: string | null;
  horario_abertura?: string | null;
  horario_fechamento?: string | null;
  ativo?: boolean | null;
  plano?: string | null;
  data_vencimento?: string | null;
  created_at?: string;
}

export interface AgendamentoInsert {
  nome_cliente: string;
  telefone_cliente: string;
  servico_id: string;
  barbeiro_id: string;
  data: string;
  horario: string;
  status?: string;
  ticket_codigo?: string;
  lgpd_consent?: boolean;
  observacao?: string;
  gorjeta?: number;
  [key: string]: unknown;
}

export interface AgendamentoUpdate {
  id: string;
  status: string;
  comissaoGanha?: number;
  slug: string;
}

export interface BarbeiroInsert {
  nome: string;
  comissao_pct: number;
  email: string;
  senha: string;
  slug: string;
  url_foto?: string | null;
}

export interface BarbeiroStatusUpdate {
  id: string;
  novoStatus: boolean;
  slug: string;
}

export interface BarbeiroMetaUpdate {
  id: string;
  meta: number;
  slug: string;
}

export interface BarbeiroRemove {
  id: string;
  estaAtivo: boolean;
  slug: string;
}

export interface ServicoInsert {
  nome: string;
  preco: number;
  duracao_minutos: number;
  url_imagem?: string | null;
  slug: string;
}

export interface ServicoRemove {
  id: string;
  slug: string;
}

export interface DespesaInsert {
  descricao: string;
  valor: number;
  data: string;
  slug: string;
}

export interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
}

export interface QueryCacheContext {
  anterior: unknown;
}
