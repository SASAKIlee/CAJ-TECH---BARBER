import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { AlertTriangle, Phone, Calendar, DollarSign, RefreshCw, Search, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ClienteRadar } from "@/types/dono";

interface RadarVendasProps {
  slug: string;
  brand: string;
  glass: React.CSSProperties;
}

export function RadarVendas({ slug, brand, glass }: RadarVendasProps) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [clientes, setClientes] = useState<ClienteRadar[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroDias, setFiltroDias] = useState(45);
  const [reconquistando, setReconquistando] = useState<string | null>(null);

  const carregarClientes = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const { data: agendamentos, error } = await supabase
        .from("agendamentos")
        .select(`
          id, nome_cliente, telefone_cliente, data,
          servicos ( nome, preco )
        `)
        .eq("barbearia_slug", slug)
        .eq("status", "Finalizado")
        .order("data", { ascending: false })
        .abortSignal(controller.signal);

      if (controller.signal.aborted) return;

      if (error || !agendamentos) {
        setClientes([]);
        return;
      }

      // Agrupa por cliente (telefone ou nome)
      const mapaClientes = new Map<string, ClienteRadar>();
      const hoje = new Date();

      agendamentos.forEach((ag: any) => {
        const chave = ag.telefone_cliente?.replace(/\D/g, "") || ag.nome_cliente?.toLowerCase().trim();
        if (!chave) return;

        const dataAg = new Date(ag.data);
        const diasSemVisitar = Math.ceil((hoje.getTime() - dataAg.getTime()) / (1000 * 60 * 60 * 24));
        const servico = ag.servicos?.nome || "Serviço";
        const valor = ag.servicos?.preco || 0;

        const existente = mapaClientes.get(chave);
        if (existente) {
          existente.total_visitas += 1;
          existente.valor_total_gasto += valor;
          // Mantém o agendamento mais recente (menor diasSemVisitar)
          if (diasSemVisitar < existente.dias_sem_visitar) {
            existente.dias_sem_visitar = diasSemVisitar;
            existente.ultimo_agendamento = ag.data;
          }
        } else {
          mapaClientes.set(chave, {
            id: chave, // usar a chave como id para evitar duplicatas visuais
            nome: ag.nome_cliente,
            telefone: ag.telefone_cliente,
            ultimo_agendamento: ag.data,
            dias_sem_visitar: diasSemVisitar,
            total_visitas: 1,
            valor_total_gasto: valor,
          });
        }
      });

      const lista = Array.from(mapaClientes.values())
        .filter(c => c.dias_sem_visitar >= filtroDias)
        .sort((a, b) => b.valor_total_gasto - a.valor_total_gasto);

      setClientes(lista);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Erro ao carregar radar:", err);
      toast.error("Erro ao carregar dados do radar.");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [slug, filtroDias]);

  useEffect(() => {
    carregarClientes();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [carregarClientes]);

  const clientesFiltrados = useMemo(() => {
    const termo = busca.toLowerCase();
    return clientes.filter(c =>
      c.nome.toLowerCase().includes(termo) ||
      c.telefone?.includes(busca)
    );
  }, [clientes, busca]);

  const receitaPerdida = useMemo(() => {
    return clientes.reduce((sum, c) => sum + c.valor_total_gasto, 0);
  }, [clientes]);

  const handleReconquistar = useCallback((cliente: ClienteRadar) => {
    const tel = cliente.telefone?.replace(/\D/g, "");
    if (!tel) {
      toast.error("Cliente sem telefone cadastrado.");
      return;
    }
    setReconquistando(cliente.id);
    const msg = `Olá ${cliente.nome}! 😊 Faz um tempinho que você não vem na barbearia. Que tal voltar e dar aquele trato no visual? Temos horário essa semana!`;
    window.open(`https://api.whatsapp.com/send?phone=55${tel}&text=${encodeURIComponent(msg)}`, "_blank");
    // Pequeno delay para resetar o estado de loading
    setTimeout(() => setReconquistando(null), 500);
  }, []);

  return (
    <section className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" aria-hidden="true" />
          <h3 className="font-black text-white uppercase text-xl italic">Radar de Vendas</h3>
        </div>
        <p className="text-sm text-zinc-400">
          Identifica clientes que sumiram há {filtroDias}+ dias. Oportunidade de reconquistar receita perdida.
        </p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="p-4 rounded-2xl border border-white/[0.08]" style={glass}>
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Clientes Sumidos</p>
          <p className="text-2xl font-black text-orange-400">{clientes.length}</p>
        </Card>
        <Card className="p-4 rounded-2xl border border-white/[0.08]" style={glass}>
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Receita Perdida (Est.)</p>
          <p className="text-xl font-black text-red-400">R$ {receitaPerdida.toFixed(2)}</p>
        </Card>
        <Card className="p-4 rounded-2xl border border-white/[0.08] col-span-2 sm:col-span-1" style={glass}>
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Filtro (dias)</p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              value={filtroDias}
              onChange={e => setFiltroDias(Number(e.target.value) || 30)}
              className="bg-black/30 border-white/10 h-8 text-sm w-20"
              aria-label="Dias sem visitar"
            />
            <Button
              size="sm"
              onClick={carregarClientes}
              className="h-8 px-3"
              style={{ backgroundColor: brand }}
              aria-label="Atualizar radar"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" aria-hidden="true" />
        <Input
          placeholder="Buscar cliente..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="bg-black/30 border-white/10 pl-10 h-12 rounded-xl"
          aria-label="Buscar cliente"
        />
      </div>

      {/* Lista de Clientes */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-orange-500 h-8 w-8" />
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <Card className="p-8 rounded-2xl border border-white/[0.08] text-center" style={glass}>
          <AlertTriangle className="h-12 w-12 text-zinc-600 mx-auto mb-4" aria-hidden="true" />
          <p className="text-white font-bold">Nenhum cliente sumido encontrado</p>
          <p className="text-zinc-500 text-sm mt-1">Seus clientes estão visitando regularmente! 🎉</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {clientesFiltrados.map((cliente) => (
            <motion.div
              key={cliente.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="p-4 rounded-2xl border border-white/[0.08] bg-zinc-950/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-5 w-5 text-orange-400" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">{cliente.nome}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                          <Phone className="h-3 w-3" aria-hidden="true" /> {cliente.telefone || "Sem tel."}
                        </span>
                        <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                          <Calendar className="h-3 w-3" aria-hidden="true" /> {cliente.total_visitas} visitas
                        </span>
                        <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                          <DollarSign className="h-3 w-3" aria-hidden="true" /> R$ {cliente.valor_total_gasto.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={cn(
                      "text-[9px] px-2 py-0.5",
                      cliente.dias_sem_visitar > 90 ? "bg-red-500/20 text-red-400" :
                      cliente.dias_sem_visitar > 60 ? "bg-orange-500/20 text-orange-400" :
                      "bg-yellow-500/20 text-yellow-400"
                    )}>
                      {cliente.dias_sem_visitar} dias
                    </Badge>
                    <Button
                      size="sm"
                      className="h-8 px-3 text-[9px] font-black uppercase"
                      style={{ backgroundColor: brand }}
                      onClick={() => handleReconquistar(cliente)}
                      disabled={reconquistando === cliente.id}
                      aria-label={`Reconquistar ${cliente.nome}`}
                    >
                      {reconquistando === cliente.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Reconquistar"
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}