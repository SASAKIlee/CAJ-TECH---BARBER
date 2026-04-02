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

// Horários de 30 em 30 min (conforme seu código original)
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

interface NovoAgendamentoProps {
  barbeiros: BarbeiroView[];
  servicos: ServicoView[];
  horariosOcupados: (data: string, barbeiroId: string) => string[];
  onSalvar: (ag: { 
    data: string; 
    horario: string; 
    nomeCliente: string; 
    telefoneCliente: string; 
    barbeiroId: string; 
    servicoId: string 
  }) => void;
  defaultBarbeiroId?: string;
}

export function NovoAgendamentoModal({ 
  barbeiros, 
  servicos, 
  horariosOcupados, 
  onSalvar, 
  defaultBarbeiroId 
}: NovoAgendamentoProps) {
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
  // 🛡️ LÓGICA DE DATA - A PROVA DE ERROS (LOCAL SÃO PAULO)
  // ==========================================================
  const { isHoje, dataStr } = useMemo(() => {
    // Pegamos a data atual do computador do usuário (S.J. Rio Preto)
    const agora = new Date();
    const hojeAno = agora.getFullYear();
    const hojeMes = agora.getMonth();
    const hojeDia = agora.getDate();

    if (!data) return { isHoje: false, dataStr: "" };

    // Pegamos a data selecionada no calendário
    const selAno = data.getFullYear();
    const selMes = data.getMonth();
    const selDia = data.getDate();

    // Compara apenas os números do calendário local
    const checkHoje = hojeAno === selAno && hojeMes === selMes && hojeDia === selDia;
    
    // Formata a string YYYY-MM-DD para o banco de dados
    const sStr = `${selAno}-${String(selMes + 1).padStart(2, '0')}-${String(selDia).padStart(2, '0')}`;

    return { isHoje: checkHoje, dataStr: sStr };
  }, [data]);

  // Hora e minuto atual para bloquear horários que já passaram HOJE
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
    
    // Limpeza
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
          {/* CAMPOS DE TEXTO */}
          <div className="space-y-2">
            <Label className="text-xs uppercase text-zinc-500 font-bold tracking-widest">Nome do Cliente</Label>
            <Input 
              placeholder="Nome completo" 
              value={nomeCliente} 
              onChange={(e) => setNomeCliente(e.target.value)}
              className="bg-[#1A1A1A] border-white/10"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase text-zinc-500 font-bold tracking-widest">WhatsApp (DDD + Número)</Label>
            <Input 
              placeholder="Ex: 17999998888" 
              value={telefoneCliente} 
              onChange={(e) => setTelefoneCliente(e.target.value)}
              className="bg-[#1A1A1A] border-white/10"
            />
          </div>

          {/* SELETORES */}
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

          {/* CALENDÁRIO */}
          <div className="space-y-2">
            <Label className="text-xs uppercase text-zinc-500 font-bold tracking-widest">Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left bg-[#1A1A1A] border-white/10">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {data ? format(data, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-[#0A0A0A] border-white/10" align="start">
                <Calendar
                  mode="single"
                  selected={data}
                  onSelect={(d) => { setData(d); setHorario(""); }}
                  locale={ptBR}
                  className="p-3"
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* GRID DE HORÁRIOS */}
          {dataStr && barbeiroId && (
            <div className="space-y-3">
              <Label className="text-xs uppercase text-zinc-500 font-bold tracking-widest">Horários Disponíveis</Label>
              <div className="grid grid-cols-4 gap-2">
                {HORARIOS.map((h) => {
                  const ocupadoNoBanco = ocupados.includes(h);
                  const [hPart, mPart] = h.split(":").map(Number);
                  
                  // TRAVA DEFINITIVA: 
                  // Só bloqueia por horário se a data selecionada for HOJE no calendário do usuário.
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
                        "text-xs transition-all border-white/5", 
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