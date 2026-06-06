import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Crown, Search, UserPlus, Trash2, Loader2, Phone, Calendar, DollarSign, AlertCircle, X, MessageSquare, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ClienteVIP } from "@/types/dono";

interface ClientesVIPProps {
  slug: string;
  brand: string;
  glass: React.CSSProperties;
}

interface ClienteFidelidade {
  id: string; // telefone ou nome
  nome: string;
  telefone: string;
  total_visitas: number;
  valor_total_gasto: number;
  ultimo_agendamento: string;
  isVip: boolean;
  vipInfo?: ClienteVIP;
}

export function ClientesVIP({ slug, brand, glass }: ClientesVIPProps) {
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Lista de VIPs cadastrados
  const [vips, setVips] = useState<ClienteVIP[]>([]);
  // Todos os clientes do histórico (agrupados por agendamentos)
  const [clientesHistorico, setClientesHistorico] = useState<ClienteFidelidade[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [modalManualAberto, setModalManualAberto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usandoFallbackLocal, setUsandoFallbackLocal] = useState(false);

  // Formulário manual
  const [novoVip, setNovoVip] = useState({
    nome: "",
    telefone: "",
    observacao: ""
  });

  const getStorageKey = useCallback(() => `corte_perfeito_vips_${slug}`, [slug]);

  // Carregar dados das duas fontes (agendamentos e vip)
  const carregarDados = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      // 1. Carregar VIPs do Supabase
      let listVips: ClienteVIP[] = [];
      let dbError = false;

      try {
        const { data: vipsDb, error: errDb } = await supabase
          .from("clientes_vip")
          .select("*")
          .eq("barbearia_slug", slug)
          .abortSignal(controller.signal);

        if (errDb) {
          // Se der erro de relação não encontrada, cai no fallback de localStorage
          if (errDb.message?.includes("relation") || errDb.code === "P0001") {
            dbError = true;
          } else {
            throw errDb;
          }
        } else {
          listVips = vipsDb || [];
          setUsandoFallbackLocal(false);
        }
      } catch (e) {
        console.warn("Erro ao buscar clientes_vip no Supabase, usando fallback LocalStorage:", e);
        dbError = true;
      }

      if (dbError) {
        setUsandoFallbackLocal(true);
        const localData = localStorage.getItem(getStorageKey());
        if (localData) {
          try {
            listVips = JSON.parse(localData);
          } catch {
            listVips = [];
          }
        }
      }

      setVips(listVips);

      if (controller.signal.aborted) return;

      // 2. Carregar Histórico de Agendamentos para agrupar clientes
      const { data: agendamentos, error: errAg } = await supabase
        .from("agendamentos")
        .select(`
          id, nome_cliente, telefone_cliente, data,
          servicos ( preco )
        `)
        .eq("barbearia_slug", slug)
        .eq("status", "Finalizado")
        .order("data", { ascending: false })
        .abortSignal(controller.signal);

      if (errAg) throw errAg;
      if (controller.signal.aborted) return;

      const mapaClientes = new Map<string, ClienteFidelidade>();

      // Agrupa pelo telefone limpo (só dígitos) ou nome caso sem telefone
      (agendamentos || []).forEach((ag: any) => {
        const telLimpo = ag.telefone_cliente?.replace(/\D/g, "") || "";
        const chave = telLimpo || ag.nome_cliente?.toLowerCase().trim();
        if (!chave) return;

        const valor = ag.servicos?.preco || 0;
        const vipAssociado = listVips.find(
          v => v.telefone?.replace(/\D/g, "") === telLimpo && telLimpo !== ""
        );

        const existente = mapaClientes.get(chave);
        if (existente) {
          existente.total_visitas += 1;
          existente.valor_total_gasto += valor;
          if (new Date(ag.data) > new Date(existente.ultimo_agendamento)) {
            existente.ultimo_agendamento = ag.data;
          }
        } else {
          mapaClientes.set(chave, {
            id: chave,
            nome: ag.nome_cliente,
            telefone: ag.telefone_cliente || "",
            total_visitas: 1,
            valor_total_gasto: valor,
            ultimo_agendamento: ag.data,
            isVip: !!vipAssociado,
            vipInfo: vipAssociado
          });
        }
      });

      // Adicionar à lista de fidelidade os VIPs manuais que nunca agendaram
      listVips.forEach((vip) => {
        const telLimpo = vip.telefone?.replace(/\D/g, "");
        if (!telLimpo) return;

        const existente = mapaClientes.get(telLimpo);
        if (!existente) {
          mapaClientes.set(telLimpo, {
            id: telLimpo,
            nome: vip.nome,
            telefone: vip.telefone,
            total_visitas: 0,
            valor_total_gasto: 0,
            ultimo_agendamento: "",
            isVip: true,
            vipInfo: vip
          });
        }
      });

      const listaCompleta = Array.from(mapaClientes.values()).sort((a, b) => {
        if (a.isVip && !b.isVip) return -1;
        if (!a.isVip && b.isVip) return 1;
        return b.total_visitas - a.total_visitas;
      });

      setClientesHistorico(listaCompleta);

    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("Erro ao carregar dados de fidelidade:", err);
      toast.error("Erro ao carregar clientes.");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [slug, getStorageKey]);

  useEffect(() => {
    carregarDados();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [carregarDados]);

  // Alternar VIP no banco de dados ou localStorage
  const handleToggleVip = useCallback(async (cliente: ClienteFidelidade) => {
    const isRemovendo = cliente.isVip;
    const toastId = toast.loading(isRemovendo ? "Removendo VIP..." : "Promovendo a VIP...");

    try {
      if (usandoFallbackLocal) {
        // Fluxo LocalStorage
        let listAtual = [...vips];
        if (isRemovendo) {
          listAtual = listAtual.filter(v => v.telefone?.replace(/\D/g, "") !== cliente.telefone?.replace(/\D/g, ""));
        } else {
          listAtual.push({
            barbearia_slug: slug,
            nome: cliente.nome,
            telefone: cliente.telefone,
            observacao: "Promovido via histórico",
            criado_em: new Date().toISOString()
          });
        }
        localStorage.setItem(getStorageKey(), JSON.stringify(listAtual));
        toast.success(isRemovendo ? "Cliente removido da lista VIP." : "Cliente promovido a VIP! 👑", { id: toastId });
        carregarDados();
      } else {
        // Fluxo Supabase
        if (isRemovendo && cliente.vipInfo?.id) {
          const { error } = await supabase
            .from("clientes_vip")
            .delete()
            .eq("id", cliente.vipInfo.id);

          if (error) throw error;
          toast.success("Cliente removido da lista VIP.", { id: toastId });
        } else {
          const { error } = await supabase
            .from("clientes_vip")
            .insert({
              barbearia_slug: slug,
              nome: cliente.nome,
              telefone: cliente.telefone,
              observacao: "Promovido via histórico"
            });

          if (error) throw error;
          toast.success("Cliente promovido a VIP! 👑", { id: toastId });
        }
        carregarDados();
      }
    } catch (err: any) {
      console.error("Erro ao alternar VIP:", err);
      toast.error("Erro ao salvar alteração: " + err.message, { id: toastId });
    }
  }, [slug, vips, usandoFallbackLocal, getStorageKey, carregarDados]);

  // Adicionar VIP manualmente
  const handleAddVipManual = async () => {
    if (!novoVip.nome.trim()) return toast.error("Informe o nome do cliente.");
    const telLimpo = novoVip.telefone.replace(/\D/g, "");
    if (telLimpo.length < 10) return toast.error("Telefone inválido. Informe DDD + número.");

    setIsSubmitting(true);
    const toastId = toast.loading("Adicionando cliente VIP...");
    try {
      if (usandoFallbackLocal) {
        const listAtual = [...vips];
        if (listAtual.some(v => v.telefone.replace(/\D/g, "") === telLimpo)) {
          throw new Error("Este telefone de cliente já está marcado como VIP.");
        }

        listAtual.push({
          barbearia_slug: slug,
          nome: novoVip.nome.trim(),
          telefone: novoVip.telefone,
          observacao: novoVip.observacao.trim() || undefined,
          criado_em: new Date().toISOString()
        });

        localStorage.setItem(getStorageKey(), JSON.stringify(listAtual));
        toast.success("Cliente VIP cadastrado manualmente! 👑", { id: toastId });
        setNovoVip({ nome: "", telefone: "", observacao: "" });
        setModalManualAberto(false);
        carregarDados();
      } else {
        const { error } = await supabase
          .from("clientes_vip")
          .insert({
            barbearia_slug: slug,
            nome: novoVip.nome.trim(),
            telefone: novoVip.telefone,
            observacao: novoVip.observacao.trim()
          });

        if (error) {
          if (error.message?.includes("unique")) {
            throw new Error("Este telefone de cliente já está cadastrado como VIP nesta barbearia.");
          }
          throw error;
        }

        toast.success("Cliente VIP cadastrado manualmente! 👑", { id: toastId });
        setNovoVip({ nome: "", telefone: "", observacao: "" });
        setModalManualAberto(false);
        carregarDados();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao adicionar VIP.", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Excluir VIP manual direto pela lixeira
  const handleExcluirVipManual = async (id: string, telefone: string) => {
    const confirmado = confirm("Remover este cliente do status VIP?");
    if (!confirmado) return;

    const toastId = toast.loading("Removendo...");
    try {
      if (usandoFallbackLocal) {
        const listAtual = vips.filter(v => v.telefone !== telefone);
        localStorage.setItem(getStorageKey(), JSON.stringify(listAtual));
        toast.success("Removido com sucesso.", { id: toastId });
        carregarDados();
      } else {
        const { error } = await supabase
          .from("clientes_vip")
          .delete()
          .eq("id", id);

        if (error) throw error;
        toast.success("Removido com sucesso.", { id: toastId });
        carregarDados();
      }
    } catch (err: any) {
      toast.error("Erro: " + err.message, { id: toastId });
    }
  };

  const filtrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    if (!termo) return clientesHistorico;
    return clientesHistorico.filter(
      c => c.nome.toLowerCase().includes(termo) || c.telefone.replace(/\D/g, "").includes(termo)
    );
  }, [clientesHistorico, busca]);

  const statsVip = useMemo(() => {
    const vipsHistorico = clientesHistorico.filter(c => c.isVip);
    const totalGasto = vipsHistorico.reduce((sum, c) => sum + c.valor_total_gasto, 0);
    const totalVisitas = vipsHistorico.reduce((sum, c) => sum + c.total_visitas, 0);
    
    return {
      quantidade: vips.length,
      gastoTotal: totalGasto,
      mediaGasto: vipsHistorico.length > 0 ? totalGasto / vipsHistorico.length : 0,
      visitasTotais: totalVisitas
    };
  }, [clientesHistorico, vips.length]);

  return (
    <section className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" aria-hidden="true" />
          <div>
            <h3 className="font-black text-white uppercase text-xl italic">Clientes VIP</h3>
            <p className="text-xs text-zinc-500">Classifique e gerencie o relacionamento com seus clientes premium</p>
          </div>
        </div>
        <Button
          onClick={() => setModalManualAberto(true)}
          className="h-10 px-4 font-black text-xs uppercase"
          style={{ backgroundColor: brand }}
          aria-label="Cadastrar novo cliente VIP manualmente"
        >
          <UserPlus className="h-4 w-4 mr-1" aria-hidden="true" /> VIP Manual
        </Button>
      </div>

      {usandoFallbackLocal && (
        <div className="mx-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 p-3 rounded-xl flex items-center gap-3 text-xs">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>
            Tabela do banco de dados pendente. O sistema está salvando no <strong>modo de segurança local</strong>. Os dados estão funcionais neste dispositivo.
          </p>
        </div>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/5" style={glass}>
          <p className="text-[8px] font-black uppercase tracking-widest text-yellow-600 mb-1">Total de VIPs 👑</p>
          <p className="text-xl font-black text-yellow-300">{statsVip.quantidade}</p>
        </Card>
        <Card className="p-3 rounded-2xl border border-white/[0.08]" style={glass}>
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Gasto Acumulado VIP</p>
          <p className="text-lg font-black text-emerald-400">R$ {statsVip.gastoTotal.toFixed(2)}</p>
        </Card>
        <Card className="p-3 rounded-2xl border border-white/[0.08]" style={glass}>
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Média p/ Cliente VIP</p>
          <p className="text-lg font-black text-blue-400">R$ {statsVip.mediaGasto.toFixed(2)}</p>
        </Card>
        <Card className="p-3 rounded-2xl border border-white/[0.08]" style={glass}>
          <p className="text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Visitas dos VIPs</p>
          <p className="text-lg font-black text-white">{statsVip.visitasTotais} atendimentos</p>
        </Card>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" aria-hidden="true" />
        <Input
          placeholder="Buscar no histórico de clientes por nome ou telefone..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="bg-black/30 border-white/10 pl-10 h-12 rounded-xl"
          aria-label="Buscar cliente"
        />
      </div>

      {/* Tabela de Clientes */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-yellow-500 h-8 w-8" />
        </div>
      ) : filtrados.length === 0 ? (
        <Card className="p-8 rounded-2xl border border-white/[0.08] text-center" style={glass}>
          <Crown className="h-12 w-12 text-zinc-600 mx-auto mb-4" aria-hidden="true" />
          <p className="text-white font-bold">Nenhum cliente encontrado</p>
          <p className="text-zinc-500 text-sm mt-1">
            Clientes que finalizarem atendimentos no aplicativo serão listados aqui automaticamente.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtrados.map((cliente) => (
            <motion.div key={cliente.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
              <Card className={cn(
                "p-4 rounded-2xl border transition-all duration-300",
                cliente.isVip 
                  ? "bg-yellow-950/10 border-yellow-500/20 shadow-md shadow-yellow-500/5" 
                  : "bg-zinc-950/80 border-white/[0.08] hover:border-white/20"
              )}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center shrink-0 border",
                      cliente.isVip 
                        ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" 
                        : "bg-zinc-900 border-zinc-800 text-zinc-600"
                    )}>
                      <Crown className={cn("h-5 w-5", cliente.isVip ? "animate-pulse" : "")} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white text-sm truncate">{cliente.nome}</p>
                        {cliente.isVip && <Badge className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[8px] font-black uppercase tracking-wider h-4">VIP</Badge>}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] text-zinc-500">
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="h-3 w-3 shrink-0" aria-hidden="true" /> {cliente.telefone || "Sem telefone"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 shrink-0" aria-hidden="true" /> {cliente.total_visitas} visitas
                        </span>
                        <span className="flex items-center gap-1 text-emerald-500 font-bold">
                          <DollarSign className="h-3 w-3 shrink-0" aria-hidden="true" /> R$ {cliente.valor_total_gasto.toFixed(2)}
                        </span>
                        {cliente.ultimo_agendamento && (
                          <span className="hidden sm:inline">
                            • Última visita: {new Date(cliente.ultimo_agendamento).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                      {cliente.vipInfo?.observacao && (
                        <p className="text-[10px] text-yellow-600/70 mt-1 italic flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" /> Observação: {cliente.vipInfo.observacao}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {cliente.isVip && cliente.total_visitas === 0 && cliente.vipInfo?.id && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleExcluirVipManual(cliente.vipInfo!.id!, cliente.telefone)}
                        className="text-zinc-500 hover:text-red-400 h-8 w-8 hover:bg-white/5"
                        aria-label="Excluir VIP"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleToggleVip(cliente)}
                      className={cn(
                        "h-8 px-4 text-[9px] font-black uppercase rounded-lg border tracking-wider transition-all duration-200",
                        cliente.isVip
                          ? "bg-transparent border-red-500/30 text-red-400 hover:bg-red-500/10"
                          : "bg-transparent border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                      )}
                      aria-label={cliente.isVip ? "Remover VIP" : "Tornar VIP"}
                    >
                      {cliente.isVip ? "Remover VIP" : "Tornar VIP 👑"}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal VIP Manual */}
      <AnimatePresence>
        {modalManualAberto && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
            <Card className="w-full max-w-sm p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-yellow-500" />
                  <h3 className="text-white font-black uppercase text-lg italic">Adicionar VIP</h3>
                </div>
                <button
                  onClick={() => setModalManualAberto(false)}
                  className="text-zinc-500 hover:text-white bg-zinc-800 h-8 w-8 rounded-full flex items-center justify-center transition-colors"
                  aria-label="Fechar modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Nome Completo</label>
                  <Input
                    value={novoVip.nome}
                    onChange={e => setNovoVip({ ...novoVip, nome: e.target.value })}
                    placeholder="Ex: João Silva"
                    className="bg-black/30 border-white/10 h-12 rounded-xl text-white"
                    aria-label="Nome do cliente"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Telefone com DDD</label>
                  <Input
                    value={novoVip.telefone}
                    onChange={e => setNovoVip({ ...novoVip, telefone: e.target.value })}
                    placeholder="Ex: 11999998888"
                    className="bg-black/30 border-white/10 h-12 rounded-xl text-white font-mono"
                    aria-label="Telefone do cliente"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Observação / Preferências</label>
                  <Input
                    value={novoVip.observacao}
                    onChange={e => setNovoVip({ ...novoVip, observacao: e.target.value })}
                    placeholder="Ex: Só corta cabelo na tesoura"
                    className="bg-black/30 border-white/10 h-12 rounded-xl text-white"
                    aria-label="Observações do cliente VIP"
                  />
                </div>
              </div>

              <Button
                onClick={handleAddVipManual}
                disabled={isSubmitting}
                className="w-full h-12 font-black text-xs uppercase disabled:opacity-50 mt-2"
                style={{ backgroundColor: brand }}
                aria-label="Cadastrar VIP"
              >
                {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Salvar Cliente VIP
              </Button>
            </Card>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
