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

export function NovoAgendamentoModal({ barbeiros, servicos, horariosOcupados, onSalvar, defaultBarbeiroId }: any) {
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

  // ==========================================================
  // 🛡️ LÓGICA ANTI-FUSO HORÁRIO (O SEGREDO ESTÁ AQUI)
  // ==========================================================
  
  const { isHoje, dataStr } = useMemo(() => {
    if (!data) return { isHoje: false, dataStr: "" };

    const agora = new Date();
    
    // Pegamos Ano, Mês e Dia puros do seu navegador
    const diaAtual = agora.getDate();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();

    const diaSel = data.getDate();
    const mesSel = data.getMonth();
    const anoSel = data.getFullYear();

    // Verificação manual e local de "É hoje?"
    const checkHoje = diaAtual === diaSel && mesAtual === mesSel && anoAtual === anoSel;
    
    // String formatada para o banco (YYYY-MM-DD) sem risco de fuso
    const dStr = `${anoSel}-${String(mesSel + 1).padStart(2, '0')}-${String(diaSel).padStart(2, '0')}`;

    return { isHoje: checkHoje, dataStr: dStr };
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
            <Label className="text-xs uppercase text-zinc-500 font-bold">Nome do Cliente</Label>
            <Input 
              placeholder="Nome do caboclo" 
              value={nomeCliente} 
              onChange={(e) => setNomeCliente(e.target.value)}
              className="bg-[#1A1A1A] border-white/10"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase text-zinc-500 font-bold">WhatsApp</Label>
            <Input 
              placeholder="DDD + Número" 
              value={telefoneCliente} 
              onChange={(e) => setTelefoneCliente(e.target.value)}
              className="bg-[#1A1A1A] border-white/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-zinc-500 font-bold">Barbeiro</Label>
              <Select value={barbeiroId} onValueChange={(v) => { setBarbeiroId(v); setHorario(""); }}>
                <SelectTrigger className="bg-[#1A1A1A] border-white/10">
                  <SelectValue placeholder="Profissional" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                  {barbeiros.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase text-zinc-500 font-bold">Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left bg-[#1A1A1A] border-white/10">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {data ? format(data, "dd/MM/yyyy") : "Data"}
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
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase text-zinc-500 font-bold">Serviço</Label>
            <Select value={servicoId} onValueChange={setServicoId}>
              <SelectTrigger className="bg-[#1A1A1A] border-white/10">
                <SelectValue placeholder="O que vai fazer?" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                {servicos.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{s.nome} - R${s.preco}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* GRID DE HORÁRIOS */}
          {dataStr && barbeiroId && (
            <div className="space-y-2">
              <Label className="text-xs uppercase text-zinc-500 font-bold">Horários</Label>
              <div className="grid grid-cols-4 gap-2">
                {HORARIOS.map((h) => {
                  const ocupadoNoBanco = ocupados.includes(h);
                  const [horaH, minH] = h.split(":").map(Number);
                  
                  // AQUI É A TRAVA: Só bloqueia se isHoje for VERDADEIRO.
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
                        "text-xs border-white/5", 
                        horario === h ? "bg-primary text-black" : "bg-[#1A1A1A]",
                        isBloqueado && "opacity-20 line-through"
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
            className="w-full h-12 text-lg font-bold uppercase bg-primary text-black hover:bg-primary/90 mt-4" 
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