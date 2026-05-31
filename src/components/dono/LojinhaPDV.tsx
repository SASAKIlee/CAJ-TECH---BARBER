import { useState, useEffect, useCallback, useMemo } from "react";
import { ShoppingBag, Plus, X, Minus, Package, DollarSign, TrendingUp, Loader2, Search, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Produto, VendaProduto } from "@/types/dono";

interface LojinhaPDVProps {
  slug: string;
  brand: string;
  glass: React.CSSProperties;
}

export function LojinhaPDV({ slug, brand, glass }: LojinhaPDVProps) {
  const [plano, setPlano] = useState<string | null>(null);
  const [loadingPlano, setLoadingPlano] = useState(true);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendas, setVendas] = useState<VendaProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalProduto, setModalProduto] = useState(false);
  const [novoProduto, setNovoProduto] = useState({ nome: "", preco: "", estoque: "" });
  const [busca, setBusca] = useState("");

  const hasProAccess = plano === "pro" || plano === "elite";

  const carregarPlano = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("barbearias")
        .select("plano")
        .eq("slug", slug)
        .single();

      if (error) throw error;
      setPlano(data?.plano || "starter");
    } catch (err) {
      console.error("Erro ao carregar plano:", err);
      setPlano("starter");
    } finally {
      setLoadingPlano(false);
    }
  }, [slug]);

  const carregarDados = useCallback(async () => {
    setLoading(true);
    try {
      const [prodsRes, vendasRes] = await Promise.all([
        supabase.from("produtos").select("*").eq("barbearia_slug", slug).order("nome", { ascending: true }),
        supabase.from("vendas_produtos").select("*").eq("barbearia_slug", slug).order("data", { ascending: false }).limit(50)
      ]);

      if (prodsRes.error) throw prodsRes.error;
      if (vendasRes.error) throw vendasRes.error;

      setProdutos(prodsRes.data || []);
      setVendas(vendasRes.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro ao carregar dados: " + message);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    carregarPlano();
  }, [carregarPlano]);

  useEffect(() => {
    if (hasProAccess) {
      carregarDados();
    } else {
      setLoading(false);
    }
  }, [hasProAccess, carregarDados]);

  const handleAddProduto = async () => {
    if (!novoProduto.nome || !novoProduto.preco) {
      return toast.error("Preencha nome e preço.");
    }

    try {
      const { error } = await supabase.from("produtos").insert({
        barbearia_slug: slug,
        nome: novoProduto.nome,
        preco: Number(novoProduto.preco),
        estoque: Number(novoProduto.estoque) || 0,
      });

      if (error) throw error;
      toast.success("Produto cadastrado!");
      setNovoProduto({ nome: "", preco: "", estoque: "" });
      setModalProduto(false);
      carregarDados();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro: " + message);
    }
  };

  const handleVender = async (produto: Produto) => {
    if (produto.estoque <= 0) {
      return toast.error("Produto sem estoque!");
    }

    try {
      const { error: errVenda } = await supabase.from("vendas_produtos").insert({
        barbearia_slug: slug,
        produto_id: produto.id,
        quantidade: 1,
        valor_total: produto.preco,
      });

      if (errVenda) throw errVenda;

      const { error: errEstoque } = await supabase
        .from("produtos")
        .update({ estoque: produto.estoque - 1 })
        .eq("id", produto.id);

      if (errEstoque) throw errEstoque;

      toast.success(`Venda de ${produto.nome} registrada!`);
      carregarDados();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro ao vender: " + message);
    }
  };

  const handleAjustarEstoque = async (produto: Produto, delta: number) => {
    const novoEstoque = Math.max(0, produto.estoque + delta);
    try {
      const { error } = await supabase
        .from("produtos")
        .update({ estoque: novoEstoque })
        .eq("id", produto.id);

      if (error) throw error;
      carregarDados();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro: " + message);
    }
  };

  const handleRemoverProduto = async (id: string) => {
    try {
      const { error } = await supabase.from("produtos").delete().eq("id", id);
      if (error) throw error;
      toast.success("Produto removido.");
      carregarDados();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro: " + message);
    }
  };

  const totalVendasMes = useMemo(() => vendas.reduce((sum, v) => sum + v.valor_total, 0), [vendas]);

  const produtosFiltrados = useMemo(() =>
    produtos.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase())),
    [produtos, busca]
  );

  if (loadingPlano || (loading && hasProAccess)) {
    return (
      <Card className="p-8 rounded-2xl border border-white/[0.08] text-center" style={glass}>
        <Loader2 className="animate-spin text-purple-500 h-8 w-8 mx-auto" />
        <p className="text-zinc-400 text-sm mt-4">Carregando...</p>
      </Card>
    );
  }

  if (!hasProAccess) {
    return (
      <Card className="p-6 rounded-2xl border border-white/[0.08] text-center" style={glass}>
        <div className="flex flex-col items-center">
          <div className="h-16 w-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-purple-400" />
          </div>
          <h3 className="font-black text-white uppercase text-lg mb-2">Lojinha / PDV</h3>
          <p className="text-zinc-400 text-sm mb-4 max-w-xs">
            Controle de estoque, vendas e histórico é exclusivo do plano{" "}
            <strong className="text-purple-400">Pro</strong> ou <strong className="text-purple-400">Elite</strong>.
          </p>

          <div className="bg-black/30 rounded-xl p-4 mb-6 w-full text-left">
            <p className="text-xs text-zinc-500 uppercase font-black mb-2">No plano Pro você tem:</p>
            <ul className="text-xs text-zinc-300 space-y-1">
              <li>✓ Controle de estoque em tempo real</li>
              <li>✓ Registro de vendas com histórico</li>
              <li>✓ Cálculo automático de comissões</li>
              <li>✓ Lembretes de WhatsApp</li>
            </ul>
          </div>

          <Button
            onClick={() => window.location.href = "/"}
            className="font-black uppercase w-full"
            style={{ backgroundColor: brand }}
          >
            Fazer Upgrade
          </Button>
          <p className="text-[10px] text-zinc-500 mt-2">
            Plano atual: <strong className="text-zinc-300 uppercase">{plano || "starter"}</strong>
          </p>
        </div>
      </Card>
    );
  }

  return (
    <section className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-purple-500" aria-hidden="true" />
          <div>
            <h3 className="font-black text-white uppercase text-xl italic">Lojinha / PDV</h3>
            <p className="text-xs text-zinc-500">Controle de estoque e vendas</p>
          </div>
        </div>
        <Button
          onClick={() => setModalProduto(true)}
          className="h-10 px-4 font-black text-xs uppercase"
          style={{ backgroundColor: brand }}
          aria-label="Adicionar novo produto"
        >
          <Plus className="h-4 w-4 mr-1" aria-hidden="true" /> Produto
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 rounded-2xl border border-white/[0.08]" style={glass}>
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Produtos</p>
          <p className="text-xl font-black text-purple-400">{produtos.length}</p>
        </Card>
        <Card className="p-3 rounded-2xl border border-white/[0.08]" style={glass}>
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Vendas (Total)</p>
          <p className="text-xl font-black text-emerald-400">R$ {totalVendasMes.toFixed(2)}</p>
        </Card>
        <Card className="p-3 rounded-2xl border border-white/[0.08]" style={glass}>
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Em Estoque</p>
          <p className="text-xl font-black text-blue-400">{produtos.reduce((s, p) => s + p.estoque, 0)}</p>
        </Card>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" aria-hidden="true" />
        <Input
          placeholder="Buscar produto..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="bg-black/30 border-white/10 pl-10 h-10 rounded-xl text-sm"
          aria-label="Buscar produto"
        />
      </div>

      {/* Produtos */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-purple-500 h-8 w-8" />
        </div>
      ) : produtosFiltrados.length === 0 ? (
        <Card className="p-8 rounded-2xl border border-white/[0.08] text-center" style={glass}>
          <Package className="h-12 w-12 text-zinc-600 mx-auto mb-4" aria-hidden="true" />
          <p className="text-white font-bold">Nenhum produto cadastrado</p>
          <p className="text-zinc-500 text-sm mt-1">Cadastre produtos para vender na barbearia.</p>
        </Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {produtosFiltrados.map(produto => (
            <Card key={produto.id} className="p-3 rounded-xl border border-white/[0.08] bg-zinc-950/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                    <Package className="h-4 w-4 text-purple-400" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-white text-xs truncate">{produto.nome}</p>
                    <p className="text-xs text-emerald-400 font-bold">R$ {produto.preco.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <div className="flex items-center gap-1 bg-black/40 rounded-lg px-2 py-1">
                    <button onClick={() => handleAjustarEstoque(produto, -1)} className="text-zinc-400 hover:text-white" aria-label="Diminuir estoque">
                      <Minus className="h-3 w-3" />
                    </button>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] min-w-[24px] justify-center",
                        produto.estoque === 0
                          ? "text-red-400 border-red-500/30"
                          : produto.estoque <= 3
                            ? "text-yellow-400 border-yellow-500/30"
                            : "text-zinc-300 border-white/10"
                      )}
                    >
                      {produto.estoque}
                    </Badge>
                    <button onClick={() => handleAjustarEstoque(produto, 1)} className="text-zinc-400 hover:text-white" aria-label="Aumentar estoque">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleVender(produto)}
                    disabled={produto.estoque === 0}
                    className="h-7 px-2 text-[8px] font-black uppercase"
                    style={{ backgroundColor: brand }}
                    aria-label={`Vender ${produto.nome}`}
                  >
                    <DollarSign className="h-3 w-3 mr-0.5" aria-hidden="true" /> Vender
                  </Button>
                  <button onClick={() => handleRemoverProduto(produto.id)} className="text-zinc-600 hover:text-red-500 p-1" aria-label={`Remover ${produto.nome}`}>
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Histórico de Vendas Recentes */}
      {vendas.length > 0 && (
        <div className="pt-4 border-t border-white/5">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
            <TrendingUp className="h-3 w-3" aria-hidden="true" /> Últimas Vendas
          </h4>
          <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
            {vendas.slice(0, 10).map(venda => (
              <div key={venda.id} className="flex items-center justify-between text-xs py-2 px-3 bg-black/20 rounded-lg">
                <span className="text-zinc-300 truncate">{venda.produto_nome || "Produto"}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-zinc-500 text-[10px]">
                    {new Date(venda.data).toLocaleDateString("pt-BR")}
                  </span>
                  <span className="text-emerald-400 font-bold">R$ {venda.valor_total.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Novo Produto */}
      <AnimatePresence>
        {modalProduto && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
            <Card className="w-full max-w-sm p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-black uppercase text-lg">Novo Produto</h3>
                <button
                  onClick={() => setModalProduto(false)}
                  className="text-zinc-500 hover:text-white bg-zinc-800 h-8 w-8 rounded-full flex items-center justify-center"
                  aria-label="Fechar modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Nome do Produto</label>
                  <Input
                    value={novoProduto.nome}
                    onChange={e => setNovoProduto({ ...novoProduto, nome: e.target.value })}
                    placeholder="Ex: Pomada Modeladora"
                    className="bg-black/30 border-white/10 h-12 rounded-xl"
                    aria-label="Nome do produto"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Preço (R$)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={novoProduto.preco}
                    onChange={e => setNovoProduto({ ...novoProduto, preco: e.target.value })}
                    placeholder="29.90"
                    className="bg-black/30 border-white/10 h-12 rounded-xl"
                    aria-label="Preço do produto"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Estoque Inicial</label>
                  <Input
                    type="number"
                    value={novoProduto.estoque}
                    onChange={e => setNovoProduto({ ...novoProduto, estoque: e.target.value })}
                    placeholder="10"
                    className="bg-black/30 border-white/10 h-12 rounded-xl"
                    aria-label="Estoque inicial do produto"
                  />
                </div>
              </div>
              <Button
                onClick={handleAddProduto}
                className="w-full h-12 font-black text-xs uppercase"
                style={{ backgroundColor: brand }}
                aria-label="Cadastrar produto"
              >
                Cadastrar Produto
              </Button>
            </Card>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}