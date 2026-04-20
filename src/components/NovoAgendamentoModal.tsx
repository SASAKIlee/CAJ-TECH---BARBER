import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { agendamentoSchema } from "@/lib/schemas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import DOMPurify from "dompurify";

const MotionButton = motion.create(Button);

// ==========================================
// TIPAGENS
// ==========================================
interface Barbeiro {
  id: string;
  nome: string;
  ativo?: boolean;
}

interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao_minutos: number;
}

interface NovoAgendamentoModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  barbeiros: Barbeiro[];
  servicos: Servico[];
  onNovoAgendamento: (agendamento: Partial<any>) => Promise<{ error?: any }>;
  barbeiroSelecionadoId: string;
  horariosOcupados: (data: string, barbeiroId: string) => string[];
  horarios: string[];
  hojeLocal: string;
  horaAtual: number;
  minAtual: number;
  brand: string;
  ctaFg: string;
}

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================
function getHojeLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

// ==========================================
// COMPONENTE
// ==========================================
export function NovoAgendamentoModal({
  open,
  setOpen,
  barbeiros,
  servicos,
  onNovoAgendamento,
  barbeiroSelecionadoId,
  horariosOcupados,
  horarios,
  hojeLocal,
  horaAtual,
  minAtual,
  brand,
  ctaFg,
}: NovoAgendamentoModalProps) {
  const [novo, setNovo] = useState({
    nome: "",
    telefone: "",
    servicoId: "",
    barbeiroId: barbeiroSelecionadoId || "",
    data: getHojeLocal(),
    horario: "",
    observacao: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resetar formulário ao abrir
  useEffect(() => {
    if (open) {
      setNovo({
        nome: "",
        telefone: "",
        servicoId: "",
        barbeiroId: barbeiroSelecionadoId || "",
        data: getHojeLocal(),
        horario: "",
        observacao: "",
      });
      setIsSubmitting(false);
    }
  }, [open, barbeiroSelecionadoId]);

  const slotsOcupados = useMemo(() => {
    if (!novo.data || !novo.barbeiroId) return [];
    return horariosOcupados(novo.data, novo.barbeiroId);
  }, [novo.data, novo.barbeiroId, horariosOcupados]);

  const handleTelefoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = aplicarMascaraTelefone(e.target.value);
    setNovo((prev) => ({ ...prev, telefone: valor }));
  }, []);

  const isFormValid = useMemo(() => {
    return (
      novo.nome.trim().length > 0 &&
      validarTelefone(novo.telefone) &&
      novo.servicoId !== "" &&
      novo.barbeiroId !== "" &&
      novo.data !== "" &&
      novo.horario !== ""
    );
  }, [novo]);

  const handleAgendar = useCallback(async () => {
    // Validação local adicional (Zod fará a validação completa depois)
    if (!isFormValid) {
      toast.error("Preencha todos os campos corretamente.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Processando...");
    
    // Remove máscara do telefone para validação e envio
    const telefoneLimpo = novo.telefone.replace(/\D/g, "");
    const payload = { ...novo, telefone: telefoneLimpo };
    
    const validacao = agendamentoSchema.safeParse(payload);
    if (!validacao.success) {
      toast.dismiss(toastId);
      toast.error(validacao.error.errors[0].message);
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await onNovoAgendamento({
        nome_cliente: validacao.data.nome,
        telefone_cliente: validacao.data.telefone,
        servico_id: validacao.data.servicoId,
        barbeiro_id: validacao.data.barbeiroId,
        data: validacao.data.data,
        horario: validacao.data.horario,
        observacao: DOMPurify.sanitize(novo.observacao),
      });

      toast.dismiss(toastId);
      if (!res?.error) {
        setOpen(false);
        toast.success("Agendado com sucesso! ✂️");
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.dismiss(toastId);
      toast.error("Erro crítico de comunicação.");
    } finally {
      setIsSubmitting(false);
    }
  }, [novo, isFormValid, onNovoAgendamento, setOpen]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <MotionButton
          className="rounded-[20px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] gap-2 h-14 px-8 font-black uppercase text-xs border-0"
          style={{ backgroundColor: brand, color: ctaFg }}
          whileTap={{ scale: 0.95 }}
        >
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
            <Input
              placeholder="Nome Completo"
              className="rounded-xl border-white/[0.08] bg-black/35 h-14 text-base backdrop-blur-sm"
              value={novo.nome}
              onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">WhatsApp</label>
            <Input
              type="tel"
              placeholder="(11) 99999-9999"
              maxLength={15}
              className="rounded-xl border-white/[0.08] bg-black/35 h-14 text-base backdrop-blur-sm"
              value={novo.telefone}
              onChange={handleTelefoneChange}
            />
            {novo.telefone && !validarTelefone(novo.telefone) && (
              <p className="text-red-400 text-[10px] mt-1 ml-2">Telefone inválido (mín. 10 dígitos).</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Barbeiro</label>
              <Select
                value={novo.barbeiroId}
                onValueChange={(v) => setNovo({ ...novo, barbeiroId: v, horario: "" })}
              >
                <SelectTrigger className="rounded-xl border-white/[0.08] bg-black/35 h-14 text-base backdrop-blur-sm">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white rounded-xl">
                  {barbeiros.filter((b) => b.ativo).map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Serviço</label>
              <Select value={novo.servicoId} onValueChange={(v) => setNovo({ ...novo, servicoId: v })}>
                <SelectTrigger className="rounded-xl border-white/[0.08] bg-black/35 h-14 text-base backdrop-blur-sm">
                  <SelectValue placeholder="Serviço" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white rounded-xl">
                  {servicos.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Data</label>
            <Input
              type="date"
              min={hojeLocal}
              className="rounded-xl border-white/[0.08] bg-black/35 h-14 text-base color-scheme-dark backdrop-blur-sm"
              value={novo.data}
              onChange={(e) => setNovo({ ...novo, data: e.target.value, horario: "" })}
            />
          </div>

          <div className="space-y-2 border-t border-white/[0.08] pt-4 mt-2">
            <label className="text-[10px] font-black text-zinc-500 tracking-widest ml-1 uppercase">
              Horários Disponíveis
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
              {horarios.map((h) => {
                const [hH, mH] = h.split(":").map(Number);
                const isHoje = novo.data === hojeLocal;
                const busy = slotsOcupados.includes(h);
                const disable = !novo.barbeiroId || busy || (isHoje && (hH < horaAtual || (hH === horaAtual && mH <= minAtual)));

                return (
                  <MotionButton
                    key={h}
                    type="button"
                    variant={novo.horario === h ? "default" : "outline"}
                    disabled={disable}
                    whileTap={!disable ? { scale: 0.95 } : undefined}
                    onClick={() => setNovo({ ...novo, horario: h })}
                    className={cn(
                      "text-[12px] font-bold h-12 rounded-xl transition-colors",
                      novo.horario === h ? "border-0 shadow-lg" : "text-white bg-black/30 border-white/[0.08]",
                      disable && "opacity-20 cursor-not-allowed"
                    )}
                    style={novo.horario === h ? { backgroundColor: brand, color: ctaFg } : undefined}
                  >
                    {h}
                  </MotionButton>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Recado para o barbeiro (opcional)</label>
            <Textarea
              placeholder="Ex: Quero igual da foto..."
              className="bg-white/5 border-white/10 text-white rounded-xl min-h-[80px]"
              value={novo.observacao}
              onChange={(e) => setNovo({ ...novo, observacao: e.target.value })}
            />
          </div>

          <MotionButton
            className="w-full h-16 font-black uppercase text-sm rounded-2xl mt-4 border-0 shadow-xl disabled:opacity-50"
            style={{ backgroundColor: brand, color: ctaFg }}
            whileTap={{ scale: isFormValid && !isSubmitting ? 0.95 : 1 }}
            onClick={handleAgendar}
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Confirmar Agendamento"}
          </MotionButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}