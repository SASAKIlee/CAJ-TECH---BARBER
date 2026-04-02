import { useState, useEffect, useMemo } from "react";
import { Plus, Check, X, MessageCircle, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { agendamentoSchema } from "@/lib/schemas";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Função auxiliar para data local YYYY-MM-DD
const getHojeLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function VisaoBarbeiro({ 
  barbeiros, servicos, agendamentosBarbeiroHoje, onNovoAgendamento, onFinalizar, onCancelar, barbeiroSelecionadoId, setBarbeiroSelecionadoId, horariosOcupados, servicos_find 
}: any) {
  const [open, setOpen] = useState(false);
  
  // Estado inicial usando a data local blindada
  const [novo, setNovo] = useState({ 
    nome: "", 
    telefone: "", 
    servicoId: "", 
    barbeiroId: barbeiroSelecionadoId || "", 
    data: getHojeLocal(), 
    horario: "" 
  });

  useEffect(() => {
    if (open) {
      setNovo(prev => ({ ...prev, barbeiroId: barbeiroSelecionadoId }));
    }
  }, [open, barbeiroSelecionadoId]);

  const horarios = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

  // --- LÓGICA DE TRAVA DE HORÁRIO ---
  const { horaAtual, minAtual, hojeLocal } = useMemo(() => {
    const agora = new Date();
    return {
      horaAtual: agora.getHours(),
      minAtual: agora.getMinutes(),
      hojeLocal: getHojeLocal()
    };
  }, [open]); // Recalcula quando abre o modal

  const handleAgendar = async () => {
    const validacao = agendamentoSchema.safeParse({
      nome: novo.nome,
      telefone: novo.telefone,
      servicoId: novo.servicoId,
      barbeiroId: novo.barbeiroId,
      data: novo.data,
      horario: novo.horario
    });

    if (!validacao.success) {
      return toast.error(validacao.error.errors[0].message);
    }

    const res = await onNovoAgendamento({
      nomeCliente: validacao.data.nome,
      telefoneCliente: validacao.data.telefone,
      servicoId: validacao.data.servicoId,
      barbeiroId: validacao.data.barbeiroId, 
      data: validacao.data.data,
      horario: validacao.data.horario
    });

    if (!res?.error) {
      setOpen(false);
      toast.success("Agendamento criado! ✂️");
      setNovo({ 
        nome: "", 
        telefone: "", 
        servicoId: "", 
        barbeiroId: barbeiroSelecionadoId, 
        data: getHojeLocal(), 
        horario: "" 
      });
    }
  };

  const enviarWhats = (ag: any) => {
    const s = servicos_find(ag.servico_id);
    const numeroLimpo = ag.telefone_cliente?.replace(/\D/g, "");
    const mensagem = `Olá ${ag.nome_cliente}! Confirmamos seu horário na *CAJ TECH* ✂️\n\n📅 *Data:* ${ag.data}\n⏰ *Horário:* ${ag.horario}\n✨ *Serviço:* ${s?.nome}\n\nPodemos confirmar?`;
    window.open(`https://api.whatsapp.com/send?phone=55${numeroLimpo}&text=${encodeURIComponent(mensagem)}`, "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-extrabold text-white uppercase">Agenda</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full shadow-lg gap-2 px-6 bg-primary text-black font-bold">
              <Plus className="h-5 w-5"/> Agendar
            </Button>
          </DialogTrigger>
          <DialogContent className="dark bg-[#121212] border-zinc-800 max-w-[95vw] sm:max-w-md">
            <DialogHeader><DialogTitle className="text-2xl font-bold">Novo Horário</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <Input placeholder="Nome do Cliente" className="bg-zinc-900 h-12" value={novo.nome} onChange={e => setNovo({...novo, nome: e.target.value})} />
              <Input placeholder="WhatsApp" className="bg-zinc-900 h-12" value={novo.telefone} onChange={e => setNovo({...novo, telefone: e.target.value})} />
              
              <Select value={novo.barbeiroId} onValueChange={v => setNovo({...novo, barbeiroId: v, horario: ""})}>
                <SelectTrigger className="bg-zinc-900 h-12"><SelectValue placeholder="Barbeiro"/></SelectTrigger>
                <SelectContent>{barbeiros.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}</SelectContent>
              </Select>

              <Select onValueChange={v => setNovo({...novo, servicoId: v})}>
                <SelectTrigger className="bg-zinc-900 h-12"><SelectValue placeholder="Serviço"/></SelectTrigger>
                <SelectContent>{servicos.map((s:any) => <SelectItem key={s.id} value={s.id}>{s.nome} - R$ {s.preco}</SelectItem>)}</SelectContent>
              </Select>

              <Input type="date" className="bg-zinc-900 h-12" value={novo.data} onChange={e => setNovo({...novo, data: e.target.value, horario: ""})} />

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase">Horários</label>
                <div className="grid grid-cols-4 gap-2">
                  {horarios.map(h => {
                    const [horaH, minutoH] = h.split(":").map(Number);
                    
                    // TRAVA CORRIGIDA: Usa hojeLocal (string) para comparar com novo.data (string)
                    const isHoje = novo.data === hojeLocal;
                    const horarioPassou = isHoje && (horaH < horaAtual || (horaH === horaAtual && minutoH <= minAtual));
                    const ocupado = horariosOcupados(novo.data, novo.barbeiroId).includes(h);
                    
                    const desabilitado = !novo.barbeiroId || ocupado || horarioPassou;

                    return (
                      <Button 
                        key={h} 
                        variant={novo.horario === h ? "default" : "outline"} 
                        disabled={desabilitado} 
                        onClick={() => setNovo({...novo, horario: h})} 
                        className={`text-xs font-bold h-10 ${novo.horario === h ? 'bg-primary text-black' : 'border-zinc-800 text-zinc-400'} ${desabilitado ? 'opacity-10 grayscale' : ''}`}
                      >
                        {h}
                      </Button>
                    )
                  })}
                </div>
              </div>

              <Button className="w-full h-14 font-black bg-primary text-black mt-4" onClick={handleAgendar}>
                CONFIRMAR AGENDAMENTO
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {agendamentosBarbeiroHoje.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/30 rounded-[2rem] border-2 border-dashed border-zinc-800/50">
            <p className="text-zinc-600 font-bold uppercase text-xs">Agenda vazia</p>
          </div>
        ) : (
          agendamentosBarbeiroHoje.map((ag: any) => (
            <Card key={ag.id} className={`p-5 border-l-[6px] ${ag.status === "Finalizado" ? "border-l-green-500/50 opacity-40" : ag.status === "Cancelado" ? "border-l-red-500/50 opacity-40" : "border-l-primary bg-[#161616]"}`}>
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-black text-white">{ag.horario}</span>
                    <Badge className="bg-zinc-800 text-zinc-400 border-none text-[8px]">{ag.status.toUpperCase()}</Badge>
                  </div>
                  <p className="font-bold text-lg text-zinc-200 uppercase">{ag.nome_cliente}</p>
                  <p className="text-xs font-black text-primary/80 uppercase">{servicos_find(ag.servico_id)?.nome}</p>
                </div>
                {ag.status === "Pendente" && (
                  <div className="flex gap-2">
                    <Button size="icon" className="text-green-500 bg-green-500/10" onClick={() => enviarWhats(ag)}><MessageCircle/></Button>
                    <Button size="icon" className="text-primary bg-primary/10" onClick={() => onFinalizar(ag.id)}><Check/></Button>
                    <Button size="icon" variant="ghost" onClick={() => onCancelar(ag.id)}><X/></Button>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}