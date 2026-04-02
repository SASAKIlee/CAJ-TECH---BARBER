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

const getHojeLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function VisaoBarbeiro({ 
  barbeiros, servicos, agendamentosBarbeiroHoje, onNovoAgendamento, onFinalizar, onCancelar, barbeiroSelecionadoId, setBarbeiroSelecionadoId, horariosOcupados, servicos_find 
}: any) {
  const [open, setOpen] = useState(false);
  const [novo, setNovo] = useState({ 
    nome: "", 
    telefone: "", 
    servicoId: "", 
    barbeiroId: barbeiroSelecionadoId || "", 
    data: getHojeLocal(), 
    horario: "" 
  });

  useEffect(() => {
    if (open) setNovo(prev => ({ ...prev, barbeiroId: barbeiroSelecionadoId }));
  }, [open, barbeiroSelecionadoId]);

  const horarios = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

  const { horaAtual, minAtual, hojeLocal } = useMemo(() => {
    const agora = new Date();
    return { horaAtual: agora.getHours(), minAtual: agora.getMinutes(), hojeLocal: getHojeLocal() };
  }, [open]);

  const handleAgendar = async () => {
    const validacao = agendamentoSchema.safeParse({
      nome: novo.nome,
      telefone: novo.telefone,
      servicoId: novo.servicoId,
      barbeiroId: novo.barbeiroId,
      data: novo.data,
      horario: novo.horario
    });

    if (!validacao.success) return toast.error(validacao.error.errors[0].message);

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
      toast.success("Agendado! ✂️");
      setNovo({ nome: "", telefone: "", servicoId: "", barbeiroId: barbeiroSelecionadoId, data: getHojeLocal(), horario: "" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-white uppercase tracking-tight">Agenda</h2>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full shadow-lg gap-2 px-6 bg-primary text-black font-bold">
              <Plus className="h-5 w-5"/> Agendar
            </Button>
          </DialogTrigger>
          <DialogContent className="dark bg-[#121212] border-zinc-800 text-white max-w-[95vw] sm:max-w-md">
            <DialogHeader><DialogTitle className="text-white font-bold">Novo Horário</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              
              {/* NOME */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Nome do Cliente</label>
                <Input placeholder="Ex: João Silva" className="bg-zinc-900 text-white border-zinc-800 h-12" value={novo.nome} onChange={e => setNovo({...novo, nome: e.target.value})} />
              </div>

              {/* WHATSAPP */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">WhatsApp</label>
                <Input placeholder="1799..." className="bg-zinc-900 text-white border-zinc-800 h-12" value={novo.telefone} onChange={e => setNovo({...novo, telefone: e.target.value})} />
              </div>

              {/* BARBEIRO (VOLTOU!) */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Barbeiro Responsável</label>
                <Select value={novo.barbeiroId} onValueChange={v => setNovo({...novo, barbeiroId: v, horario: ""})}>
                  <SelectTrigger className="bg-zinc-900 text-white border-zinc-800 h-12">
                    <SelectValue placeholder="Selecione o Barbeiro"/>
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    {barbeiros.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* SERVIÇO (VOLTOU!) */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Serviço</label>
                <Select value={novo.servicoId} onValueChange={v => setNovo({...novo, servicoId: v})}>
                  <SelectTrigger className="bg-zinc-900 text-white border-zinc-800 h-12">
                    <SelectValue placeholder="O que vai fazer?"/>
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    {servicos.map((s:any) => <SelectItem key={s.id} value={s.id}>{s.nome} - R$ {s.preco}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* DATA */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Data</label>
                <Input type="date" className="bg-zinc-900 text-white border-zinc-800 h-12 color-scheme-dark" value={novo.data} onChange={e => setNovo({...novo, data: e.target.value, horario: ""})} />
              </div>
              
              {/* HORÁRIOS */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Horários Disponíveis</label>
                <div className="grid grid-cols-4 gap-2">
                  {horarios.map(h => {
                    const [hH, mH] = h.split(":").map(Number);
                    const isHoje = novo.data === hojeLocal;
                    const passes = isHoje && (hH < horaAtual || (hH === horaAtual && mH <= minAtual));
                    const busy = horariosOcupados(novo.data, novo.barbeiroId).includes(h);
                    const disable = !novo.barbeiroId || busy || passes;

                    return (
                      <Button key={h} variant={novo.horario === h ? "default" : "outline"} disabled={disable} onClick={() => setNovo({...novo, horario: h})}
                        className={`text-[10px] font-bold h-10 ${novo.horario === h ? 'bg-primary text-black' : 'text-white border-zinc-800'} ${disable ? 'opacity-10' : ''}`}>
                        {h}
                      </Button>
                    )
                  })}
                </div>
              </div>

              <Button className="w-full h-14 bg-primary text-black font-black uppercase rounded-xl" onClick={handleAgendar}>
                CONFIRMAR AGENDAMENTO
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {agendamentosBarbeiroHoje.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/30 rounded-[2rem] border-2 border-dashed border-zinc-800/50">
            <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Agenda vazia para este dia</p>
          </div>
        ) : (
          agendamentosBarbeiroHoje.map((ag: any) => (
            <Card key={ag.id} className={`p-5 border-l-[6px] transition-all ${
              ag.status === "Finalizado" ? "border-l-green-500/50 opacity-30" : 
              ag.status === "Cancelado" ? "border-l-red-500/50 opacity-30" : 
              "border-l-primary bg-[#161616] border-zinc-800"
            }`}>
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-black text-white tracking-tighter">{ag.horario}</span>
                    <Badge className="bg-zinc-800 text-zinc-400 border-none text-[8px]">{ag.status.toUpperCase()}</Badge>
                  </div>
                  <p className="font-bold text-lg text-white uppercase">{ag.nome_cliente}</p>
                  <p className="text-xs font-black text-primary uppercase">{servicos_find(ag.servico_id)?.nome}</p>
                </div>
                
                {ag.status === "Pendente" && (
                  <div className="flex gap-2">
                    <Button size="icon" className="text-green-500 bg-green-500/10 hover:bg-green-500 hover:text-black" onClick={() => {
                        const s = servicos_find(ag.servico_id);
                        const n = ag.telefone_cliente?.replace(/\D/g, "");
                        const msg = `Olá ${ag.nome_cliente}! Confirmamos seu horário na *CAJ TECH* ✂️\n\n📅 *Data:* ${ag.data}\n⏰ *Horário:* ${ag.horario}\n✨ *Serviço:* ${s?.nome}`;
                        window.open(`https://api.whatsapp.com/send?phone=55${n}&text=${encodeURIComponent(msg)}`, "_blank");
                    }}><MessageCircle/></Button>
                    <Button size="icon" className="text-primary bg-primary/10 hover:bg-primary hover:text-black" onClick={() => onFinalizar(ag.id)}><Check/></Button>
                    <Button size="icon" variant="ghost" className="text-zinc-600 hover:text-red-500" onClick={() => onCancelar(ag.id)}><X/></Button>
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