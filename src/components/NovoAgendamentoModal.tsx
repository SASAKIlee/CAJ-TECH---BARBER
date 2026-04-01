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
  onSalvar: (ag: { data: string; horario: string; nomeCliente: string; telefoneCliente: string; barbeiroId: string; servicoId: string }) => void;
  defaultBarbeiroId?: string; // Adicionado para facilitar a vida do dono
}

export function NovoAgendamentoModal({ barbeiros, servicos, horariosOcupados, onSalvar, defaultBarbeiroId }: Props) {
  const [open, setOpen] = useState(false);
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState(""); // Campo que estava no seu print
  const [servicoId, setServicoId] = useState("");
  const [barbeiroId, setBarbeiroId] = useState(defaultBarbeiroId || "");
  const [data, setData] = useState<Date | undefined>(new Date());
  const [horario, setHorario] = useState("");

  // Sincroniza o barbeiro se o dono mudar o filtro lá fora
  useEffect(() => {
    if (defaultBarbeiroId) setBarbeiroId(defaultBarbeiroId);
  }, [defaultBarbeiroId]);

  const dataStr = data ? format(data, "yyyy-MM-dd") : "";

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
      telefoneCliente, // Enviando o telefone para o banco
      barbeiroId, 
      servicoId 
    });
    
    // Limpa o formulário
    setNomeCliente("");
    setTelefoneCliente("");
    setServicoId("");
    setHorario("");
    setOpen(false);
  }

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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-[#0A0A0A] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Novo Horário</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          {/* NOME DO CLIENTE */}
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground font-bold">Nome do Cliente</Label>
            <Input 
              placeholder="Nome completo" 
              value={nomeCliente} 
              onChange={(e) => setNomeCliente(e.target.value)}
              className="bg-[#1A1A1A] border-white/10 focus:ring-primary"
            />
          </div>

          {/* WHATSAPP */}
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground font-bold">WhatsApp (DDD + Número)</Label>
            <Input 
              placeholder="Ex: 11999998888" 
              value={telefoneCliente} 
              onChange={(e) => setTelefoneCliente(e.target.value)}
              className="bg-[#1A1A1A] border-white/10"
            />
          </div>

          {/* SELEÇÃO DE BARBEIRO (O que você precisava!) */}
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground font-bold">Barbeiro</Label>
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

          {/* SERVIÇO */}
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground font-bold">Serviço</Label>
            <Select value={servicoId} onValueChange={setServicoId}>
              <SelectTrigger className="bg-[#1A1A1A] border-white/10"><SelectValue placeholder="Selecione o que será feito" /></SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                {servicos.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nome} — R$ {s.preco.toFixed(2)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* DATA */}
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

          {/* HORÁRIOS */}
          {dataStr && barbeiroId && (
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground font-bold">Horários Disponíveis</Label>
              <div className="grid grid-cols-4 gap-2">
                {HORARIOS.map((h) => {
                  const ocupadoNoBanco = ocupados.includes(h);
                  const [horaH, minH] = h.split(":");
                  const isPassado = isHoje && (parseInt(horaH) < horaAtual || (parseInt(horaH) === horaAtual && parseInt(minH) <= minAtual));
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