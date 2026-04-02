import { useState, useEffect, useMemo } from "react";
import { Plus, Check, X, MessageCircle, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { agendamentoSchema } from "@/lib/schemas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function VisaoBarbeiro({ 
  barbeiros = [], 
  servicos = [], 
  agendamentos = [], // Recebe a lista filtrada do Index
  onNovoAgendamento, 
  onStatusChange, // Usando a função unificada que criamos no Index
  barbeiroSelecionadoId, 
  setBarbeiroSelecionadoId, 
  horariosOcupados, 
  servicos_find,
  isDono 
}: any) {
  const [open, setOpen] = useState(false);
  const [novo, setNovo] = useState({ 
    nome: "", 
    telefone: "", 
    servicoId: "", 
    barbeiroId: barbeiroSelecionadoId || "", 
    data: "", // Será preenchido pelo useEffect
    horario: "" 
  });

  // Função para pegar data local padrão do banco (YYYY-MM-DD)
  const getHojeLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (open) {
      setNovo(prev => ({ 
        ...prev, 
        barbeiroId: barbeiroSelecionadoId,
        data: getHojeLocal() 
      }));
    }
  }, [open, barbeiroSelecionadoId]);

  // 🕒 GERADOR DE SLOTS DE 30 MINUTOS
  const horarios = useMemo(() => {
    const slots = [];
    for (let h = 9; h <= 19; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
      if (h !== 12 && h !== 19) { // Remove 12:30 (almoço) e 19:30 (fechamento) se quiser
         slots.push(`${String(h).padStart(2, '0')}:30`);
      }
    }
    return slots;
  }, []);

  const { horaAtual, minAtual, hojeLocal } = useMemo(() => {
    const agora = new Date();
    return { 
      horaAtual: agora.getHours(), 
      minAtual: agora.getMinutes(), 
      hojeLocal: getHojeLocal() 
    };
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
      toast.success("Agendado com sucesso!");
      setNovo({ nome: "", telefone: "", servicoId: "", barbeiroId: barbeiroSelecionadoId, data: getHojeLocal(), horario: "" });
    }
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DA AGENDA */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-4">
        <div>
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Agenda</h2>
          {isDono && (
             <p className="text-[10px] font-bold text-primary uppercase">Visão do Administrador</p>
          )}
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full shadow-lg gap-2 h-12 px-8 bg-primary text-black font-black uppercase text-xs hover:scale-105 transition-transform">
              <Plus className="h-5 w-5 stroke-[3px]"/> Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent className="dark bg-[#0A0A0A] border-zinc-800 text-white max-w-[95vw] sm:max-w-md p-6">
            <DialogHeader>
              <DialogTitle className="text-white font-black uppercase italic text-xl">Novo Horário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Cliente</label>
                <Input placeholder="Nome completo" className="bg-zinc-900 border-zinc-800 h-12 focus:border-primary" value={novo.nome} onChange={e => setNovo({...novo, nome: e.target.value})} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">WhatsApp</label>
                <Input placeholder="Ex: 11999998888" className="bg-zinc-900 border-zinc-800 h-12" value={novo.telefone} onChange={e => setNovo({...novo, telefone: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Barbeiro</label>
                  <Select value={novo.barbeiroId} onValueChange={v => setNovo({...novo, barbeiroId: v, horario: ""})}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 h-12">
                      <SelectValue placeholder="Barbeiro"/>
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      {barbeiros.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Serviço</label>
                  <Select value={novo.servicoId} onValueChange={v => setNovo({...novo, servicoId: v})}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 h-12">
                      <SelectValue placeholder="Serviço"/>
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      {servicos.map((s:any) => <SelectItem key={s.id} value={s.id}>{s.nome} - R${s.preco}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Data do Corte</label>
                <Input type="date" className="bg-zinc-900 border-zinc-800 h-12 color-scheme-dark" value={novo.data} onChange={e => setNovo({...novo, data: e.target.value, horario: ""})} />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Escolha o Horário (30 min)</label>
                <div className="grid grid-cols-4 gap-2 h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {horarios.map(h => {
                    const [hH, mH] = h.split(":").map(Number);
                    const isHoje = novo.data === hojeLocal;
                    const passes = isHoje && (hH < horaAtual || (hH === horaAtual && mH <= minAtual));
                    const busy = horariosOcupados(novo.data, novo.barbeiroId).includes(h);
                    const disable = !novo.barbeiroId || busy || passes;

                    return (
                      <Button 
                        key={h} 
                        variant={novo.horario === h ? "default" : "outline"} 
                        disabled={disable} 
                        onClick={() => setNovo({...novo, horario: h})}
                        className={cn(
                          "text-[11px] font-bold h-10 border-zinc-800",
                          novo.horario === h ? 'bg-primary text-black' : 'text-white bg-zinc-900/50',
                          disable && 'opacity-20 strike-through'
                        )}
                      >
                        {h}
                      </Button>
                    )
                  })}
                </div>
              </div>

              <Button className="w-full h-14 bg-primary text-black font-black uppercase rounded-xl mt-4" onClick={handleAgendar}>
                Confirmar Agendamento
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 👤 SELETOR DE BARBEIROS (APENAS PARA O DONO) */}
      {isDono && (
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <Button 
            variant={barbeiroSelecionadoId === "" ? "default" : "outline"}
            size="sm"
            onClick={() => setBarbeiroSelecionadoId("")}
            className="rounded-full text-[10px] font-black uppercase h-8"
          >
            Todos
          </Button>
          {barbeiros.map((b: any) => (
            <Button 
              key={b.id}
              variant={barbeiroSelecionadoId === b.id ? "default" : "outline"}
              size="sm"
              onClick={() => setBarbeiroSelecionadoId(b.id)}
              className="rounded-full text-[10px] font-black uppercase h-8 whitespace-nowrap"
            >
              {b.nome}
            </Button>
          ))}
        </div>
      )}

      {/* 📅 LISTA DE CARDS DA AGENDA */}
      <div className="space-y-3">
        {agendamentos.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/30 rounded-[2rem] border-2 border-dashed border-zinc-800/50">
            <Clock className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Nenhum serviço para exibir</p>
          </div>
        ) : (
          agendamentos.map((ag: any) => {
            const servico = servicos_find(ag.servico_id);
            const barbeiro = barbeiros.find((b: any) => b.id === ag.barbeiro_id);
            
            return (
              <Card key={ag.id} className={cn(
                "p-5 border-l-[6px] transition-all bg-[#161616] border-zinc-800 shadow-xl",
                ag.status === "Finalizado" && "border-l-green-600 opacity-40 grayscale-[0.5]",
                ag.status === "Cancelado" && "border-l-red-600 opacity-40 strike-through",
                ag.status === "Pendente" && "border-l-primary"
              )}>
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-black text-white tracking-tighter">{ag.horario}</span>
                      <Badge className={cn(
                        "text-[8px] font-black uppercase py-0.5 px-2 rounded-full",
                        ag.status === "Finalizado" ? "bg-green-500/20 text-green-500" :
                        ag.status === "Cancelado" ? "bg-red-500/20 text-red-500" :
                        "bg-primary/20 text-primary"
                      )}>
                        {ag.status}
                      </Badge>
                    </div>
                    
                    <p className="font-black text-lg text-white uppercase leading-none">{ag.nome_cliente}</p>
                    
                    <div className="flex flex-col gap-1 pt-1">
                      <span className="text-[10px] font-black text-zinc-500 uppercase flex items-center gap-1">
                        <Users className="h-3 w-3 text-primary" /> {barbeiro?.nome || "Profissional"}
                      </span>
                      <span className="text-[10px] font-black text-primary uppercase italic">
                        {servico?.nome || "Serviço"} • R${servico?.preco || 0}
                      </span>
                    </div>
                  </div>
                  
                  {ag.status === "Pendente" && (
                    <div className="flex gap-2">
                      <Button size="icon" className="h-10 w-10 text-green-500 bg-green-500/10 hover:bg-green-500 hover:text-black rounded-full" 
                        onClick={() => {
                          const n = ag.telefone_cliente?.replace(/\D/g, "");
                          const msg = `Fala ${ag.nome_cliente}! ✂️\nPassando para confirmar seu horário às ${ag.horario}.\nEstaremos te esperando na *CAJ TECH*!`;
                          window.open(`https://api.whatsapp.com/send?phone=55${n}&text=${encodeURIComponent(msg)}`, "_blank");
                        }}>
                        <MessageCircle className="h-5 w-5 fill-current opacity-20" />
                      </Button>
                      
                      <Button size="icon" className="h-10 w-10 text-white bg-green-600 hover:bg-green-500 rounded-full" 
                        onClick={() => onStatusChange(ag.id, "Finalizado")}>
                        <Check className="h-5 w-5 stroke-[3px]" />
                      </Button>
                      
                      <Button size="icon" variant="ghost" className="h-10 w-10 text-zinc-600 hover:text-red-500 rounded-full" 
                        onClick={() => onStatusChange(ag.id, "Cancelado")}>
                        <X className="h-5 w-5 stroke-[3px]" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  );
}