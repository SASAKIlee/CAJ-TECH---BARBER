// ==========================================
// TIPOS PARA VisaoDono E COMPONENTES FILHOS
// ==========================================

export type DonoSubTab = "resumo" | "dashboard" | "vip" | "config";
export type PlanoType = "starter" | "pro" | "elite";
export type FasePagamento = 1 | 2 | 3 | 4;

export interface Barbeiro {
  id: string;
  nome: string;
  ativo: boolean;
  comissao_pct?: number;
  url_foto?: string | null;
  barbearia_slug?: string;
  meta_diaria?: number;
}

export interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao_minutos: number;
  url_imagem?: string | null;
  barbearia_slug?: string;
}

export interface ComissaoBarbeiroItem {
  barbeiro: { id: string; nome: string };
  total: number;
}

export interface HorariosLoja {
  abertura: string;
  fechamento: string;
  dias_trabalho: number[];
  inicio_almoco: string;
  fim_almoco: string;
  datas_fechadas: string[];
}

export interface BarbeiroForm {
  nome: string;
  comissao: string;
  email: string;
  senha: string;
}

export interface ServicoForm {
  nome: string;
  preco: string;
  duracao_minutos: string;
}

export interface DonoStatsProps {
  faturamentoHoje: number;
  comissoesAPagarHoje: number;
  lucroRealHoje: number;
  faturamentoMensal: number;
  comissaoPorBarbeiroHoje: ComissaoBarbeiroItem[];
  barbeiros: Barbeiro[];
  barbeiroFiltroId: string;
}

export interface DonoStatsFiltrados {
  faturamentoHoje: number;
  comissoesAPagarHoje: number;
  lucroRealHoje: number;
  faturamentoMensal: number;
  comissaoPorBarbeiroFiltrada: ComissaoBarbeiroItem[];
  dataEquipe: { name: string; Total: number }[];
  hasDataEquipe: boolean;
  topBarbeiro: { name: string; Total: number } | null;
  barbeirosAtivosHoje: number;
  mediaPorBarbeiro: string;
  margemLucro: number;
  hasDataFinanceiro: boolean;
  dataFinanceiro: { name: string; value: number }[];
}

export interface DonoTabResumoProps {
  slug: string;
  stats: DonoStatsFiltrados;
  brand: string;
  ctaFg: string;
  glass: React.CSSProperties;
}

export interface DonoTabDashboardProps {
  stats: DonoStatsFiltrados;
  barbeiros: Barbeiro[];
  barbeiroFiltroId: string;
  onFiltroChange: (id: string) => void;
  brand: string;
  ctaFg: string;
  glass: React.CSSProperties;
}

export interface DonoTabVIPProps {
  planoAtual: PlanoType;
  onUpgradeClick: () => void;
  brand: string;
  glass: React.CSSProperties;
}

export interface DonoTabConfigProps {
  barbeiros: Barbeiro[];
  servicos: Servico[];
  horariosLoja: HorariosLoja;
  checkinHabilitado: boolean;
  nBarbeiro: BarbeiroForm;
  nServico: ServicoForm;
  imagemBarbeiro: File | null;
  imagemServico: File | null;
  imagemLogo: File | null;
  imagemFundo: File | null;
  novaDataFechada: string;
  isUploadingBarbeiro: boolean;
  isUploadingServico: boolean;
  isUploadingBranding: boolean;
  isSavingHorario: boolean;
  planoAtual: PlanoType;
  brand: string;
  ctaFg: string;
  glass: React.CSSProperties;
  onCheckinChange: (enabled: boolean) => void;
  onNBarbeiroChange: (form: BarbeiroForm) => void;
  onNServicoChange: (form: ServicoForm) => void;
  onImagemBarbeiroChange: (file: File | null) => void;
  onImagemServicoChange: (file: File | null) => void;
  onImagemLogoChange: (file: File | null) => void;
  onImagemFundoChange: (file: File | null) => void;
  onNovaDataFechadaChange: (data: string) => void;
  onToggleDiaSemana: (id: number) => void;
  onAddDataFechada: () => void;
  onRemoveDataFechada: (data: string) => void;
  onSaveHorarios: () => void;
  onSaveBranding: () => void;
  onAddBarbeiro: () => void;
  onAddServico: () => void;
  onToggleBarbeiroStatus: (id: string, ativo: boolean) => void;
  onRemoveBarbeiro: (id: string) => void;
  onRemoveServico: (id: string) => void;
}

export interface DonoBannersAlertaProps {
  planoAtual: PlanoType;
  fasePagamento: FasePagamento;
  diasRestantes: number | null;
  onUpgradeClick: () => void;
  onRenovacaoClick: () => void;
  brand: string;
  ctaFg: string;
}

export interface DonoModalUpgradeProps {
  open: boolean;
  onClose: () => void;
  planoAtual: PlanoType;
  onUpgrade: (plano: PlanoType) => void;
}

export interface DonoModalRenovacaoProps {
  open: boolean;
  onClose: () => void;
  planoAtual: PlanoType;
  pixGerado: string | null;
  tempoPix: number;
  isGerandoPix: boolean;
  onGerarPix: () => void;
  onCopiarPix: () => void;
}

export interface DonoBloqueioProps {
  motivo: "manual" | "inadimplencia";
  planoAtual: PlanoType;
  pixGerado: string | null;
  tempoPix: number;
  isGerandoPix: boolean;
  onGerarPix: () => void;
  onCopiarPix: () => void;
  onRenovacaoClick: () => void;
  getValorPlano: (plano: PlanoType) => number;
}

// ==========================================
// NOVOS TIPOS PARA FUNCIONALIDADES PRO
// ==========================================

export interface Despesa {
  id: string;
  barbearia_id: string;
  descricao: string;
  valor: number;
  categoria: string;
  data: string;
  criado_em: string;
}

export interface Produto {
  id: string;
  barbearia_id: string;
  nome: string;
  preco: number;
  estoque: number;
  criado_em: string;
}

export interface VendaProduto {
  id: string;
  barbearia_id: string;
  produto_id: string;
  produto_nome?: string;
  quantidade: number;
  valor_total: number;
  data: string;
}

export interface FilaEspera {
  id: string;
  barbearia_id: string;
  nome_cliente: string;
  telefone: string;
  servico_desejado: string;
  barbeiro_preferido?: string;
  data_inscricao: string;
  status: "aguardando" | "notificado" | "confirmado" | "desistiu";
  prioridade?: number;
}

export interface ClienteRadar {
  id: string;
  nome: string;
  telefone: string;
  ultimo_agendamento: string;
  dias_sem_visitar: number;
  total_visitas: number;
  valor_total_gasto: number;
}
