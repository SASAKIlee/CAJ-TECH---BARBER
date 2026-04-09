import { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Check, X, MessageCircle, Users, Clock, ShieldAlert, LogOut, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { agendamentoSchema } from "@/lib/schemas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { hexToRgba, contrastTextOnBrand } from "@/lib/branding";

const MotionButton = motion.create(Button);

function getHojeLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function gerarHorariosDinamicos(abertura = "09:00", fechamento = "18:00") {
  const horarios = [];
  let [horaAtual, minAtual] = abertura.split(':').map(Number);
  const [horaFim, minFim] = fechamento.split(':').map(Number);

  while (horaAtual < horaFim || (horaAtual === horaFim && minAtual < minFim)) {
    const hFormated = String(horaAtual).padStart(2, '0');
    const mFormated = String(minAtual).padStart(2, '0');
    horarios.push(`${hFormated}:${mFormated}`);

    minAtual += 30;
    if (minAtual >= 60) {
      minAtual -= 60;
      horaAtual += 1;
    }
  }
  return horarios;
}

export function VisaoBarbeiro({
  barbeiros = [],
  servicos = [],
  agendamentos = [],
  onNovoAgendamento,
  onStatusChange,
  barbeiroSelecionadoId,
  setBarbeiroSelecionadoId,
  horariosOcupados,
  servicos_find,
  isDono,
  userId,
  corPrimaria = "#D4AF37",
}: any) {
  const [open, setOpen] = useState(false);
  const [infoLoja, setInfoLoja] = useState({ abertura: "09:00", fechamento: "19:00", nome: "nossa barbearia" });
  
  const [isLojaAtiva, setIsLojaAtiva] = useState<boolean | null>(null);
  
  const [novo, setNovo] = useState({
    nome: "", telefone: "", servicoId: "", barbeiroId: barbeiroSelecionadoId || "", data: "", horario: "",
  });
  const [dismissing, setDismissing] = useState<{ id: string; status: "Finalizado" | "Cancelado" } | null>(null);

  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  const brand = corPrimaria?.trim() || "#D4AF37";
  const ctaFg = contrastTextOnBrand(brand);
  const glass = { backgroundColor: hexToRgba(brand, 0.1), backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" } as const;

  const perfilLogado = barbeiros.find((b: any) => b.id === userId);

  useEffect(() => {
    async function fetchHorariosConfig() {
      const slug = barbeiros[0]?.barbearia_slug;
      if (!slug) return;
      const { data } = await supabase.from('barbearias').select('horario_abertura, horario_fechamento, nome, ativo').eq('slug', slug).single();
      if (data) {
        setIsLojaAtiva(data.ativo !== false);
        setInfoLoja({ 
          abertura: data.horario_abertura || "09:00", 
          fechamento: data.horario_fechamento || "19:00",
          nome: data.nome || "nossa barbearia"
        });
      }
    }
    fetchHorariosConfig();
  }, [barbeiros]);

  useEffect(() => {
    if (open) setNovo((prev) => ({ ...prev, barbeiroId: barbeiroSelecionadoId || "", data: getHojeLocal() }));
  }, [open, barbeiroSelecionadoId]);

  const horarios = useMemo(() => gerarHorariosDinamicos(infoLoja.abertura, infoLoja.fechamento), [infoLoja]);

  const { horaAtual, minAtual, hojeLocal } = useMemo(() => {
    const agora = new Date();
    return { horaAtual: agora.getHours(), minAtual: agora.getMinutes(), hojeLocal: getHojeLocal() };
  }, []);

  const pendentesOrdenados = useMemo(() => {
    const lista = agendamentos.filter((a: any) => a.status === "Pendente");
    return [...lista].sort((a: any, b: any) => String(a.horario).localeCompare(String(b.horario)));
  }, [agendamentos]);

  // 🚀 OTIMIZAÇÃO DE PERFORMANCE: Calcula horários ocupados apenas uma vez por render do modal
  const slotsOcupados = useMemo(() => {
    if (!novo.data || !novo.barbeiroId) return [];
    return horariosOcupados(novo.data, novo.barbeiroId) || [];
  }, [novo.data, novo.barbeiroId, horariosOcupados, agendamentos]);


  if (!isDono && (isLojaAtiva === false || (perfilLogado && perfilLogado.ativo === false))) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6 backdrop-blur-md">
        <div className="max-w-sm w-full space-y-6 text-center">
          <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 bg-red-600/20 blur-3xl rounded-full" />
            {isLojaAtiva === false ? (
              <Lock className="h-12 w-12 text-red-500 relative z-10" />
            ) : (
              <ShieldAlert className="h-20 w-20 text-red-500 relative z-10 stroke-[1.5px]" />
            )}
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">
              {isLojaAtiva === false ? "Sistema Bloqueado" : "Acesso Negado"}
            </h1>
            <p className="text-zinc-400 font-bold uppercase text-xs tracking-widest">
              {isLojaAtiva === false 
                ? "A barbearia encontra-se com o acesso suspenso." 
                : "Seu perfil de barbeiro está desativado pelo dono."}
            </p>
          </div>
          <MotionButton variant="ghost" className="w-full h-12 text-zinc-500 font-black uppercase text-xs hover:text-white" whileTap={{ scale: 0.95 }} onClick={() => supabase.auth.signOut()}>
            <LogOut className="mr-2 h-4 w-4" /> Sair da Conta
          </MotionButton>
        </div>
      </div>
    );
  }

  const handleAgendar = async () => {
    const toastId = toast.loading("Processando...");
    const validacao = agendamentoSchema.safeParse(novo);

    if (!validacao.success) {
      toast.dismiss(toastId);
      return toast.error(validacao.error.errors[0].message);
    }

    try {
      const res = await onNovoAgendamento({
        nome_cliente: validacao.data.nome, telefone_cliente: validacao.data.telefone,
        servico_id: validacao.data.servicoId, barbeiro_id: validacao.data.barbeiroId,
        data: validacao.data.data, horario: validacao.data.horario,
      });

      toast.dismiss(toastId);
      if (!res?.error) {
        setOpen(false);
        setNovo({ nome: "", telefone: "", servicoId: "", barbeiroId: barbeiroSelecionadoId, data: getHojeLocal(), horario: "" });
        toast.success("Agendado com sucesso! ✂️");
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.dismiss(toastId);
      toast.error("Erro crítico de comunicação.");
    }
  };

  const iniciarSaida = (id: string, status: "Finalizado" | "Cancelado") => {
    if (dismissing) return;
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
    <div className="space-y-6 text-white pb-32">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-2">
        <div>
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Agenda do Dia</h2>
          {isDono && <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: brand }}>Visão Administrativa</p>}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <MotionButton className="rounded-[20px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] gap-2 h-14 px-8 font-black uppercase text-xs border-0" style={{ backgroundColor: brand, color: ctaFg }} whileTap={{ scale: 0.95 }}>
              <Plus className="h-5 w-5 stroke-[3px]" /> Novo Agendamento
            </MotionButton>
          </DialogTrigger>
          <DialogContent className="dark border-white/[0.08] text-white w-[95vw] sm:max-w-md p-6 rounded-[2rem] max-h-[90vh] overflow-y-auto custom-scrollbar bg-zinc-950/95 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-white font-black uppercase italic text-2xl flex items-center gap-2">
                <Clock style={{ color: brand }} /> Novo Horário
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Cliente</label>
                <Input placeholder="Nome Completo" className="rounded-xl border-white/[0.08] bg-black/35 h-14 text-base backdrop-blur-sm" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">WhatsApp</label>
                <Input type="tel" placeholder="(11) 99999-9999" className="rounded-xl border-white/[0.08] bg-black/35 h-14 text-base backdrop-blur-sm" value={novo.telefone} onChange={(e) => setNovo({ ...novo, telefone: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Barbeiro</label>
                  <Select value={novo.barbeiroId} onValueChange={(v) => setNovo({ ...novo, barbeiroId: v, horario: "" })}>
                    <SelectTrigger className="rounded-xl border-white/[0.08] bg-black/35 h-14 text-base backdrop-blur-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white rounded-xl">
                      {barbeiros.filter((b: any) => b.ativo).map((b: any) => (<SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Serviço</label>
                  <Select value={novo.servicoId} onValueChange={(v) => setNovo({ ...novo, servicoId: v })}>
                    <SelectTrigger className="rounded-xl border-white/[0.08] bg-black/35 h-14 text-base backdrop-blur-sm"><SelectValue placeholder="Serviço" /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white rounded-xl">
                      {servicos.map((s: any) => (<SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Data</label>
                <Input type="date" className="rounded-xl border-white/[0.08] bg-black/35 h-14 text-base color-scheme-dark backdrop-blur-sm" value={novo.data} onChange={(e) => setNovo({ ...novo, data: e.target.value, horario: "" })} />
              </div>

              <div className="space-y-2 border-t border-white/[0.08] pt-4 mt-2">
                <label className="text-[10px] font-black text-zinc-500 tracking-widest ml-1 uppercase">Horários Disponíveis</label>
                <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {horarios.map((h) => {
                    const [hH, mH] = h.split(":").map(Number);
                    const isHoje = novo.data === hojeLocal;
                    const busy = slotsOcupados.includes(h);
                    const disable = !novo.barbeiroId || busy || (isHoje && (hH < horaAtual || (hH === horaAtual && mH <= minAtual)));

                    return (
                      <MotionButton key={h} type="button" variant={novo.horario === h ? "default" : "outline"} disabled={disable} whileTap={!disable ? { scale: 0.95 } : undefined} onClick={() => setNovo({ ...novo, horario: h })}
                        className={cn("text-[12px] font-bold h-12 rounded-xl transition-colors", novo.horario === h ? "border-0 shadow-lg" : "text-white bg-black/30 border-white/[0.08]", disable && "opacity-20")}
                        style={novo.horario === h ? { backgroundColor: brand, color: ctaFg } : undefined}>
                        {h}
                      </MotionButton>
                    );
                  })}
                </div>
              </div>

              <MotionButton className="w-full h-16 font-black uppercase text-sm rounded-2xl mt-4 border-0 shadow-xl" style={{ backgroundColor: brand, color: ctaFg }} whileTap={{ scale: 0.95 }} onClick={() => void handleAgendar()}>
                Confirmar Agendamento
              </MotionButton>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isDono && (
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
          <MotionButton variant={barbeiroSelecionadoId === "" ? "default" : "outline"} size="sm" whileTap={{ scale: 0.95 }} onClick={() => setBarbeiroSelecionadoId("")}
            className={cn("rounded-xl text-[10px] font-black uppercase h-10 px-5 border-white/[0.08] transition-colors", barbeiroSelecionadoId === "" && "border-0 shadow-lg")}
            style={barbeiroSelecionadoId === "" ? { backgroundColor: brand, color: ctaFg } : { backgroundColor: hexToRgba(brand, 0.05) }}>
            Todos
          </MotionButton>
          {barbeiros.map((b: any) => (
            <MotionButton key={b.id} variant={barbeiroSelecionadoId === b.id ? "default" : "outline"} size="sm" whileTap={{ scale: 0.95 }} onClick={() => setBarbeiroSelecionadoId(b.id)}
              className={cn("rounded-xl text-[10px] font-black uppercase h-10 px-5 whitespace-nowrap border-white/[0.08] transition-colors", barbeiroSelecionadoId === b.id && "border-0 shadow-lg", !b.ativo && "opacity-40 grayscale")}
              style={barbeiroSelecionadoId === b.id ? { backgroundColor: brand, color: ctaFg } : { backgroundColor: hexToRgba(brand, 0.05) }}>
              {b.nome} {!b.ativo && "(INATIVO)"}
            </MotionButton>
          ))}
        </div>
      )}

      <div className="relative pl-6 sm:pl-8 pt-4">
        {/* LINHA DO TEMPO (TIMELINE) */}
        <div className="absolute left-[11px] sm:left-[13px] top-4 bottom-2 w-[2px] bg-gradient-to-b from-white/20 via-white/5 to-transparent rounded-full" aria-hidden />

        {pendentesOrdenados.length === 0 ? (
          <div className="text-center py-20 rounded-[2rem] border border-dashed border-white/[0.12] mt-4" style={glass}>
            <Clock className="h-12 w-12 text-zinc-600 mx-auto mb-4 opacity-50" />
            <p className="text-zinc-500 font-bold uppercase text-[11px] tracking-widest">Nenhum agendamento pendente</p>
          </div>
        ) : (
          <ul className="space-y-6">
              {pendentesOrdenados.map((ag: any) => {
                const servico = servicos_find(ag.servico_id);
                const barbeiro = barbeiros.find((b: any) => b.id === ag.barbeiro_id);
                const saindo = dismissing?.id === ag.id;
                const saidaDireita = dismissing?.status === "Finalizado";
                
                // Validação de telefone para evitar links do whatsapp quebrados
                const numValido = ag.telefone_cliente ? ag.telefone_cliente.replace(/\D/g, "") : "";
                const temWhatsapp = numValido.length >= 10;

                return (
                  <motion.li key={ag.id} layout initial={{ opacity: 0, x: 36 }}
                    animate={saindo ? { opacity: 0, x: saidaDireita ? 56 : -56, scale: 0.98, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } } : { opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 380, damping: 32 } }}
                    className="relative">
                    
                    {/* PONTO DA TIMELINE */}
                    <div className="absolute left-[-22px] sm:left-[-24.5px] top-6 sm:top-7 h-3.5 w-3.5 rounded-full border-[3px] border-white/20 bg-zinc-950 shadow-[0_0_12px_rgba(255,255,255,0.15)] z-10 transition-colors"
                      style={{ borderColor: saindo ? "transparent" : hexToRgba(brand, 0.85), boxShadow: `0 0 14px ${hexToRgba(brand, 0.4)}` }} />
                    
                    <Card className={cn("p-5 sm:p-6 rounded-[24px] border border-white/[0.08] shadow-2xl flex flex-col gap-5")} style={glass}>
                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-4xl font-black text-white tracking-tighter">{ag.horario}</span>
                            <Badge className="text-[9px] font-black uppercase py-1 px-3 rounded-md border-0" style={{ backgroundColor: hexToRgba(brand, 0.15), color: brand }}>Pendente</Badge>
                          </div>
                        </div>
                        
                        <div>
                          <p className="font-black text-xl text-white uppercase leading-tight mb-2">{ag.nome_cliente}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-2 bg-black/30 p-3 rounded-xl border border-white/[0.05]">
                            <span className="text-[10px] font-black text-zinc-400 uppercase flex items-center gap-1.5"><Users className="h-3.5 w-3.5" style={{ color: brand }} /> {barbeiro?.nome || "Profissional"}</span>
                            <span className="text-[10px] font-black uppercase flex items-center gap-1.5" style={{ color: brand }}>{servico?.nome || "Corte"} • R${servico?.preco || 0}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 pt-4 border-t border-white/[0.08]">
                        <MotionButton size="icon" className={cn("h-12 w-12 rounded-xl shrink-0 border transition-all", temWhatsapp ? "text-green-500 bg-green-500/10 hover:bg-green-500/20 border-green-500/20" : "text-zinc-600 bg-zinc-800/30 border-zinc-800 opacity-50 cursor-not-allowed")}
                          whileTap={temWhatsapp ? { scale: 0.95 } : undefined} disabled={!!dismissing || !temWhatsapp}
                          onClick={() => {
                            if (!temWhatsapp) return;
                            const msg = `Fala, *${ag.nome_cliente}*! Tudo bem? ✂️\n\nPassando para confirmar seu horário hoje às *${ag.horario}* aqui na *${infoLoja.nome}*!\n\nJá estou preparando as máquinas. ☕️ Te espero para darmos aquele trato no visual! 🔥👊`;
                            window.open(`https://api.whatsapp.com/send?phone=55${numValido}&text=${encodeURIComponent(msg)}`, "_blank");
                          }} title={temWhatsapp ? "Avisar no WhatsApp" : "Cliente sem telefone cadastrado"}>
                          <MessageCircle className="h-6 w-6" />
                        </MotionButton>

                        <MotionButton className="flex-1 h-12 bg-green-600 hover:bg-green-500 text-white font-black uppercase text-[10px] sm:text-xs tracking-widest rounded-xl shadow-lg border-0"
                          whileTap={{ scale: 0.95 }} disabled={!!dismissing} onClick={() => iniciarSaida(ag.id, "Finalizado")}>
                          <Check className="h-5 w-5 mr-1.5 stroke-[3px]" /> Concluir
                        </MotionButton>

                        <MotionButton variant="outline" className="flex-1 sm:flex-none sm:w-32 h-12 text-red-500 border-red-500/30 bg-red-500/5 hover:bg-red-500/10 font-black uppercase text-[10px] sm:text-xs tracking-widest rounded-xl transition-colors"
                          whileTap={{ scale: 0.95 }} disabled={!!dismissing} onClick={() => iniciarSaida(ag.id, "Cancelado")}>
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