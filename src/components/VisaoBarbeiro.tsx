import { useState, useEffect, useMemo } from "react";
import { Plus, Check, X, MessageCircle, Users, Clock, ShieldAlert, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { agendamentoSchema } from "@/lib/schemas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

export function VisaoBarbeiro({ 
  barbeiros = [], 
  servicos = [], 
  agendamentos = [], 
  onNovoAgendamento, 
  onStatusChange, 
  barbeiroSelecionadoId, 
  setBarbeiroSelecionadoId, 
  horariosOcupados, 
  servicos_find,
  isDono,
  userId // Certifique-se de passar o ID do usuário logado aqui
}: any) {
  const [open, setOpen] = useState(false);
  const [novo, setNovo] = useState({ 
    nome: "", 
    telefone: "", 
    servicoId: "", 
    barbeiroId: barbeiroSelecionadoId || "", 
    data: "", 
    horario: "" 
  });

  // Identifica o perfil do barbeiro logado para checar status
  const perfilLogado = barbeiros.find((b: any) => b.id === userId);

  // ============================================================================
  // BLOQUEIO DE ACESSO (O GATE)
  // ============================================================================
  if (!isDono && perfilLogado && perfilLogado.ativo === false) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black p-6">
        <div className="max-w-sm w-full space-y-6 text-center">
          <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 bg-red-600/20 blur-3xl rounded-full" />
            <ShieldAlert className="h-20 w-20 text-red-600 relative z-10 stroke-[1.5px]" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">Acesso Negado</h1>
            <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.2em]">
              Seu perfil está desativado. Entre em contato com o administrador.
            </p>
          </div>
          <Button 
            variant="ghost" 
            className="w-full h-12 text-zinc-500 font-black uppercase text-xs hover:text-white"
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sair da Conta
          </Button>
        </div>
      </div>
    );
  }

  const getHojeLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  useEffect(() => {
    if (open) {
      setNovo(prev => ({ 
        ...prev, 
        barbeiroId: barbeiroSelecionadoId || "",
        data: getHojeLocal() 
      }));
    }
  }, [open, barbeiroSelecionadoId]);

  const horarios = useMemo(() => {
    const slots = [];
    for (let h = 9; h <= 19; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
      if (h !== 12 && h !== 19) slots.push(`${String(h).padStart(2, '0')}:30`);
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
  }, []);

  const handleAgendar = async () => {
    const toastId = toast.loading("Processando...");
    const dataParaValidar = { ...novo };
    const validacao = agendamentoSchema.safeParse(dataParaValidar);

    if (!validacao.success) {
      toast.dismiss(toastId);
      return toast.error(validacao.error.errors[0].message);
    }

    try {
      const res = await onNovoAgendamento({
        nome_cliente: validacao.data.nome,
        telefone_cliente: validacao.data.telefone,
        servico_id: validacao.data.servicoId,
        barbeiro_id: validacao.data.barbeiroId,
        data: validacao.data.data,
        horario: validacao.data.horario
      });

      toast.dismiss(toastId);
      if (!res?.error) {
        setOpen(false);
        setNovo({ nome: "", telefone: "", servicoId: "", barbeiroId: barbeiroSelecionadoId, data: getHojeLocal(), horario: "" });
        toast.success("Agendado! ✂️");
      } else {
        toast.error(res.error);
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Erro crítico.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-2">
        <div>
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Agenda</h2>
          {isDono && <p className="text-[10px] font-bold text-primary uppercase">Visão Administrativa</p>}
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full shadow-lg gap-2 h-12 px-8 bg-primary text-black font-black uppercase text-xs active:scale-95 transition-transform">
              <Plus className="h-5 w-5 stroke-[3px]"/> Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent className="dark bg-[#0A0A0A] border-zinc-800 text-white max-w-[95vw] sm:max-w-md p-6 rounded-[2rem] max-h-[90vh] overflow-y-auto custom-scrollbar">
            <DialogHeader>
              <DialogTitle className="text-white font-black uppercase italic text-xl">Novo Horário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Cliente</label>
                <Input placeholder="Nome" className="bg-zinc-900 border-zinc-800 h-12" value={novo.nome} onChange={e => setNovo({...novo, nome: e.target.value})} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">WhatsApp</label>
                <Input type="tel" placeholder="Ex: 11999998888" className="bg-zinc-900 border-zinc-800 h-12" value={novo.telefone} onChange={e => setNovo({...novo, telefone: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Barbeiro</label>
                  <Select value={novo.barbeiroId} onValueChange={v => setNovo({...novo, barbeiroId: v, horario: ""})}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 h-12">
                      <SelectValue placeholder="Selecione"/>
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      {/* FILTRO: Só mostra barbeiros ativos no agendamento */}
                      {barbeiros.filter((b: any) => b.ativo).map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                      ))}
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
                      {servicos.map((s:any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Data</label>
                <Input type="date" className="bg-zinc-900 border-zinc-800 h-12 color-scheme-dark" value={novo.data} onChange={e => setNovo({...novo, data: e.target.value, horario: ""})} />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Horário</label>
                <div className="grid grid-cols-4 gap-2 h-32 overflow-y-auto pr-2 custom-scrollbar">
                  {horarios.map(h => {
                    const [hH, mH] = h.split(":").map(Number);
                    const isHoje = novo.data === hojeLocal;
                    const busy = horariosOcupados(novo.data, novo.barbeiroId).includes(h);
                    const disable = !novo.barbeiroId || busy || (isHoje && (hH < horaAtual || (hH === horaAtual && mH <= minAtual)));

                    return (
                      <Button 
                        key={h} 
                        variant={novo.horario === h ? "default" : "outline"} 
                        disabled={disable} 
                        onClick={() => setNovo({...novo, horario: h})}
                        className={cn(
                          "text-[11px] font-bold h-10",
                          novo.horario === h ? 'bg-primary text-black' : 'text-white bg-zinc-900',
                          disable && 'opacity-20'
                        )}
                      >
                        {h}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Button className="w-full h-14 bg-primary text-black font-black uppercase rounded-xl mt-2" onClick={handleAgendar}>
                Confirmar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* FILTROS DE BARBEIRO (VISÃO DONO) */}
      {isDono && (
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4">
          <Button 
            variant={barbeiroSelecionadoId === "" ? "default" : "outline"}
            size="sm"
            onClick={() => setBarbeiroSelecionadoId("")}
            className="rounded-full text-[10px] font-black uppercase h-8 px-4"
          >
            Todos
          </Button>
          {barbeiros.map((b: any) => (
            <Button 
              key={b.id}
              variant={barbeiroSelecionadoId === b.id ? "default" : "outline"}
              size="sm"
              onClick={() => setBarbeiroSelecionadoId(b.id)}
              className={cn(
                "rounded-full text-[10px] font-black uppercase h-8 px-4 whitespace-nowrap",
                !b.ativo && "opacity-40 grayscale" // Visual de barbeiro desativado
              )}
            >
              {b.nome} {!b.ativo && "(INATIVO)"}
            </Button>
          ))}
        </div>
      )}

      {/* LISTA DE CARDS */}
      <div className="space-y-4 pb-32">
        {agendamentos.length === 0 ? (
          <div className="text-center py-16 bg-zinc-900/30 rounded-[2rem] border-2 border-dashed border-zinc-800/50">
            <Clock className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Nenhum agendamento hoje</p>
          </div>
        ) : (
          agendamentos.map((ag: any) => {
            const servico = servicos_find(ag.servico_id);
            const barbeiro = barbeiros.find((b: any) => b.id === ag.barbeiro_id);
            
            return (
              <Card key={ag.id} className={cn(
                "p-5 border-l-[6px] bg-[#161616] border-zinc-800 shadow-xl transition-all",
                ag.status === "Finalizado" && "border-l-green-600 opacity-40 grayscale",
                ag.status === "Cancelado" && "border-l-red-600 opacity-40 strike-through",
                ag.status === "Pendente" && "border-l-primary"
              )}>
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
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
                        {servico?.nome || "Corte"} • R${servico?.preco || 0}
                      </span>
                    </div>
                  </div>
                  
                  {ag.status === "Pendente" && (
                    <div className="flex items-center gap-3 pt-2 sm:pt-0">
                      <Button size="icon" className="h-12 w-12 text-green-500 bg-green-500/10 rounded-full" 
                        onClick={() => {
                          const n = ag.telefone_cliente?.replace(/\D/g, "");
                          const msg = `Fala ${ag.nome_cliente}! ✂️ Confirmado hoje às ${ag.horario}.`;
                          window.open(`https://api.whatsapp.com/send?phone=55${n}&text=${encodeURIComponent(msg)}`, "_blank");
                        }}>
                        <MessageCircle className="h-6 w-6" />
                      </Button>
                      <Button size="icon" className="h-12 w-12 text-white bg-green-600 rounded-full shadow-lg" onClick={() => onStatusChange(ag.id, "Finalizado")}>
                        <Check className="h-6 w-6 stroke-[3px]" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-12 w-12 text-zinc-600 rounded-full" onClick={() => onStatusChange(ag.id, "Cancelado")}>
                        <X className="h-6 w-6 stroke-[3px]" />
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