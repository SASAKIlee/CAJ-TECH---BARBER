import { Barbeiro, ComissaoBarbeiroItem, DonoStatsFiltrados } from "@/types/dono";

/**
 * Calcula estatísticas filtrados por barbeiro para o dashboard do dono.
 * Usa useMemo internamente para evitar recálculos desnecessários.
 */
export function calcularStatsFiltrados(
  faturamentoHojeProp: number,
  comissoesAPagarHojeProp: number,
  lucroRealHojeProp: number,
  faturamentoMensalProp: number,
  comissaoPorBarbeiroHoje: ComissaoBarbeiroItem[],
  barbeiros: Barbeiro[],
  barbeiroFiltroId: string
): DonoStatsFiltrados {
  const barbeiroSelecionado = barbeiros.find((b) => b.id === barbeiroFiltroId);

  const faturamentoHoje = barbeiroFiltroId
    ? ((comissaoPorBarbeiroHoje.find((item) => item.barbeiro.id === barbeiroFiltroId)?.total || 0) /
        (barbeiroSelecionado?.comissao_pct ? barbeiroSelecionado.comissao_pct / 100 : 1)) || 0
    : faturamentoHojeProp;

  const comissoesAPagarHoje = barbeiroFiltroId
    ? comissaoPorBarbeiroHoje.find((item) => item.barbeiro.id === barbeiroFiltroId)?.total || 0
    : comissoesAPagarHojeProp;

  const lucroRealHoje = faturamentoHoje - comissoesAPagarHoje;

  const comissaoPorBarbeiroFiltrada = barbeiroFiltroId
    ? comissaoPorBarbeiroHoje.filter((item) => item.barbeiro.id === barbeiroFiltroId)
    : comissaoPorBarbeiroHoje;

  const dataEquipe = comissaoPorBarbeiroFiltrada
    .map((item) => ({
      name: item.barbeiro?.nome?.split(" ")[0] || "...",
      Total: Number(item.total) || 0,
    }))
    .sort((a, b) => b.Total - a.Total);

  const hasDataEquipe = dataEquipe.some((d) => d.Total > 0);
  const topBarbeiro = hasDataEquipe ? dataEquipe[0] : null;
  const barbeirosAtivosHoje = dataEquipe.filter((d) => d.Total > 0).length;
  const mediaPorBarbeiro =
    barbeirosAtivosHoje > 0
      ? new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
          faturamentoHoje / barbeirosAtivosHoje
        )
      : "0,00";

  const margemLucro = faturamentoHoje > 0 ? Math.round((lucroRealHoje / faturamentoHoje) * 100) : 0;

  const dataFinanceiro = [
    { name: "Lucro Líquido", value: lucroRealHoje },
    { name: "Comissões Pagas", value: comissoesAPagarHoje },
  ];
  const hasDataFinanceiro = lucroRealHoje > 0 || comissoesAPagarHoje > 0;

  return {
    faturamentoHoje,
    comissoesAPagarHoje,
    lucroRealHoje,
    faturamentoMensal: faturamentoMensalProp,
    comissaoPorBarbeiroFiltrada,
    dataEquipe,
    hasDataEquipe,
    topBarbeiro,
    barbeirosAtivosHoje,
    mediaPorBarbeiro,
    margemLucro,
    hasDataFinanceiro,
    dataFinanceiro,
  };
}
