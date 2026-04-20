import { useState, useMemo, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import DOMPurify from "dompurify";
import { agendamentoSchema } from "@/lib/schemas";

const MotionButton = motion.create(Button);

// Funções Auxiliares
function getHojeLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function gerarHorariosDinamicos(abertura = "09:00", fechamento = "19:00"): string[] {
  const horarios: string[] = [];
  let [horaAtual, minAtual] = abertura.split(':').map(Number);
  const [horaFim, minFim] = fechamento.split(':').map(Number);
  while (horaAtual < horaFim || (horaAtual === horaFim && minAtual < minFim)) {
    horarios.push(`${String(horaAtual).padStart(2, '0')}:${String(minAtual).padStart(2, '0')}`);
    minAtual += 30;
    if (minAtual >= 60) { minAtual -= 60; horaAtual += 1; }
  }
  return horarios;
}

function aplicarMascaraTelefone(valor: string): string {
  const digits = valor.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function validarTelefone(telefone: string): boolean {
  return telefone.replace(/\D/g, "").length >= 10;
}

interface ModalNovoAgendamentoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand: string;
  ctaFg: string;
  barbeiros: any[];
  servicos: any[];
  barbeiroSelecionadoId: string;
  onNovoAgendamento: (ag: any) => Promise<{ error?: any }>;
  horariosOcupados: (data: string, bId: string) => string[];
  infoLoja: { abertura: string; fechamento: string };
}

export function ModalNovoAgendamento({
  open, onOpenChange, brand, ctaFg, barbeiros, servicos, barbeiroSelecionadoId,
  onNovoAgendamento, horariosOcupados, infoLoja
}: ModalNovoAgendamentoProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [novo, setNovo] = useState({ nome: "", telefone: "", servicoId: "", barbeiroId: "", data: "", horario: "", observacao: "" });
  const [erros, setErros] = useState<any>({});

  useEffect(() => {
    if (open) {
      setNovo({ nome: "", telefone: "", servicoId: "", barbeiroId: barbeiroSelecionadoId || "", data: getHojeLocal(), horario: "", observacao: "" });
      setErros({});
    }
  }, [open, barbeiroSelecionadoId]);

  const horarios = useMemo(() => gerarHorariosDinamicos(infoLoja.abertura, infoLoja.fechamento), [infoLoja]);
  const { horaAtual, minAtual, hojeLocal } = useMemo(() => {
    const agora = new Date();
    return { horaAtual: agora.getHours(), minAtual: agora.getMinutes(), hojeLocal: getHojeLocal() };
  }, []);

  const slotsOcupados = useMemo(() => (novo.data && novo.barbeiroId ? horariosOcupados(novo.data, novo.barbeiroId) : []), [novo.data, novo.barbeiroId, horariosOcupados]);

  const isFormValid = novo.nome.trim().length > 0 && validarTelefone(novo.telefone) && novo.servicoId !== "" && novo.barbeiroId !== "" && novo.data !== "" && novo.horario !== "";

  const handleAgendar = async () => {
    const newErros = { nome: !novo.nome.trim(), telefone: !validarTelefone(novo.telefone), servicoId: !novo.servicoId, barbeiroId: !novo.barbeiroId, data: !novo.data, horario: !novo.horario };
    setErros(newErros);
    if (Object.values(newErros).some(Boolean)) { toast.error("Preencha todos os campos."); return; }

    setIsSubmitting(true);
    const toastId = toast.loading("Processando...");
    const validacao = agendamentoSchema.safeParse(novo);

    if (!validacao.success) {
      toast.dismiss(toastId);
      toast.error(validacao.error.errors[0].message);
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await onNovoAgendamento({ ...validacao.data, observacao: DOMPurify.sanitize(novo.observacao) });
      toast.dismiss(toastId);
      if (!res?.error) {
        onOpenChange(false);
        toast.success(`Agendamento confirmado! ✂️`);
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.dismiss(toastId);
      toast.error("Erro crítico de comunicação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark border-white/[0.08] text-white w-[95vw] sm:max-w-md p-6 rounded-[2rem] max-h-[90vh] overflow-y-auto custom-scrollbar bg-zinc-950/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-white font-black uppercase italic text-2xl flex items-center gap-2">
            <Clock style={{ color: brand }} /> Novo Horário
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Cliente</label>
            <Input placeholder="Nome Completo" className={cn("rounded-xl border-white/[0.08] bg-black/35 h-14", erros.nome && "border-red-500")} value={novo.nome} onChange={(e) => { setNovo({ ...novo, nome: e.target.value }); setErros({ ...erros, nome: false }); }} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">WhatsApp</label>
            <Input type="tel" placeholder="(11) 99999-9999" className={cn("rounded-xl border-white/[0.08] bg-black/35 h-14", erros.telefone && "border-red-500")} value={novo.telefone} onChange={(e) => { setNovo({ ...novo, telefone: aplicarMascaraTelefone(e.target.value) }); setErros({ ...erros, telefone: false }); }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Barbeiro</label>
              <Select value={novo.barbeiroId} onValueChange={(v) => { setNovo({ ...novo, barbeiroId: v, horario: "" }); setErros({ ...erros, barbeiroId: false }); }}>
                <SelectTrigger className={cn("rounded-xl border-white/[0.08] bg-black/35 h-14", erros.barbeiroId && "border-red-500")}><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white rounded-xl">
                  {barbeiros.filter((b) => b.ativo).map((b) => (<SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Serviço</label>
              <Select value={novo.servicoId} onValueChange={(v) => { setNovo({ ...novo, servicoId: v }); setErros({ ...erros, servicoId: false }); }}>
                <SelectTrigger className={cn("rounded-xl border-white/[0.08] bg-black/35 h-14", erros.servicoId && "border-red-500")}><SelectValue placeholder="Serviço" /></SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white rounded-xl">
                  {servicos.map((s) => (<SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Data</label>
            <Input type="date" className={cn("rounded-xl border-white/[0.08] bg-black/35 h-14", erros.data && "border-red-500")} value={novo.data} onChange={(e) => { setNovo({ ...novo, data: e.target.value, horario: "" }); setErros({ ...erros, data: false }); }} style={{ colorScheme: 'dark' }} />
          </div>
          <div className="space-y-2 border-t border-white/[0.08] pt-4 mt-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Horários Disponíveis</label>
            <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
              {horarios.map((h) => {
                const [hH, mH] = h.split(":").map(Number);
                const isHoje = novo.data === hojeLocal;
                const disable = !novo.barbeiroId || slotsOcupados.includes(h) || (isHoje && (hH < horaAtual || (hH === horaAtual && mH <= minAtual)));
                return (
                  <MotionButton key={h} type="button" variant={novo.horario === h ? "default" : "outline"} disabled={disable} whileTap={!disable ? { scale: 0.95 } : undefined} onClick={() => { setNovo({ ...novo, horario: h }); setErros({ ...erros, horario: false }); }} className={cn("text-[12px] font-bold h-12 rounded-xl transition-colors", novo.horario === h ? "border-0 shadow-lg" : "text-white bg-black/30 border-white/[0.08]", disable && "opacity-20")} style={novo.horario === h ? { backgroundColor: brand, color: ctaFg } : undefined}>
                    {h}
                  </MotionButton>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Recado (opcional)</label>
            <Textarea placeholder="Ex: Quero igual da foto..." className="bg-white/5 border-white/10 text-white rounded-xl min-h-[80px]" value={novo.observacao} onChange={(e) => setNovo({ ...novo, observacao: e.target.value })} />
          </div>
          <MotionButton className="w-full h-16 font-black uppercase text-sm rounded-2xl mt-4 border-0 shadow-xl disabled:opacity-50" style={{ backgroundColor: brand, color: ctaFg }} whileTap={{ scale: isFormValid && !isSubmitting ? 0.95 : 1 }} onClick={handleAgendar} disabled={!isFormValid || isSubmitting}>
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Confirmar Agendamento"}
          </MotionButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}