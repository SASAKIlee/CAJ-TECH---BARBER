import { useState, useEffect } from "react";
import { ListOrdered, Phone, User, Scissors, Plus, X, Check, Bell, AlertCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { FilaEspera, Barbeiro } from "@/types/dono";

interface FilaEsperaInteligenteProps {
  slug: string;
  barbeiros: Barbeiro[];
  brand: string;
  glass: React.CSSProperties;
}

export function FilaEsperaInteligente({ slug, barbeiros, brand, glass }: FilaEsperaInteligenteProps) {
  const [fila, setFila] = useState<FilaEspera[]>([]);
  const [loading, setLoading] = useState(true);
  const [novoCliente, setNovoCliente] = useState({
    nome: "",
    telefone: "",
    servico: "",
    barbeiro: "",
  });
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    carregarFila();
  }, [slug]);

  const carregarFila = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("fila_espera")
        .select("*")
        .eq("barbearia_id", slug)
        .in("status", ["aguardando", "notificado"])
        .order("data_inscricao", { ascending: true });

      if (error) throw error;
      setFila(data || []);
    } catch (err: any) {
      toast.error("Erro ao carregar fila: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdicionar = async () => {
    if (!novoCliente.nome || !novoCliente.telefone || !novoCliente.servico) {
      return toast.error("Preencha nome, telefone e serviço desejado.");
    }

    try {
      const { error } = await supabase.from("fila_espera").insert({
        barbearia_id: slug,
        nome_cliente: novoCliente.nome,
        telefone: novoCliente.telefone,
        servico_desejado: novoCliente.servico,
        barbeiro_preferido: novoCliente.barbeiro || null,
        status: "aguardando",
      });

      if (error) throw error;

      toast.success(`${novoCliente.nome} adicionado à fila de espera!`);
      setNovoCliente({ nome: "", telefone: "", servico: "", barbeiro: "" });
      setModalAberto(false);
      carregarFila();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const handleNotificar = async (item: FilaEspera) => {
    try {
      const { error } = await supabase
        .from("fila_espera")
        .update({ status: "notificado" })
        .eq("id", item.id)
        .eq("barbearia_id", slug);

      if (error) throw error;

      const tel = item.telefone.replace(/\D/g, "");
      const msg = `Olá ${item.nome_cliente}! 👋 Vagou um horário para ${item.servico_desejado} aqui na barbearia! Quer confirmar? Responda SIM para garantir seu lugar.`;
      window.open(`https://api.whatsapp.com/send?phone=55${tel}&text=${encodeURIComponent(msg)}`, "_blank");

      toast.success(`Notificação enviada para ${item.nome_cliente}`);
      carregarFila();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const handleConfirmar = async (id: string) => {
    try {
      const { error } = await supabase
        .from("fila_espera")
        .update({ status: "confirmado" })
        .eq("id", id)
        .eq("barbearia_id", slug);

      if (error) throw error;
      toast.success("Cliente confirmado! Agende o horário.");
      carregarFila();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const handleDesistir = async (id: string) => {
    try {
      const { error } = await supabase
        .from("fila_espera")
        .update({ status: "desistiu" })
        .eq("id", id)
        .eq("barbearia_id", slug);

      if (error) throw error;
      toast.success("Cliente removido da fila.");
      carregarFila();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  const aguardando = fila.filter(f => f.status === "aguardando");
  const notificados = fila.filter(f => f.status === "notificado");

  return (
    <section className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListOrdered className="h-5 w-5 text-blue-500" />
          <div>
            <h3 className="font-black text-white uppercase text-xl italic">Fila de Espera</h3>
            <p className="text-xs text-zinc-500">Cobre cancelamentos automaticamente</p>
          </div>
        </div>
        <Button
          onClick={() => setModalAberto(true)}
          className="h-10 px-4 font-black text-xs uppercase"
          style={{ backgroundColor: brand }}
        >
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5" style={glass}>
          <p className="text-[9px] font-black uppercase tracking-widest text-yellow-600 mb-1">Aguardando</p>
          <p className="text-2xl font-black text-yellow-400">{aguardando.length}</p>
        </Card>
        <Card className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5" style={glass}>
          <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-1">Notificados</p>
          <p className="text-2xl font-black text-blue-400">{notificados.length}</p>
        </Card>
      </div>

      {/* Lista - Notificados primeiro */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-blue-500 h-8 w-8" />
        </div>
      ) : fila.length === 0 ? (
        <Card className="p-8 rounded-2xl border border-white/[0.08] text-center" style={glass}>
          <ListOrdered className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-white font-bold">Fila de espera vazia</p>
          <p className="text-zinc-500 text-sm mt-1">Adicione clientes manualmente quando houver cancelamentos.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Notificados */}
          {notificados.length > 0 && (
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2 flex items-center gap-2">
                <Bell className="h-3 w-3" /> Notificados ({notificados.length})
              </h4>
              <div className="space-y-2">
                {notificados.map(item => (
                  <FilaCard key={item.id} item={item} brand={brand} onNotificar={() => handleNotificar(item)} onConfirmar={() => handleConfirmar(item.id)} onDesistir={() => handleDesistir(item.id)} />
                ))}
              </div>
            </div>
          )}

          {/* Aguardando */}
          {aguardando.length > 0 && (
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-yellow-400 mb-2 flex items-center gap-2">
                <AlertCircle className="h-3 w-3" /> Aguardando Vaga ({aguardando.length})
              </h4>
              <div className="space-y-2">
                {aguardando.map(item => (
                  <FilaCard key={item.id} item={item} brand={brand} onNotificar={() => handleNotificar(item)} onConfirmar={() => handleConfirmar(item.id)} onDesistir={() => handleDesistir(item.id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Adicionar */}
      <AnimatePresence>
        {modalAberto && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
            <Card className="w-full max-w-sm p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-black uppercase text-lg">Novo Cliente na Fila</h3>
                <button onClick={() => setModalAberto(false)} className="text-zinc-500 hover:text-white bg-zinc-800 h-8 w-8 rounded-full flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Nome</label>
                  <Input value={novoCliente.nome} onChange={e => setNovoCliente({ ...novoCliente, nome: e.target.value })} placeholder="Nome do cliente" className="bg-black/30 border-white/10 h-12 rounded-xl" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Telefone</label>
                  <Input value={novoCliente.telefone} onChange={e => setNovoCliente({ ...novoCliente, telefone: e.target.value })} placeholder="(00) 00000-0000" className="bg-black/30 border-white/10 h-12 rounded-xl" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Serviço Desejado</label>
                  <Input value={novoCliente.servico} onChange={e => setNovoCliente({ ...novoCliente, servico: e.target.value })} placeholder="Ex: Corte, Barba..." className="bg-black/30 border-white/10 h-12 rounded-xl" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Barbeiro Preferido (opcional)</label>
                  <Select value={novoCliente.barbeiro} onValueChange={v => setNovoCliente({ ...novoCliente, barbeiro: v })}>
                    <SelectTrigger className="bg-black/30 border-white/10 h-12 rounded-xl">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {barbeiros.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleAdicionar} className="w-full h-12 font-black text-xs uppercase" style={{ backgroundColor: brand }}>
                Adicionar à Fila
              </Button>
            </Card>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}

function FilaCard({ item, brand, onNotificar, onConfirmar, onDesistir }: {
  item: FilaEspera;
  brand: string;
  onNotificar: () => void;
  onConfirmar: () => void;
  onDesistir: () => void;
}) {
  return (
    <Card className="p-3 rounded-xl border border-white/[0.08] bg-zinc-950/80">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white text-xs truncate">{item.nome_cliente}</p>
            <div className="flex items-center gap-2 text-[10px] text-zinc-500">
              <Scissors className="h-3 w-3" /> {item.servico_desejado}
              {item.barbeiro_preferido && <span className="truncate">• {item.barbeiro_preferido}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {item.status === "aguardando" && (
            <Button size="sm" onClick={onNotificar} className="h-7 px-2 text-[8px] font-black uppercase" style={{ backgroundColor: brand }}>
              <Bell className="h-3 w-3 mr-1" /> Notificar
            </Button>
          )}
          {item.status === "notificado" && (
            <>
              <Button size="sm" onClick={onConfirmar} className="h-7 px-2 text-[8px] font-black uppercase bg-green-600 hover:bg-green-500 text-white">
                <Check className="h-3 w-3 mr-1" /> Sim
              </Button>
              <Button size="sm" variant="outline" onClick={onDesistir} className="h-7 px-2 text-[8px] font-black uppercase text-red-500 border-red-500/30">
                <X className="h-3 w-3 mr-1" /> Não
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
