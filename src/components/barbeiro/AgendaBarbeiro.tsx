import { useState, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Clock, Users, Crown, MessageCircle, Check, X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { hexToRgba } from "@/lib/branding";

const MotionButton = motion.create(Button);

interface AgendaBarbeiroProps {
  agendamentos: any[];
  barbeiros: any[];
  servicos_find: (id: string) => any;
  brand: string;
  infoLojaNome: string;
  onStatusChange: (id: string, status: string) => Promise<void>;
}

export function AgendaBarbeiro({ agendamentos, barbeiros, servicos_find, brand, infoLojaNome, onStatusChange }: AgendaBarbeiroProps) {
  const [statusFiltro, setStatusFiltro] = useState<"Pendente" | "Todos">("Pendente");
  const [dismissing, setDismissing] = useState<{ id: string; status: "Finalizado" | "Cancelado" } | null>(null);
  
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  const glass = useMemo(() => ({ backgroundColor: hexToRgba(brand, 0.1), backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }), [brand]);

  const agendamentosFiltrados = useMemo(() => {
    let filtrados = agendamentos;
    if (statusFiltro === "Pendente") filtrados = filtrados.filter((a) => a.status === "Pendente");
    return [...filtrados].sort((a, b) => String(a.horario).localeCompare(String(b.horario)));
  }, [agendamentos, statusFiltro]);

  const iniciarSaida = (id: string, status: "Finalizado" | "Cancelado") => {
    if (dismissing) return;
    if (status === "Cancelado" && !confirm("Cancelar este agendamento? Esta ação não pode ser desfeita.")) return;
    setDismissing({ id, status });
  };

  useEffect(() => {
    if (!dismissing) return;
    const { id, status } = dismissing;
    const t = window.setTimeout(() => {
      void Promise.resolve(onStatusChangeRef.current(id, status)).finally(() => setDismissing(null));
    }, 400);
    return () => clearTimeout(t);
  }, [dismissing]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Filter className="h-4 w-4 text-white/50" />
        <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as "Pendente" | "Todos")}>
          <SelectTrigger className="w-40 h-10 rounded-xl border-white/[0.08] bg-black/35 text-xs uppercase font-black">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800 text-white rounded-xl">
            <SelectItem value="Pendente">Pendentes</SelectItem>
            <SelectItem value="Todos">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="relative pl-6 sm:pl-8 pt-4">
        <div className="absolute left-[11px] sm:left-[13px] top-4 bottom-2 w-[2px] bg-gradient-to-b from-white/20 via-white/5 to-transparent rounded-full" aria-hidden />

        {agendamentosFiltrados.length === 0 ? (
          <div className="text-center py-20 rounded-[2rem] border border-dashed border-white/[0.12] mt-4" style={glass}>
            <Clock className="h-12 w-12 text-zinc-600 mx-auto mb-4 opacity-50" />
            <p className="text-zinc-500 font-bold uppercase text-[11px] tracking-widest">Nenhum agendamento {statusFiltro === "Pendente" ? "pendente" : "encontrado"}</p>
          </div>
        ) : (
          <ul className="space-y-6">
            {agendamentosFiltrados.map((ag) => {
              const servico = servicos_find(ag.servico_id);
              const barbeiro = barbeiros.find((b) => b.id === ag.barbeiro_id);
              const saindo = dismissing?.id === ag.id;
              const saidaDireita = dismissing?.status === "Finalizado";
              const numValido = ag.telefone_cliente ? ag.telefone_cliente.replace(/\D/g, "") : "";
              const temWhatsapp = numValido.length >= 10;

              return (
                <motion.li key={ag.id} layout initial={{ opacity: 0, x: 36 }} animate={saindo ? { opacity: 0, x: saidaDireita ? 56 : -56, scale: 0.98 } : { opacity: 1, x: 0, scale: 1 }} className="relative">
                  <div className="absolute left-[-22px] sm:left-[-24.5px] top-6 sm:top-7 h-3.5 w-3.5 rounded-full border-[3px] border-white/20 bg-zinc-950 z-10 transition-colors" style={{ borderColor: saindo ? "transparent" : hexToRgba(brand, 0.85), boxShadow: `0 0 14px ${hexToRgba(brand, 0.4)}` }} />
                  <Card className="p-5 sm:p-6 rounded-[24px] border border-white/[0.08] shadow-2xl flex flex-col gap-5" style={glass}>
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-4xl font-black text-white tracking-tighter">{ag.horario}</span>
                          <Badge className="text-[9px] font-black uppercase py-1 px-3 rounded-md border-0" style={{ backgroundColor: hexToRgba(brand, 0.15), color: brand }}>{ag.status}</Badge>
                        </div>
                      </div>
                      <div>
                        <p className="font-black text-xl text-white uppercase leading-tight mb-2 flex items-center gap-1">
                          {ag.nome_cliente}
                          {agendamentos.filter(a => a.telefone_cliente === ag.telefone_cliente && a.status === 'Finalizado').length >= 5 && <Crown className="h-5 w-5 text-yellow-500" />}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 bg-black/30 p-3 rounded-xl border border-white/[0.05]">
                          <span className="text-[10px] font-black text-zinc-400 uppercase flex items-center gap-1.5"><Users className="h-3.5 w-3.5" style={{ color: brand }} /> {barbeiro?.nome || "Profissional"}</span>
                          <span className="text-[10px] font-black uppercase flex items-center gap-1.5" style={{ color: brand }}>{servico?.nome || "Corte"} • R${servico?.preco || 0}</span>
                        </div>
                      </div>
                    </div>
                    {ag.observacao && (
                      <div className="mt-2 flex items-start gap-2 p-3 bg-yellow-500/10 border-l-2 border-yellow-500 rounded-lg">
                        <MessageCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-yellow-100/80 italic">{ag.observacao}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 pt-4 border-t border-white/[0.08]">
                      <MotionButton size="icon" className={cn("h-12 w-12 rounded-xl shrink-0 border transition-all", temWhatsapp ? "text-green-500 bg-green-500/10 hover:bg-green-500/20 border-green-500/20" : "text-zinc-600 bg-zinc-800/30 border-zinc-800 opacity-50 cursor-not-allowed")} whileTap={temWhatsapp ? { scale: 0.95 } : undefined} disabled={!!dismissing || !temWhatsapp} onClick={() => { if(temWhatsapp) window.open(`https://api.whatsapp.com/send?phone=55${numValido}&text=${encodeURIComponent(`Fala, *${ag.nome_cliente}*! Tudo bem? ✂️\n\nPassando para confirmar seu horário hoje às *${ag.horario}* aqui na *${infoLojaNome}*!`)}`, "_blank"); }}>
                        <MessageCircle className="h-6 w-6" />
                      </MotionButton>
                      <MotionButton className="flex-1 h-12 bg-green-600 hover:bg-green-500 text-white font-black uppercase text-[10px] sm:text-xs tracking-widest rounded-xl shadow-lg border-0" whileTap={{ scale: 0.95 }} disabled={!!dismissing} onClick={() => iniciarSaida(ag.id, "Finalizado")}>
                        <Check className="h-5 w-5 mr-1.5 stroke-[3px]" /> Concluir
                      </MotionButton>
                      <MotionButton variant="outline" className="flex-1 sm:flex-none sm:w-32 h-12 text-red-500 border-red-500/30 bg-red-500/5 hover:bg-red-500/10 font-black uppercase text-[10px] sm:text-xs tracking-widest rounded-xl transition-colors" whileTap={{ scale: 0.95 }} disabled={!!dismissing} onClick={() => iniciarSaida(ag.id, "Cancelado")}>
                        <X className="h-5 w-5 mr-1.5 stroke-[3px]" /> Cancelar
                      </MotionButton>
                    </div>
                  </Card>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}