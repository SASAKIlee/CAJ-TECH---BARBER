import { useState, useEffect } from "react";

import { Plus, Check, X, MessageCircle, Calendar as CalendarIcon, User } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Card } from "@/components/ui/card";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Badge } from "@/components/ui/badge";



export function VisaoBarbeiro({ 

  barbeiros, servicos, agendamentosBarbeiroHoje, onNovoAgendamento, onFinalizar, onCancelar, barbeiroSelecionadoId, setBarbeiroSelecionadoId, horariosOcupados, servicos_find 

}: any) {

  const [open, setOpen] = useState(false);

  const [novo, setNovo] = useState({ 

    nome: "", 

    telefone: "", 

    servicoId: "", 

    barbeiroId: barbeiroSelecionadoId || "", // Estado para o barbeiro no modal

    data: new Date().toISOString().split("T")[0], 

    horario: "" 

  });



  // Atualiza o barbeiro no modal quando o dono muda o filtro na tela principal

  useEffect(() => {

    if (open) {

      setNovo(prev => ({ ...prev, barbeiroId: barbeiroSelecionadoId }));

    }

  }, [open, barbeiroSelecionadoId]);



  const horarios = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];



  const handleAgendar = async () => {

    if (!novo.nome || !novo.servicoId || !novo.horario || !novo.barbeiroId) {

      return alert("Preencha o nome, serviço, barbeiro e horário!");

    }

    

    const res = await onNovoAgendamento({

      nomeCliente: novo.nome,

      telefoneCliente: novo.telefone,

      servicoId: novo.servicoId,

      barbeiroId: novo.barbeiroId, // Usa o barbeiro selecionado no modal

      data: novo.data,

      horario: novo.horario

    });



    if (!res?.error) {

      setOpen(false);

      setNovo({ 

        nome: "", 

        telefone: "", 

        servicoId: "", 

        barbeiroId: barbeiroSelecionadoId, 

        data: new Date().toISOString().split("T")[0], 

        horario: "" 

      });

    }

  };



  const enviarWhats = (ag: any) => {

    const s = servicos_find(ag.servico_id);

    const numeroLimpo = ag.telefone_cliente?.replace(/\D/g, "");

    const mensagem = `Olá ${ag.nome_cliente}! Confirmamos seu horário na *CAJ TECH* ✂️\n\n` +

                     `📅 *Data:* ${ag.data}\n` +

                     `⏰ *Horário:* ${ag.horario}\n` +

                     `✨ *Serviço:* ${s?.nome}\n\n` +

                     `Podemos confirmar?`;



    const url = `https://api.whatsapp.com/send?phone=55${numeroLimpo}&text=${encodeURIComponent(mensagem)}`;

    window.open(url, "_blank");

  };



  return (

    <div className="space-y-4">

      <div className="flex justify-between items-center mb-6">

        <h2 className="text-xl font-extrabold tracking-tight text-white uppercase">Agenda</h2>

        <Dialog open={open} onOpenChange={setOpen}>

          <DialogTrigger asChild>

            <Button className="rounded-full shadow-lg shadow-primary/20 gap-2 px-6 bg-primary text-black font-bold hover:bg-primary/90">

              <Plus className="h-5 w-5"/> Agendar

            </Button>

          </DialogTrigger>

          <DialogContent className="dark bg-[#121212] border-zinc-800 shadow-2xl max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">

            <DialogHeader>

              <DialogTitle className="text-2xl font-bold text-white">Novo Horário</DialogTitle>

            </DialogHeader>

            <div className="space-y-4 pt-4">

              

              <div className="space-y-1">

                <label className="text-[10px] font-black text-zinc-500 ml-1 uppercase">Nome do Cliente</label>

                <Input 

                  placeholder="Nome completo" 

                  className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-primary h-12" 

                  value={novo.nome} 

                  onChange={e => setNovo({...novo, nome: e.target.value})} 

                />

              </div>



              <div className="space-y-1">

                <label className="text-[10px] font-black text-zinc-500 ml-1 uppercase">WhatsApp (DDD + Número)</label>

                <Input 

                  placeholder="Ex: 11999998888" 

                  className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-primary h-12" 

                  type="tel" 

                  value={novo.telefone} 

                  onChange={e => setNovo({...novo, telefone: e.target.value})} 

                />

              </div>



              {/* CAMPO DE BARBEIRO ADICIONADO AQUI */}

              <div className="space-y-1">

                <label className="text-[10px] font-black text-zinc-500 ml-1 uppercase">Barbeiro Responsável</label>

                <Select value={novo.barbeiroId} onValueChange={v => setNovo({...novo, barbeiroId: v, horario: ""})}>

                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white focus:border-primary h-12">

                    <SelectValue placeholder="Selecione o profissional"/>

                  </SelectTrigger>

                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">

                    {barbeiros.map((b: any) => (

                      <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>

                    ))}

                  </SelectContent>

                </Select>

              </div>



              <div className="space-y-1">

                <label className="text-[10px] font-black text-zinc-500 ml-1 uppercase">Serviço</label>

                <Select onValueChange={v => setNovo({...novo, servicoId: v})}>

                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white focus:border-primary h-12">

                    <SelectValue placeholder="Selecione o que será feito"/>

                  </SelectTrigger>

                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">

                    {servicos.map((s:any) => <SelectItem key={s.id} value={s.id}>{s.nome} - R$ {s.preco}</SelectItem>)}

                  </SelectContent>

                </Select>

              </div>



              <div className="space-y-1">

                <label className="text-[10px] font-black text-zinc-500 ml-1 uppercase">Data</label>

                <Input 

                  type="date" 

                  className="bg-zinc-900 border-zinc-800 text-white focus:border-primary h-12 color-scheme-dark" 

                  value={novo.data} 

                  onChange={e => setNovo({...novo, data: e.target.value, horario: ""})} 

                />

              </div>



              <div className="space-y-2">

                <label className="text-[10px] font-black text-zinc-500 ml-1 uppercase tracking-widest">Horários Disponíveis</label>

                <div className="grid grid-cols-4 gap-2">

                  {horarios.map(h => {

                    const hoje = new Date().toISOString().split("T")[0];

                    const agora = new Date();

                    const [horaH, minutoH] = h.split(":").map(Number);

                    

                    const horarioPassou = novo.data === hoje && (

                      horaH < agora.getHours() || (horaH === agora.getHours() && minutoH <= agora.getMinutes())

                    );



                    // Usa o barbeiroId que está selecionado no modal para checar disponibilidade

                    const ocupado = horariosOcupados(novo.data, novo.barbeiroId).includes(h);

                    const desabilitado = !novo.barbeiroId || ocupado || horarioPassou;



                    return (

                      <Button 

                        key={h} 

                        variant={novo.horario === h ? "default" : "outline"} 

                        disabled={desabilitado} 

                        onClick={() => setNovo({...novo, horario: h})} 

                        size="sm" 

                        className={`text-xs font-bold h-10 ${

                          novo.horario === h ? 'bg-primary text-black' : 'border-zinc-800 text-zinc-400'

                        } ${desabilitado ? 'opacity-10 grayscale border-none' : 'hover:border-primary'}`}

                      >

                        {h}

                      </Button>

                    )

                  })}

                </div>

              </div>



              <Button className="w-full h-14 text-lg font-black bg-primary text-black hover:bg-primary/90 mt-4 rounded-xl shadow-xl" onClick={handleAgendar}>

                CONFIRMAR AGENDAMENTO

              </Button>

            </div>

          </DialogContent>

        </Dialog>

      </div>



      {/* LISTA DE AGENDAMENTOS */}

      <div className="space-y-3">

        {agendamentosBarbeiroHoje.length === 0 ? (

          <div className="text-center py-20 bg-zinc-900/30 rounded-[2rem] border-2 border-dashed border-zinc-800/50">

            <CalendarIcon className="h-12 w-12 mx-auto text-zinc-800 mb-3" />

            <p className="text-zinc-600 font-bold uppercase text-xs tracking-widest">Agenda vazia</p>

          </div>

        ) : (

          agendamentosBarbeiroHoje.map((ag: any) => (

            <Card key={ag.id} className={`p-5 transition-all border-l-[6px] overflow-hidden relative ${

              ag.status === "Finalizado" ? "border-l-green-500/50 bg-green-500/5 opacity-40" : 

              ag.status === "Cancelado" ? "border-l-red-500/50 bg-red-500/5 opacity-40" : 

              "border-l-primary bg-[#161616] border-zinc-800/50 shadow-2xl"

            }`}>

              <div className="flex justify-between items-center">

                <div className="space-y-1">

                  <div className="flex items-center gap-3">

                    <span className="text-3xl font-black text-white tabular-nums tracking-tighter">{ag.horario}</span>

                    <Badge className="bg-zinc-800 text-zinc-400 border-none text-[8px] font-black px-2 py-0.5">

                      {ag.status.toUpperCase()}

                    </Badge>

                  </div>

                  <p className="font-bold text-lg text-zinc-200 uppercase leading-none">{ag.nome_cliente}</p>

                  <p className="text-xs font-black text-primary/80 uppercase">

                    {servicos_find(ag.servico_id)?.nome}

                  </p>

                </div>



                {ag.status === "Pendente" && (

                  <div className="flex gap-2">

                    <Button size="icon" variant="secondary" className="h-12 w-12 rounded-2xl text-green-500 bg-green-500/10 hover:bg-green-500 hover:text-black transition-all active:scale-90" onClick={() => enviarWhats(ag)}>

                      <MessageCircle className="h-6 w-6"/>

                    </Button>

                    <Button size="icon" variant="secondary" className="h-12 w-12 rounded-2xl text-primary bg-primary/10 hover:bg-primary hover:text-black transition-all active:scale-90" onClick={() => onFinalizar(ag.id)}>

                      <Check className="h-6 w-6"/>

                    </Button>

                    <Button size="icon" variant="ghost" className="h-12 w-12 rounded-2xl text-zinc-700 hover:text-red-500 hover:bg-red-500/10" onClick={() => onCancelar(ag.id)}>

                      <X className="h-6 w-6"/>

                    </Button>

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