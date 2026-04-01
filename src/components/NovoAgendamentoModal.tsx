import { useState, useMemo } from "react";
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

interface BarbeiroView {
  id: string;
  nome: string;
  comissao_pct: number;
}

interface ServicoView {
  id: string;
  nome: string;
  preco: number;
}

interface Props {
  barbeiros: BarbeiroView[];
  servicos: ServicoView[];
  horariosOcupados: (data: string, barbeiroId: string) => string[];
  onSalvar: (ag: { data: string; horario: string; nomeCliente: string; barbeiroId: string; servicoId: string }) => void;
}

export function NovoAgendamentoModal({ barbeiros, servicos, horariosOcupados, onSalvar }: Props) {
  const [open, setOpen] = useState(false);
  const [nomeCliente, setNomeCliente] = useState("");
  const [servicoId, setServicoId] = useState("");
  const [barbeiroId, setBarbeiroId] = useState("");
  const [data, setData] = useState<Date | undefined>(new Date());
  const [horario, setHorario] = useState("");

  const dataStr = data ? format(data, "yyyy-MM-dd") : "";

  const ocupados = useMemo(
    () => (dataStr && barbeiroId ? horariosOcupados(dataStr, barbeiroId) : []),
    [dataStr, barbeiroId, horariosOcupados]
  );

  const canSave = nomeCliente.trim() && servicoId && barbeiroId && dataStr && horario;

  function handleSalvar() {
    if (!canSave) return;
    onSalvar({ data: dataStr, horario, nomeCliente: nomeCliente.trim(), barbeiroId, servicoId });
    setNomeCliente("");
    setServicoId("");
    setBarbeiroId("");
    setHorario("");
    setData(new Date());
    setOpen(false);
  }

  // Lógica inteligente de tempo atual (Upgrade do CTO)
  const agora = new Date();
  const hojeStr = format(agora, "yyyy-MM-dd");
  const isHoje = dataStr === hojeStr;
  const horaAtual = agora.getHours();
  const minAtual = agora.getMinutes();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2 font-semibold shadow-lg shadow-primary/25">
          <Plus className="h-5 w-5" />
          Novo Agendamento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Agendamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Nome do Cliente</Label>
            <Input placeholder="Nome completo" value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Serviço</Label>
            <Select value={servicoId} onValueChange={setServicoId}>
              <SelectTrigger><SelectValue placeholder="Selecione o serviço" /></SelectTrigger>
              <SelectContent>
                {servicos.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome} — R$ {s.preco.toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Barbeiro</Label>
            <Select value={barbeiroId} onValueChange={(v) => { setBarbeiroId(v); setHorario(""); }}>
              <SelectTrigger><SelectValue placeholder="Selecione o barbeiro" /></SelectTrigger>
              <SelectContent>
                {barbeiros.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.nome} ({b.comissao_pct}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !data && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {data ? format(data, "dd 'de' MMMM, yyyy", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={data}
                  onSelect={(d) => { setData(d); setHorario(""); }}
                  locale={ptBR}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {dataStr && barbeiroId && (
            <div className="space-y-2">
              <Label>Horário</Label>
              <div className="grid grid-cols-4 gap-2">
                {HORARIOS.map((h) => {
                  // Trava 1: Já está agendado no banco de dados?
                  const ocupadoNoBanco = ocupados.includes(h);
                  
                  // Trava 2: O horário já passou hoje?
                  const [horaH, minH] = h.split(":");
                  const isPassado = isHoje && 
                    (parseInt(horaH) < horaAtual || (parseInt(horaH) === horaAtual && parseInt(minH) <= minAtual));
                  
                  // Se cair em qualquer uma das travas, bloqueia!
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
                        "text-xs transition-all", 
                        isBloqueado && "opacity-30 line-through bg-muted cursor-not-allowed"
                      )}
                    >
                      {h}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <Button className="w-full font-semibold" disabled={!canSave} onClick={handleSalvar}>
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}