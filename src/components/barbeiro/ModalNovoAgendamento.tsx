import { useState, useMemo, useEffect } from "react";
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

const MotionButton = motion.create(Button);

// --- FUNÇÕES AUXILIARES ---
function getHojeLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function gerarHorariosDinamicos(abertura = "09:00", fechamento = "20:00"): string[] {
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
  onNovoAgendamento: (ag: any) => Promise<{ error?: any; success?: boolean }>;
  horariosOcupados: (data: string, bId: string) => string[];
  infoLoja: { abertura: string; fechamento: string };
}

export function ModalNovoAgendamento({
  open, onOpenChange, brand, ctaFg, barbeiros, servicos, barbeiroSelecionadoId,
  onNovoAgendamento, horariosOcupados, infoLoja
}: ModalNovoAgendamentoProps) {
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [novo, setNovo] = useState({ 
    nome: "", 
    telefone: "", 
    servicoId: "", 
    barbeiroId: "", 
    data: getHojeLocal(), 
    horario: "", 
    observacao: "" 
  });
  const [erros, setErros] = useState<any>({});

  // Reset do form ao abrir
  useEffect(() => {
    if (open) {
      setNovo({ 
        nome: "", 
        telefone: "", 
        servicoId: "", 
        barbeiroId: barbeiroSelecionadoId || "", 
        data: getHojeLocal(), 
        horario: "", 
        observacao: "" 
      });
      setErros({});
    }
  }, [open, barbeiroSelecionadoId]);

  const listaHorarios = useMemo(() => 
    gerarHorariosDinamicos(infoLoja.abertura, infoLoja.fechamento), 
  [infoLoja]);

  const { horaAgora, minAgora, hojeLocal } = useMemo(() => {
    const agora = new Date();
    return { horaAgora: agora.getHours(), minAgora: agora.getMinutes(), hojeLocal: getHojeLocal() };
  }, []);

  const ocupadosNoDia = useMemo(() => 
    (novo.data && novo.barbeiroId ? horariosOcupados(novo.data, novo.barbeiroId) : []), 
  [novo.data, novo.barbeiroId, horariosOcupados]);

  const formValido = novo.nome.trim().length >= 3 && 
                     validarTelefone(novo.telefone) && 
                     novo.servicoId !== "" && 
                     novo.barbeiroId !== "" && 
                     novo.horario !== "";

  const handleAgendar = async () => {
    const novosErros = { 
      nome: novo.nome.trim().length < 3, 
      telefone: !validarTelefone(novo.telefone), 
      servicoId: novo.servicoId === "", 
      barbeiroId: novo.barbeiroId === "", 
      horario: novo.horario === "" 
    };
    
    setErros(novosErros);
    if (Object.values(novosErros).some(v => v)) {
      toast.error("Corrija os campos em vermelho.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Confirmando agendamento...");

    try {
      // 🚀 Enviando os dados limpos como STRING para o banco
      const resultado = await onNovoAgendamento({
        nome_cliente: novo.nome.trim(),
        telefone_cliente: novo.telefone.replace(/\D/g, ""),
        servico_id: novo.servicoId,
        barbeiro_id: novo.barbeiroId,
        data: novo.data, // Texto "YYYY-MM-DD"
        horario: novo.horario, // Texto "HH:MM"
        status: "Pendente",
        observacao: DOMPurify.sanitize(novo.observacao)
      });

      toast.dismiss(toastId);
      
      if (resultado?.success) {
        toast.success("Agendamento realizado!");
        onOpenChange(false);
      } else {
        toast.error(resultado?.error || "Erro ao agendar.");
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error("Falha na conexão.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark border-white/[0.08] text-white w-[95vw] sm:max-w-md p-6 rounded-[2rem] max-h-[90vh] overflow-y-auto bg-zinc-950/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-white font-black uppercase italic text-2xl flex items-center gap-2">
            <Clock style={{ color: brand }} /> Novo Horário
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-4">
          {/* Nome */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Cliente</label>
            <Input 
              placeholder="Nome do Cliente" 
              className={cn("rounded-xl border-white/[0.08] bg-black/35 h-14", erros.nome && "border-red-500")} 
              value={novo.nome} 
              onChange={(e) => setNovo({ ...novo, nome: e.target.value })} 
            />
          </div>

          {/* WhatsApp */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">WhatsApp</label>
            <Input 
              type="tel" 
              placeholder="(00) 00000-0000" 
              className={cn("rounded-xl border-white/[0.08] bg-black/35 h-14", erros.telefone && "border-red-500")} 
              value={novo.telefone} 
              onChange={(e) => setNovo({ ...novo, telefone: aplicarMascaraTelefone(e.target.value) })} 
            />
          </div>

          {/* Barbeiro e Serviço */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Barbeiro</label>
              <Select value={novo.barbeiroId} onValueChange={(v) => setNovo({ ...novo, barbeiroId: v, horario: "" })}>
                <SelectTrigger className={cn("rounded-xl border-white/[0.08] bg-black/35 h-14", erros.barbeiroId && "border-red-500")}>
                  <SelectValue placeholder="Quem?" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white rounded-xl">
                  {barbeiros.filter(b => b.ativo).map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Serviço</label>
              <Select value={novo.servicoId} onValueChange={(v) => setNovo({ ...novo, servicoId: v })}>
                <SelectTrigger className={cn("rounded-xl border-white/[0.08] bg-black/35 h-14", erros.servicoId && "border-red-500")}>
                  <SelectValue placeholder="O quê?" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white rounded-xl">
                  {servicos.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Data</label>
            <Input 
              type="date" 
              className="rounded-xl border-white/[0.08] bg-black/35 h-14" 
              value={novo.data} 
              onChange={(e) => setNovo({ ...novo, data: e.target.value, horario: "" })} 
              style={{ colorScheme: 'dark' }} 
            />
          </div>

          {/* Horários */}
          <div className="space-y-2 border-t border-white/[0.08] pt-4">
            <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Horário</label>
            <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
              {listaHorarios.map((h) => {
                const [hH, mM] = h.split(":").map(Number);
                const isHoje = novo.data === hojeLocal;
                const indisponivel = !novo.barbeiroId || 
                                   ocupadosNoDia.includes(h) || 
                                   (isHoje && (hH < horaAgora || (hH === horaAgora && mM <= minAgora)));
                
                return (
                  <MotionButton 
                    key={h} 
                    type="button" 
                    disabled={indisponivel}
                    onClick={() => setNovo({ ...novo, horario: h })}
                    className={cn(
                      "text-[11px] font-bold h-11 rounded-xl transition-all",
                      novo.horario === h 
                        ? "border-0 shadow-lg" 
                        : "text-white bg-black/30 border-white/[0.08]"
                    )}
                    style={novo.horario === h ? { backgroundColor: brand, color: ctaFg } : {}}
                  >
                    {h}
                  </MotionButton>
                );
              })}
            </div>
          </div>

          {/* Observação */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Recado (opcional)</label>
            <Textarea 
              placeholder="Ex: Vou chegar 5 min atrasado..." 
              className="bg-white/5 border-white/10 text-white rounded-xl min-h-[70px]" 
              value={novo.observacao} 
              onChange={(e) => setNovo({ ...novo, observacao: e.target.value })} 
            />
          </div>

          {/* Botão Finalizar */}
          <MotionButton 
            className="w-full h-16 font-black uppercase text-sm rounded-2xl mt-4 border-0 shadow-xl" 
            style={{ backgroundColor: brand, color: ctaFg }}
            whileTap={formValido ? { scale: 0.96 } : {}}
            onClick={handleAgendar}
            disabled={!formValido || isSubmitting}
          >
            {isSubmitting ? <Loader2 className="animate-spin h-6 w-6" /> : "Confirmar Agendamento"}
          </MotionButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}