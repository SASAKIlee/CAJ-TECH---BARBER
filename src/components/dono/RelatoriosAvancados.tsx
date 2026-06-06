import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { FileText, Calendar, Download, Printer, Loader2, BarChart2, TrendingUp, TrendingDown, DollarSign, Briefcase, ShoppingBag, Receipt, Scissors, Percent } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { cn } from "@/lib/utils";

interface RelatoriosAvancadosProps {
  slug: string;
  brand: string;
  glass: React.CSSProperties;
}

interface PerformanceBarbeiro {
  id: string;
  nome: string;
  servicos_prestados: number;
  faturamento_servicos: number;
  comissao_barbeiro: number;
  lucro_barbearia: number;
}

interface CategoriaDespesa {
  categoria: string;
  valor: number;
}

interface ProdutoVendido {
  id: string;
  nome: string;
  quantidade: number;
  total: number;
}

export function RelatoriosAvancados({ slug, brand, glass }: RelatoriosAvancadosProps) {
  const abortControllerRef = useRef<AbortController | null>(null);

  const [filtroMes, setFiltroMes] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [loading, setLoading] = useState(true);
  const [isExportingImage, setIsExportingImage] = useState(false);

  // Estados consolidados do relatório
  const [dadosLoja, setDadosLoja] = useState<any>(null);
  const [receitaServicos, setReceitaServicos] = useState(0);
  const [receitaProdutos, setReceitaProdutos] = useState(0);
  const [totalDespesas, setTotalDespesas] = useState(0);

  const [despesasPorCategoria, setDespesasPorCategoria] = useState<CategoriaDespesa[]>([]);
  const [produtosMaisVendidos, setProdutosMaisVendidos] = useState<ProdutoVendido[]>([]);
  const [desempenhoEquipe, setDesempenhoEquipe] = useState<PerformanceBarbeiro[]>([]);
  const [servicosMaisProcurados, setServicosMaisProcurados] = useState<any[]>([]);

  // Carregar dados e compilar o relatório do período
  const compilarRelatorio = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const [ano, mes] = filtroMes.split("-").map(Number);
      const primeiroDia = `${filtroMes}-01`;
      const ultimoDia = new Date(ano, mes, 0).getDate();
      const ultimoDiaStr = `${filtroMes}-${String(ultimoDia).padStart(2, "0")}`;

      // 1. Carregar Info da Barbearia
      const { data: barbearia } = await supabase
        .from("barbearias")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      setDadosLoja(barbearia);

      // 2. Carregar agendamentos finalizados do período
      const { data: agendamentos, error: errAg } = await supabase
        .from("agendamentos")
        .select(`
          id,
          nome_cliente,
          data,
          horario,
          status,
          servico_id,
          barbeiro_id,
          comissao_ganha,
          servicos ( nome, preco ),
          barbeiros ( nome, comissao_pct )
        `)
        .eq("barbearia_slug", slug)
        .eq("status", "Finalizado")
        .gte("data", primeiroDia)
        .lte("data", ultimoDiaStr)
        .abortSignal(controller.signal);

      if (errAg) throw errAg;
      if (controller.signal.aborted) return;

      // 3. Carregar despesas do período
      const { data: despesas, error: errDes } = await supabase
        .from("despesas")
        .select("*")
        .eq("barbearia_slug", slug)
        .gte("data", primeiroDia)
        .lte("data", ultimoDiaStr)
        .abortSignal(controller.signal);

      if (errDes) throw errDes;
      if (controller.signal.aborted) return;

      // 4. Carregar vendas de produtos do período
      const { data: vendas, error: errVen } = await supabase
        .from("vendas_produtos")
        .select(`
          id,
          quantidade,
          preco_unitario,
          total,
          data_venda,
          produtos ( nome )
        `)
        .eq("barbearia_slug", slug)
        .gte("data_venda", primeiroDia)
        .lte("data_venda", ultimoDiaStr)
        .abortSignal(controller.signal);

      if (errVen) throw errVen;
      if (controller.signal.aborted) return;

      // --- PROCESSAR DADOS DE FINANÇAS ---

      // Receita de serviços
      let somaServicos = 0;
      const mapaBarbeiros = new Map<string, PerformanceBarbeiro>();
      const mapaServicos = new Map<string, { nome: string; quantidade: number; faturamento: number }>();

      (agendamentos || []).forEach((ag: any) => {
        const precoServico = ag.servicos?.preco || 0;
        somaServicos += precoServico;

        // Agrupar serviços mais procurados
        const servId = ag.servico_id;
        const servNome = ag.servicos?.nome || "Outro";
        const servEx = mapaServicos.get(servId);
        if (servEx) {
          servEx.quantidade += 1;
          servEx.faturamento += precoServico;
        } else {
          mapaServicos.set(servId, { nome: servNome, quantidade: 1, faturamento: precoServico });
        }

        // Agrupar performance equipe
        const barbId = ag.barbeiro_id;
        const barbNome = ag.barbeiros?.nome || "Profissional";
        const pctComissao = Number(ag.barbeiros?.comissao_pct || 0);

        // Se a comissão foi gravada no agendamento, usa ela, senão calcula baseada na porcentagem
        const comissaoPaga = ag.comissao_ganha !== null ? Number(ag.comissao_ganha) : (precoServico * pctComissao) / 100;
        const lucroLoja = precoServico - comissaoPaga;

        const barbEx = mapaBarbeiros.get(barbId);
        if (barbEx) {
          barbEx.servicos_prestados += 1;
          barbEx.faturamento_servicos += precoServico;
          barbEx.comissao_barbeiro += comissaoPaga;
          barbEx.lucro_barbearia += lucroLoja;
        } else {
          mapaBarbeiros.set(barbId, {
            id: barbId,
            nome: barbNome,
            servicos_prestados: 1,
            faturamento_servicos: precoServico,
            comissao_barbeiro: comissaoPaga,
            lucro_barbearia: lucroLoja
          });
        }
      });

      setReceitaServicos(somaServicos);
      setDesempenhoEquipe(Array.from(mapaBarbeiros.values()).sort((a, b) => b.faturamento_servicos - a.faturamento_servicos));
      setServicosMaisProcurados(Array.from(mapaServicos.values()).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5));

      // Receita de produtos
      let somaProdutos = 0;
      const mapaProdutos = new Map<string, ProdutoVendido>();

      (vendas || []).forEach((ven: any) => {
        const totalVenda = Number(ven.total || 0);
        somaProdutos += totalVenda;

        const prodNome = ven.produtos?.nome || "Produto";
        const prodId = ven.produto_id;
        const prodEx = mapaProdutos.get(prodId);
        if (prodEx) {
          prodEx.quantidade += ven.quantidade;
          prodEx.total += totalVenda;
        } else {
          mapaProdutos.set(prodId, {
            id: prodId,
            nome: prodNome,
            quantidade: ven.quantidade,
            total: totalVenda
          });
        }
      });

      setReceitaProdutos(somaProdutos);
      setProdutosMaisVendidos(Array.from(mapaProdutos.values()).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5));

      // Despesas
      let somaDespesas = 0;
      const mapaDespesas = new Map<string, number>();

      (despesas || []).forEach((des: any) => {
        const val = Number(des.valor || 0);
        somaDespesas += val;

        const cat = des.categoria || "Outros";
        mapaDespesas.set(cat, (mapaDespesas.get(cat) || 0) + val);
      });

      setTotalDespesas(somaDespesas);

      const listCategorias: CategoriaDespesa[] = Array.from(mapaDespesas.entries()).map(([categoria, valor]) => ({
        categoria,
        valor
      })).sort((a, b) => b.valor - a.valor);

      setDespesasPorCategoria(listCategorias);

    } catch (err: any) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error(err);
      toast.error("Erro ao gerar relatório do período.");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [slug, filtroMes]);

  useEffect(() => {
    compilarRelatorio();
    return () => abortControllerRef.current?.abort();
  }, [compilarRelatorio]);

  const faturamentoBruto = receitaServicos + receitaProdutos;
  const lucroLiquido = faturamentoBruto - totalDespesas;
  const margemLucro = faturamentoBruto > 0 ? (lucroLiquido / faturamentoBruto) * 100 : 0;

  // Formatar Mês para Exibição Legível
  const mesExtenso = useMemo(() => {
    const [ano, mes] = filtroMes.split("-").map(Number);
    const date = new Date(ano, mes - 1, 1);
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).toUpperCase();
  }, [filtroMes]);

  // Função Premium: Exportação PDF limpo via iframe
  const handleExportPDF = useCallback(() => {
    const reportEl = document.getElementById("pdf-report-content");
    if (!reportEl) return toast.error("Conteúdo do relatório não encontrado.");

    const toastId = toast.loading("Preparando PDF de impressão...");
    try {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!doc) throw new Error("Não foi possível acessar a janela de impressão.");

      // Copia estilos CSS do app
      let styles = "";
      document.querySelectorAll("style, link[rel='stylesheet']").forEach((el) => {
        styles += el.outerHTML;
      });

      doc.write(`
        <html>
          <head>
            <title>Relatório Mensal - ${dadosLoja?.nome || "Barbearia"}</title>
            ${styles}
            <style>
              body {
                background-color: white !important;
                color: black !important;
                font-family: 'Inter', sans-serif !important;
                padding: 40px !important;
              }
              /* Garante cores de texto escuras na impressão */
              .text-white, h1, h2, h3, h4, th, td, p, span {
                color: black !important;
              }
              .border, .border-white\\/\\[0\\.08\\] {
                border-color: #d4d4d8 !important;
              }
              /* Oculta elementos que não devem ser impressos no PDF */
              .no-print {
                display: none !important;
              }
              .bg-zinc-950, .bg-zinc-900, .bg-black\\/80, .bg-black\\/30 {
                background-color: #f4f4f5 !important;
                background: #f4f4f5 !important;
                border: 1px solid #e4e4e7 !important;
              }
              .rounded-2xl, .rounded-3xl, .rounded-xl {
                border-radius: 12px !important;
              }
              .shadow-2xl, .shadow-md, .shadow-xl {
                box-shadow: none !important;
              }
              .text-emerald-400, .text-emerald-500 {
                color: #15803d !important;
                font-weight: bold !important;
              }
              .text-red-400, .text-red-500 {
                color: #b91c1c !important;
                font-weight: bold !important;
              }
              .text-yellow-400, .text-yellow-500, .text-yellow-300 {
                color: #b45309 !important;
                font-weight: bold !important;
              }
              .text-blue-400, .text-blue-500 {
                color: #1d4ed8 !important;
                font-weight: bold !important;
              }
              /* Margem A4 */
              @page {
                size: A4 portrait;
                margin: 1.5cm;
              }
              @media print {
                body {
                  padding: 0 !important;
                }
              }
            </style>
          </head>
          <body>
            <div style="width: 100%;">
              ${reportEl.innerHTML}
            </div>
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() {
                  window.parent.document.body.removeChild(window.frameElement);
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      doc.close();
      toast.success("Visualização do PDF carregada! Escolha 'Salvar como PDF' na impressora.", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao gerar PDF: " + err.message, { id: toastId });
    }
  }, [dadosLoja]);

  // Função Extra: Exportação como Imagem PNG
  const handleExportPNG = useCallback(async () => {
    const reportEl = document.getElementById("pdf-report-content");
    if (!reportEl) return toast.error("Conteúdo do relatório não encontrado.");

    setIsExportingImage(true);
    const toastId = toast.loading("Capturando imagem do relatório...");
    try {
      const canvas = await html2canvas(reportEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#09090b", // Fundo escuro premium na imagem
        logging: false,
      });

      const link = document.createElement("a");
      link.download = `relatorio-caixa-${slug}-${filtroMes}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Imagem do Caixa Baixada! 📸", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao gerar imagem: " + err.message, { id: toastId });
    } finally {
      setIsExportingImage(false);
    }
  }, [slug, filtroMes]);

  return (
    <section className="space-y-6 animate-in fade-in duration-500">
      {/* Controles de Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-emerald-500" aria-hidden="true" />
          <div>
            <h3 className="font-black text-white uppercase text-xl italic">Relatórios do Caixa</h3>
            <p className="text-xs text-zinc-500">Gere demonstrativos financeiros e exporte demonstrativos</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor do Mês */}
          <div className="flex items-center gap-2 bg-zinc-900 border border-white/5 rounded-xl px-3 h-10">
            <Calendar className="h-4 w-4 text-zinc-500" />
            <Input
              type="month"
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              className="bg-transparent border-0 h-full p-0 text-xs text-white focus-visible:ring-0 focus-visible:ring-offset-0 w-28 font-bold"
              aria-label="Mês do relatório"
            />
          </div>

          <Button
            size="sm"
            onClick={handleExportPNG}
            disabled={loading || isExportingImage}
            variant="outline"
            className="h-10 border-white/10 text-zinc-400 hover:text-white bg-transparent rounded-xl text-xs font-bold uppercase gap-1"
          >
            {isExportingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            PNG
          </Button>

          <Button
            size="sm"
            onClick={handleExportPDF}
            disabled={loading}
            className="h-10 text-black font-black uppercase text-xs rounded-xl gap-1"
            style={{ backgroundColor: brand }}
          >
            <Printer className="h-4 w-4" />
            PDF / Imprimir
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-emerald-500 h-10 w-10" />
        </div>
      ) : (
        <Card className="p-1 border-white/[0.08] overflow-hidden rounded-[28px]" style={glass}>
          {/* CONTENT PRINCIPAL CAPTURADO PELO PDF/PNG */}
          <div id="pdf-report-content" className="p-6 sm:p-8 space-y-8 bg-zinc-950/70 text-white rounded-[26px]">

            {/* Cabeçalho do Relatório */}
            <div className="flex items-start justify-between border-b border-white/[0.08] pb-6">
              <div>
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.25em]">Demonstrativo Mensal</span>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter mt-1 text-white">{dadosLoja?.nome || "Barbearia"}</h2>
                <p className="text-xs text-zinc-500 mt-1 font-mono">cajtech.net.br/agendar/{slug}</p>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Período de Referência</span>
                <span className="text-sm font-black text-yellow-500 block mt-1 tracking-wider">{mesExtenso}</span>
              </div>
            </div>

            {/* Quadro de Indicadores Financeiros */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-zinc-900/40 border border-white/5 rounded-2xl flex flex-col justify-between h-24">
                <div className="flex items-center justify-between text-zinc-500"><span className="text-[8px] font-black uppercase tracking-wider">Faturamento de Serviços</span><Scissors className="h-4 w-4 text-yellow-500/80" /></div>
                <div><span className="text-[10px] text-zinc-500">R$</span> <span className="text-xl font-black text-white tabular-nums">{receitaServicos.toFixed(2)}</span></div>
              </div>
              <div className="p-4 bg-zinc-900/40 border border-white/5 rounded-2xl flex flex-col justify-between h-24">
                <div className="flex items-center justify-between text-zinc-500"><span className="text-[8px] font-black uppercase tracking-wider">Faturamento de Lojinha</span><ShoppingBag className="h-4 w-4 text-blue-500/80" /></div>
                <div><span className="text-[10px] text-zinc-500">R$</span> <span className="text-xl font-black text-white tabular-nums">{receitaProdutos.toFixed(2)}</span></div>
              </div>
              <div className="p-4 bg-zinc-900/40 border border-white/5 rounded-2xl flex flex-col justify-between h-24">
                <div className="flex items-center justify-between text-zinc-500"><span className="text-[8px] font-black uppercase tracking-wider">Total de Despesas</span><Receipt className="h-4 w-4 text-red-500/80" /></div>
                <div><span className="text-[10px] text-zinc-500">R$</span> <span className="text-xl font-black text-red-400 tabular-nums">{totalDespesas.toFixed(2)}</span></div>
              </div>
              <div className="p-4 bg-zinc-900/40 border border-white/5 rounded-2xl flex flex-col justify-between h-24">
                <div className="flex items-center justify-between text-zinc-500"><span className="text-[8px] font-black uppercase tracking-wider">Resultado (Lucro Líquido)</span><Percent className="h-4 w-4 text-emerald-500/80" /></div>
                <div><span className="text-[10px] text-zinc-500">R$</span> <span className={cn("text-xl font-black tabular-nums", lucroLiquido >= 0 ? "text-emerald-400" : "text-red-400")}>{lucroLiquido.toFixed(2)}</span></div>
              </div>
            </div>

            {/* Resumo Consolidado do Lucro */}
            <div className="p-5 bg-gradient-to-r from-zinc-900 to-black border border-white/5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl"><TrendingUp className="h-6 w-6 text-emerald-400" /></div>
                <div>
                  <h4 className="font-bold text-sm text-white">Lucratividade do Mês</h4>
                  <p className="text-xs text-zinc-500">Rendimento percentual deduzido custos de profissionais e operacionais.</p>
                </div>
              </div>
              <div className="flex items-baseline gap-4 self-end sm:self-center">
                <div className="text-right"><span className="text-[8px] text-zinc-500 font-black uppercase tracking-wider block">Margem Líquida</span><span className="text-2xl font-black text-emerald-400 italic">{margemLucro.toFixed(1)}%</span></div>
              </div>
            </div>

            {/* Grid Detalhado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Tabela de Profissionais */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Briefcase className="h-4 w-4 text-zinc-400" /> Produção da Equipe</h4>
                <div className="overflow-x-auto rounded-xl border border-white/5 bg-zinc-900/20">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-white/5 text-zinc-400 font-bold border-b border-white/5"><th className="p-3">Profissional</th><th className="p-3 text-center">Atends</th><th className="p-3 text-right">Faturamento</th><th className="p-3 text-right">Lucro Barb.</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {desempenhoEquipe.length === 0 ? (
                        <tr><td colSpan={4} className="p-4 text-center text-zinc-500 italic">Nenhum atendimento no período</td></tr>
                      ) : (
                        desempenhoEquipe.map(b => (
                          <tr key={b.id} className="hover:bg-white/[0.02] text-zinc-200">
                            <td className="p-3 font-bold">{b.nome}</td>
                            <td className="p-3 text-center font-mono">{b.servicos_prestados}</td>
                            <td className="p-3 text-right font-mono">R$ {b.faturamento_servicos.toFixed(2)}</td>
                            <td className="p-3 text-right font-mono text-emerald-400 font-bold">R$ {b.lucro_barbearia.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tabela de Despesas */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Receipt className="h-4 w-4 text-zinc-400" /> Custo por Categoria</h4>
                <div className="overflow-x-auto rounded-xl border border-white/5 bg-zinc-900/20">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-white/5 text-zinc-400 font-bold border-b border-white/5"><th className="p-3">Categoria</th><th className="p-3 text-right">Total Gasto</th><th className="p-3 text-center">Impacto (Rec)</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {despesasPorCategoria.length === 0 ? (
                        <tr><td colSpan={3} className="p-4 text-center text-zinc-500 italic">Nenhuma despesa no período</td></tr>
                      ) : (
                        despesasPorCategoria.map(c => {
                          const pctImpacto = faturamentoBruto > 0 ? (c.valor / faturamentoBruto) * 100 : 0;
                          return (
                            <tr key={c.categoria} className="hover:bg-white/[0.02] text-zinc-200">
                              <td className="p-3 font-bold">{c.categoria}</td>
                              <td className="p-3 text-right font-mono text-red-400">R$ {c.valor.toFixed(2)}</td>
                              <td className="p-3 text-center font-mono text-zinc-500">{pctImpacto.toFixed(1)}%</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Serviços mais procurados */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><Scissors className="h-4 w-4 text-zinc-400" /> Serviços Populares</h4>
                <div className="overflow-x-auto rounded-xl border border-white/5 bg-zinc-900/20">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-white/5 text-zinc-400 font-bold border-b border-white/5"><th className="p-3">Serviço</th><th className="p-3 text-center">Quantidade</th><th className="p-3 text-right">Faturamento</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {servicosMaisProcurados.length === 0 ? (
                        <tr><td colSpan={3} className="p-4 text-center text-zinc-500 italic">Sem registros</td></tr>
                      ) : (
                        servicosMaisProcurados.map(s => (
                          <tr key={s.nome} className="hover:bg-white/[0.02] text-zinc-200">
                            <td className="p-3 font-bold">{s.nome}</td>
                            <td className="p-3 text-center font-mono">{s.quantidade}</td>
                            <td className="p-3 text-right font-mono">R$ {s.faturamento.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Lojinha PDV mais vendidos */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5"><ShoppingBag className="h-4 w-4 text-zinc-400" /> Produtos mais Vendidos</h4>
                <div className="overflow-x-auto rounded-xl border border-white/5 bg-zinc-900/20">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-white/5 text-zinc-400 font-bold border-b border-white/5"><th className="p-3">Produto</th><th className="p-3 text-center">Itens Vendidos</th><th className="p-3 text-right">Total Recebido</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {produtosMaisVendidos.length === 0 ? (
                        <tr><td colSpan={3} className="p-4 text-center text-zinc-500 italic">Sem vendas no período</td></tr>
                      ) : (
                        produtosMaisVendidos.map(p => (
                          <tr key={p.id} className="hover:bg-white/[0.02] text-zinc-200">
                            <td className="p-3 font-bold">{p.nome}</td>
                            <td className="p-3 text-center font-mono">{p.quantidade}</td>
                            <td className="p-3 text-right font-mono text-emerald-400">R$ {p.total.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Rodapé do PDF */}
            <div className="border-t border-white/[0.08] pt-6 flex items-center justify-between text-[8px] text-zinc-600 uppercase font-black tracking-widest">
              <span>Relatório gerado em {new Date().toLocaleDateString("pt-BR")}</span>
              <span>Powered by CAJ TECH - Corte Perfeito</span>
            </div>

          </div>
        </Card>
      )}
    </section>
  );
}
