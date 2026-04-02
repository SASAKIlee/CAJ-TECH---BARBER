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
  }, [defaultBarbeiroId, open]);

  // ==========================================================
  // 🛡️ LÓGICA DE COMPARAÇÃO MANUAL (IMUNE A FUSO HORÁRIO)
  // ==========================================================
  const { isHoje, dataStr } = useMemo(() => {
    const agora = new Date();
    
    // Pegamos Dia, Mês e Ano de HOJE (Local Brasil)
    const hojeD = agora.getDate();
    const hojeM = agora.getMonth();
    const hojeA = agora.getFullYear();

    if (!data) return { isHoje: false, dataStr: "" };

    // Pegamos Dia, Mês e Ano da DATA CLICADA
    const selD = data.getDate();
    const selM = data.getMonth();
    const selA = data.getFullYear();

    // Comparamos só os números. Se for dia 02 e hoje é 01, isso dá FALSE.
    const checkHoje = hojeD === selD && hojeM === selM && hojeA === selA;
    
    // Montamos a string de texto puro "2026-04-01"
    const sStr = `${selA}-${String(selM + 1).padStart(2, '0')}-${String(selD).padStart(2, '0')}`;

    return { isHoje: checkHoje, dataStr: sStr };
  }, [data]);

  // Pegamos a hora do seu computador AGORA
  const agora = new Date();
  const horaAgora = agora.getHours();
  const minAgora = agora.getMinutes();

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
        <DialogHeader><DialogTitle className="text-xl font-bold">Novo Horário</DialogTitle></DialogHeader>
        
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-xs uppercase text-zinc-500 font-bold">Nome do Cliente</Label>
            <Input placeholder="Nome completo" value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} className="bg-[#1A1A1A] border-white/10" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase text-zinc-500 font-bold">WhatsApp</Label>
            <Input placeholder="17999998888" value={telefoneCliente} onChange={(e) => setTelefoneCliente(e.target.value)} className="bg-[#1A1A1A] border-white/10" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-zinc-500 font-bold">Barbeiro</Label>
              <Select value={barbeiroId} onValueChange={(v) => { setBarbeiroId(v); setHorario(""); }}>
                <SelectTrigger className="bg-[#1A1A1A] border-white/10"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                  {barbeiros.map((b: any) => (<SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>))}
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
                    onSelect={(d) => { 
                      if (d) {
                        // Forçamos o meio-dia para garantir que o fuso não mude o dia
                        d.setHours(12, 0, 0, 0);
                        setData(d); 
                        setHorario(""); 
                      }
                    }}
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
              <SelectTrigger className="bg-[#1A1A1A] border-white/10"><SelectValue placeholder="Serviço" /></SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                {servicos.map((s: any) => (<SelectItem key={s.id} value={s.id}>{s.nome} - R${s.preco}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          {/* GRID DE HORÁRIOS - O CORAÇÃO DO BUG ESTAVA AQUI */}
          {dataStr && barbeiroId && (
            <div className="space-y-2">
              <Label className="text-xs uppercase text-zinc-500 font-bold">Horários Disponíveis</Label>
              <div className="grid grid-cols-4 gap-2">
                {HORARIOS.map((h) => {
                  const ocupadoNoBanco = ocupados.includes(h);
                  const [hPart, mPart] = h.split(":").map(Number);
                  
                  // TRAVA REAL: Só bloqueia se isHoje for VERDADEIRO (mesmo dia, mês e ano)
                  const isPassado = isHoje && (hPart < horaAgora || (hPart === horaAgora && mPart <= minAgora));
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