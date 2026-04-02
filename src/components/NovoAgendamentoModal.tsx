import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const HORARIOS = Array.from({ length: 21 }, (_, i) => {
  const h = Math.floor(i / 2) + 9;
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

interface NovoAgendamentoProps {
  barbeiros: any[];
  servicos: any[];
  horariosOcupados: (data: string, barbeiroId: string) => string[];
  onSalvar: (ag: any) => void;
  defaultBarbeiroId?: string;
}

export function NovoAgendamentoModal({ barbeiros, servicos, horariosOcupados, onSalvar, defaultBarbeiroId }: NovoAgendamentoProps) {
  const [open, setOpen] = useState(false);
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");
  const [servicoId, setServicoId] = useState("");
  const [barbeiroId, setBarbeiroId] = useState(defaultBarbeiroId || "");
  const [data, setData] = useState<Date | undefined>(new Date());
  const [horario, setHorario] = useState("");

  useEffect(() => {
    if (defaultBarbeiroId) setBarbeiroId(defaultBarbeiroId);
  }, [defaultBarbeiroId, open]);

  // ==========================================================
  // 🛡️ LÓGICA BLINDADA CONTRA FUSO HORÁRIO
  // ==========================================================
  const { isHoje, dataStr } = useMemo(() => {
    const agora = new Date();
    
    // Pega "hoje" no formato 2026-04-01 baseado no relógio local, sem UTC
    const hojeLocal = agora.toLocaleDateString('sv-SE'); 

    if (!data) return { isHoje: false, dataStr: "" };

    // Pega a data selecionada também como string local 2026-04-02
    // Isso ignora se a data interna está em UTC ou 00:00
    const dataSelLocal = data.toLocaleDateString('sv-SE');

    return { 
      isHoje: hojeLocal === dataSelLocal, 
      dataStr: dataSelLocal 
    };
  }, [data]);

  const agora = new Date();
  const horaAtual = agora.getHours();
  const minAtual = agora.getMinutes();

  const ocupados = useMemo(
    () => (dataStr && barbeiroId ? horariosOcupados(dataStr, barbeiroId) : []),
    [dataStr, barbeiroId, horariosOcupados]
  );

  const canSave = nomeCliente.trim() && servicoId && barbeiroId && dataStr && horario;

  function handleSalvar() {
    if (!canSave) return;
    onSalvar({ 
      data: dataStr, 
      horario, 
      nomeCliente: nomeCliente.trim(), 
      telefoneCliente, 
      barbeiroId, 
      servicoId 
    });
    setOpen(false);
    setHorario("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2 font-semibold shadow-lg shadow-primary/25">
          <Plus className="h-5 w-5" />
          Novo Agendamento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-[#0A0A0A] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Novo Horário</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-xs uppercase text-zinc-500 font-bold tracking-widest">Nome do Cliente</Label>
            <Input 
              placeholder="Nome completo" 
              value={nomeCliente} 
              onChange={(e) => setNomeCliente(e.target.value)}
              className="bg-[#1A1A1A] border-white/10 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase text-zinc-500 font-bold tracking-widest">WhatsApp (DDD + Número)</Label>
            <Input 
              placeholder="Ex: 11999998888" 
              value={telefoneCliente} 
              onChange={(e) => setTelefoneCliente(e.target.value)}
              className="bg-[#1A1A1A] border-white/10"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase text-zinc-500 font-bold tracking-widest">Barbeiro Responsável</Label>
            <Select value={barbeiroId} onValueChange={(v) => { setBarbeiroId(v); setHorario(""); }}>
              <SelectTrigger className="bg-[#1A1A1A] border-white/10">
                <SelectValue placeholder="Selecione o profissional" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                {barbeiros.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase text-zinc-500 font-bold tracking-widest">Serviço</Label>
            <Select value={servicoId} onValueChange={setServicoId}>
              <SelectTrigger className="bg-[#1A1A1A] border-white/10">
                <SelectValue placeholder="Selecione o serviço" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                {servicos.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nome} - R$ {s.preco}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase text-zinc-500 font-bold tracking-widest">Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left bg-[#1A1A1A] border-white/10">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {data ? format(data, "dd/MM/yyyy") : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-[#0A0A0A] border-white/10">
                <Calendar
                  mode="single"
                  selected={data}
                  onSelect={(d) => { 
                    if (d) {
                      // Mata qualquer chance de fuso horário pulando o dia
                      const safeDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
                      setData(safeDate); 
                      setHorario(""); 
                    }
                  }}
                  locale={ptBR}
                  className="p-3"
                />
              </PopoverContent>
            </Popover>
          </div>

          {dataStr && barbeiroId && (
            <div className="space-y-3">
              <Label className="text-xs uppercase text-zinc-500 font-bold tracking-widest">Horários Disponíveis</Label>
              <div className="grid grid-cols-4 gap-2">
                {HORARIOS.map((h) => {
                  const ocupadoNoBanco = ocupados.includes(h);
                  const [hPart, mPart] = h.split(":").map(Number);
                  
                  // TRAVA REAL: Só bloqueia se a string da data for IGUAL a de hoje
                  const isPassado = isHoje && (hPart < horaAtual || (hPart === horaAtual && mPart <= minAtual));
                  const isBloqueado = ocupadoNoBanco || isPassado;

                  return (
                    <Button
                      key={h}
                      type="button"
                      size="sm"
                      variant={horario === h ? "default" : "outline"}
                      disabled={isBloqueado}
                      onClick={() => setHorario(h)}
                      className={cn(
                        "text-xs border-white/5", 
                        horario === h ? "bg-primary text-black font-bold" : "bg-[#1A1A1A]",
                        isBloqueado && "opacity-10 line-through cursor-not-allowed"
                      )}
                    >
                      {h}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <Button 
            className="w-full h-12 text-lg font-bold uppercase bg-primary text-black hover:bg-primary/90 mt-4 shadow-lg shadow-primary/20" 
            disabled={!canSave} 
            onClick={handleSalvar}
          >
            Confirmar Agendamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}