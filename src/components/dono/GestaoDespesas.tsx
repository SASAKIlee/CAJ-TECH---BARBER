import { useState, useEffect } from "react";
import { Receipt, Plus, X, TrendingDown, DollarSign, Calendar, Search, Loader2, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Despesa } from "@/types/dono";

interface GestaoDespesasProps {
  slug: string;
  brand: string;
  glass: React.CSSProperties;
  faturamentoMes: number;
}

const CATEGORIAS = [
  "Aluguel", "Água", "Energia", "Internet", "Produtos", "Equipamentos",
  "Marketing", "Salários", "Impostos", "Manutenção", "Outros"
];

export function GestaoDespesas({ slug, brand, glass, faturamentoMes }: GestaoDespesasProps) {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroMes, setFiltroMes] = useState(new Date().toISOString().slice(0, 7));
  const [novaDespesa, setNovaDespesa] = useState({ descricao: "", valor: "", categoria: "Outros", data: new Date().toISOString().slice(0, 10) });

  useEffect(() => {
    carregarDespesas();
  }, [slug, filtroMes]);

  const carregarDespesas = async () => {
    setLoading(true);
    try {
      const inicioMes = `${filtroMes}-01`;
      
      // Calcula o último dia real do mês selecionado
      const [ano, mes] = filtroMes.split('-').map(Number);
      const ultimoDia = new Date(ano, mes, 0).getDate(); // Dia 0 do próximo mês = último dia do mês atual
      const fimMes = `${filtroMes}-${String(ultimoDia).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from("despesas")
        .select("*")
        .eq("barbearia_slug", slug)
        .gte("data", inicioMes)
        .lte("data", fimMes)
        .order("data", { ascending: false });

      if (error) throw error;
      setDespesas(data || []);
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDespesa = async () => {
    if (!novaDespesa.descricao || !novaDespesa.valor) {
      return toast.error("Preencha descrição e valor.");
    }

    try {
      const { error } = await supabase.from("despesas").insert({
        barbearia_slug: slug,
        descricao: novaDespesa.descricao,
        valor: Number(novaDespesa.valor),
        categoria: novaDespesa.categoria,
        data: novaDespesa.data,
      });

      if (error) throw error;
      toast.success("Despesa registrada!");
      setNovaDespesa({ descricao: "", valor: "", categoria: "Outros", data: new Date().toISOString().slice(0, 10) });
      setModalAberto(false);
      carregarDespesas();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const handleRemover = async (id: string) => {
    try {
      const { error } = await supabase.from("despesas").delete().eq("id", id);
      if (error) throw error;
      toast.success("Despesa removida.");
      carregarDespesas();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const totalDespesas = despesas.reduce((sum, d) => sum + d.valor, 0);
  const lucroLiquido = faturamentoMes - totalDespesas;
  const margem = faturamentoMes > 0 ? (lucroLiquido / faturamentoMes) * 100 : 0;
  const despesasFiltradas = despesas.filter(d =>
    d.descricao.toLowerCase().includes(busca.toLowerCase()) ||
    d.categoria.toLowerCase().includes(busca.toLowerCase())
  );

  // Agrupar por categoria
  const porCategoria = CATEGORIAS.map(cat => ({
    categoria: cat,
    total: despesas.filter(d => d.categoria === cat).reduce((s, d) => s + d.valor, 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  return (
    <section className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-red-500" />
          <div>
            <h3 className="font-black text-white uppercase text-xl italic">Gestão de Despesas</h3>
            <p className="text-xs text-zinc-500">Controle seus custos e calcule o lucro real</p>
          </div>
        </div>
        <Button onClick={() => setModalAberto(true)} className="h-10 px-4 font-black text-xs uppercase" style={{ backgroundColor: brand }}>
          <Plus className="h-4 w-4 mr-1" /> Despesa
        </Button>
      </div>

      {/* Cards Financeiros */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5" style={glass}>
          <p className="text-[8px] font-black uppercase tracking-widest text-emerald-600 mb-1">Faturamento</p>
          <p className="text-lg font-black text-emerald-400">R$ {faturamentoMes.toFixed(2)}</p>
        </Card>
        <Card className="p-3 rounded-2xl border border-red-500/20 bg-red-500/5" style={glass}>
          <p className="text-[8px] font-black uppercase tracking-widest text-red-600 mb-1">Despesas</p>
          <p className="text-lg font-black text-red-400">R$ {totalDespesas.toFixed(2)}</p>
        </Card>
        <Card className="p-3 rounded-2xl border border-white/[0.08]" style={glass}>
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Lucro Líquido</p>
          <p className={cn("text-lg font-black", lucroLiquido >= 0 ? "text-blue-400" : "text-red-400")}>
            R$ {lucroLiquido.toFixed(2)}
          </p>
        </Card>
        <Card className="p-3 rounded-2xl border border-white/[0.08]" style={glass}>
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Margem</p>
          <p className={cn("text-lg font-black", margem >= 30 ? "text-emerald-400" : margem >= 10 ? "text-yellow-400" : "text-red-400")}>
            {margem.toFixed(0)}%
          </p>
        </Card>
      </div>

      {/* Filtro Mês */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-zinc-500" />
          <span className="text-[10px] font-black text-zinc-500 uppercase">Mês:</span>
          <Input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className="bg-black/30 border-white/10 h-8 w-40 rounded-lg text-sm" />
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input placeholder="Buscar despesa..." value={busca} onChange={e => setBusca(e.target.value)} className="bg-black/30 border-white/10 pl-10 h-8 rounded-lg text-sm" />
        </div>
      </div>

      {/* Despesas por Categoria */}
      {porCategoria.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Por Categoria</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {porCategoria.map(cat => (
              <Card key={cat.categoria} className="p-3 rounded-xl border border-white/[0.08] bg-zinc-950/80 flex items-center justify-between" style={glass}>
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-400" />
                  <span className="text-xs text-zinc-300 font-bold">{cat.categoria}</span>
                </div>
                <span className="text-sm font-black text-red-400">R$ {cat.total.toFixed(2)}</span>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Despesas */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-red-500 h-8 w-8" /></div>
      ) : despesasFiltradas.length === 0 ? (
        <Card className="p-8 rounded-2xl border border-white/[0.08] text-center" style={glass}>
          <Receipt className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-white font-bold">Nenhuma despesa registrada</p>
          <p className="text-zinc-500 text-sm mt-1">Registre seus custos para calcular o lucro real.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {despesasFiltradas.map(despesa => (
            <motion.div key={despesa.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-3 rounded-xl border border-white/[0.08] bg-zinc-950/80 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                    <DollarSign className="h-4 w-4 text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white text-xs truncate">{despesa.descricao}</p>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                      <Badge variant="outline" className="text-[8px] h-4 px-1 border-white/10 text-zinc-400">{despesa.categoria}</Badge>
                      <span>{new Date(despesa.data).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-black text-red-400">R$ {despesa.valor.toFixed(2)}</span>
                  <button onClick={() => handleRemover(despesa.id)} className="text-zinc-600 hover:text-red-500 p-1">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal Nova Despesa */}
      <AnimatePresence>
        {modalAberto && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
            <Card className="w-full max-w-sm p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-black uppercase text-lg">Nova Despesa</h3>
                <button onClick={() => setModalAberto(false)} className="text-zinc-500 hover:text-white bg-zinc-800 h-8 w-8 rounded-full flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Descrição</label>
                  <Input value={novaDespesa.descricao} onChange={e => setNovaDespesa({ ...novaDespesa, descricao: e.target.value })} placeholder="Ex: Conta de luz" className="bg-black/30 border-white/10 h-12 rounded-xl" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Valor (R$)</label>
                  <Input type="number" step="0.01" value={novaDespesa.valor} onChange={e => setNovaDespesa({ ...novaDespesa, valor: e.target.value })} placeholder="150.00" className="bg-black/30 border-white/10 h-12 rounded-xl" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Categoria</label>
                  <Select value={novaDespesa.categoria} onValueChange={v => setNovaDespesa({ ...novaDespesa, categoria: v })}>
                    <SelectTrigger className="bg-black/30 border-white/10 h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Data</label>
                  <Input type="date" value={novaDespesa.data} onChange={e => setNovaDespesa({ ...novaDespesa, data: e.target.value })} className="bg-black/30 border-white/10 h-12 rounded-xl" />
                </div>
              </div>
              <Button onClick={handleAddDespesa} className="w-full h-12 font-black text-xs uppercase" style={{ backgroundColor: brand }}>
                Registrar Despesa
              </Button>
            </Card>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
