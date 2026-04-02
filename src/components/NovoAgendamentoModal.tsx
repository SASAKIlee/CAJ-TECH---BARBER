import { useState, useMemo, useEffect } from "react";
import { format, isSameDay } from "date-fns";
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

interface Props {
  barbeiros: any[];
  servicos: any[];
  horariosOcupados: (data: string, barbeiroId: string) => string[];
  onSalvar: (ag: any) => void;
  defaultBarbeiroId?: string;
}

export function NovoAgendamentoModal({ barbeiros, servicos, horariosOcupados, onSalvar, defaultBarbeiroId }: Props) {
  const [open, setOpen] = useState(false);
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");
  const [servicoId, setServicoId] = useState("");
  const [barbeiroId, setBarbeiroId] = useState(defaultBarbeiroId || "");
  const [data, setData] = useState<Date | undefined>(new Date());
  const [horario, setHorario] = useState("");

  useEffect(() => {
    if (defaultBarbeiroId) setBarbeiroId(defaultBarbeiroId);
  }, [defaultBarbeiroId]);

  // --- SOLUÇÃO PARA O FUSO HORÁRIO ---
  // Criamos a string de data (yyyy-MM-dd) de forma manual e local para não ter erro
  const dataStr = useMemo(() => {
    if (!data) return "";
    const y = data.getFullYear();
    const m = String(data.getMonth() + 1).padStart(2, '0');
    const d = String(data.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [data]);

  // Verifica se a data selecionada é HOJE (usando a função segura do date-fns)
  const agora = new Date();
  const isHoje = data ? isSameDay(data, agora) : false;
  
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
    
    setNomeCliente("");
    setTelefoneCliente("");
    setServicoId("");
    setHorario("");
    setOpen(false);
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
            <Label className="text-xs uppercase text-muted-foreground font-bold">Nome do Cliente</Label>
            <Input 
              placeholder="Nome completo" 
              value={nomeCliente} 
              onChange={(e) => setNomeCliente(e.target.value)}
              className="bg-[#1A1A1A] border-white/10 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground font-bold">WhatsApp</Label>
            <Input 
              placeholder="Ex: 17999998888" 
              value={telefoneCliente} 
              onChange={(e) => setTelefoneCliente(e.target.value)}
              className="bg-[#1A1A1A] border-white/10"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground font-bold">Barbeiro Responsável</Label>
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
            <Label className="text-xs uppercase text-muted-foreground font-bold">Serviço</Label>
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
            <Label className="text-xs uppercase text-muted-foreground font-bold">Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal bg-[#1A1A1A] border-white/10">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {data ? format(data, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-[#0A0A0A] border-white/10">
                <Calendar
                  mode="single"
                  selected={data}
                  onSelect={(d) => { setData(d); setHorario(""); }}
                  locale={ptBR}
                  className="p-3"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* HORÁRIOS - LÓGICA DE TRAVA CORRIGIDA */}
          {dataStr && barbeiroId && (
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground font-bold">Horários Disponíveis</Label>
              <div className="grid grid-cols-4 gap-2">
                {HORARIOS.map((h) => {
                  const ocupadoNoBanco = ocupados.includes(h);
                  const [horaH, minH] = h.split(":").map(Number);
                  
                  // Só trava se for HOJE e o horário já passou. 
                  // Se isHoje for falso (amanhã), isPassado será sempre falso.
                  const isPassado = isHoje && (horaH < horaAtual || (horaH === horaAtual && minH <= minAtual));
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
                        "text-xs transition-all border-white/5", 
                        horario === h ? "bg-primary text-primary-foreground" : "bg-[#1A1A1A]",
                        isBloqueado && "opacity-20 line-through cursor-not-allowed"
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
            className="w-full h-12 text-lg font-bold uppercase bg-primary hover:bg-primary/90 text-primary-foreground mt-4" 
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