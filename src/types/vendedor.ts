export type StatusCarteira = 'acumulando' | 'fechado' | 'pago';
export type ComissaoTipo = 'percentual' | 'fixo';

export interface Vendedor {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  
  // New Plan-specific commission fields
  comissao_starter?: number;
  comissao_pro?: number;
  comissao_elite?: number;

  mp_access_token?: string | null;
  mp_seller_id?: string | null;
  total_vendas?: number; // Calculado via join ou query separada
}

export interface CarteiraComissao {
  id: string;
  vendedor_id: string;
  mes_referencia: string;
  valor_acumulado: number;
  status: StatusCarteira;
  data_fechamento?: string | null;
  data_pagamento?: string | null;
  vendedor_nome?: string; // Para facilitar a exibição
}
