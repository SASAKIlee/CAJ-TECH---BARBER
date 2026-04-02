import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Calendar, Clock, User, Scissors, Smartphone, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AgendamentoPublico() {
  const { slug } = useParams();
  const [etapa, setEtapa] = useState(1);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  
  // Dados da barbearia (Barbeiros e Serviços)
  const [barbeiros, setBarbeiros] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [ocupados, setOcupados] = useState([]);

  // Seleções do Cliente
  const [selecao, setSelecao] = useState({
    servico: null as any,
    barbeiro: null as any,
    data: "",
    horario: "",
    nome: "",
    whatsapp: ""
  });

  // 1. CARREGAR IDENTIDADE E DADOS
  useEffect(() => {
    async function carregarDados() {
      const { data: bInfo } = await supabase.from("barbearias").select("*").eq("slug", slug).single();
      if (bInfo) setConfig(bInfo);

      const { data: barbs } = await supabase.from("barbeiros").select("*").eq("barbearia_slug", slug).eq("ativo", true);
      const { data: servs } = await supabase.from("servicos").select("*").eq("barbearia_slug", slug);
      
      setBarbeiros(barbs || []);
      setServicos(servs || []);
      setLoading(false);
    }
    carregarDados();
  }, [slug]);

  // 2. BUSCAR HORÁRIOS OCUPADOS QUANDO MUDAR DATA/BARBEIRO
  useEffect(() => {
    if (selecao.data && selecao.barbeiro) {
      supabase.from("agendamentos")
        .select("horario")
        .eq("barbeiro_id", selecao.barbeiro.id)
        .eq("data", selecao.data)
        .then(({ data }) => setOcupados(data?.map(d => d.horario) || []));
    }
  }, [selecao.data, selecao.barbeiro]);

  const handleFinalizar = async () => {
    const toastId = toast.loading("Reservando seu horário...");
    
    const { error } = await supabase.from("agendamentos").insert({
      nome_cliente: selecao.nome,
      telefone_cliente: selecao.whatsapp,
      servico_id: selecao.servico.id,
      barbeiro_id: selecao.barbeiro.id,
      data: selecao.data,
      horario: selecao.horario,
      barbearia_slug: slug,
      status: "Pendente"
    });

    toast.dismiss(toastId);
    if (error) {
      if (error.code === "23505") return toast.error("Ops! Alguém acabou de pegar esse horário. Escolha outro!");
      return toast.error("Erro ao agendar. Tente novamente.");
    }

    setEtapa(5); // Vai para o Ticket VIP
    toast.success("Agendamento Confirmado!");
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Carregando experiência...</div>;

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden font-sans">
      {/* BACKGROUND DINÂMICO */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 scale-110"
        style={{ backgroundImage: `url(${config?.url_fundo || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=2070'})`, filter: 'brightness(0.3) blur(8px)' }}
      />

      <div className="relative z-10 w-full max-w-md">
        {etapa < 5 ? (
          <Card className="bg-black/40 backdrop-blur-xl border-white/10 p-6 rounded-[2.5rem] shadow-2xl text-white">
            <header className="text-center mb-8">
              <h1 className="text-2xl font-black uppercase italic tracking-tighter" style={{ color: config?.cor_primaria }}>{config?.nome || "Barbearia"}</h1>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Reserve seu estilo em segundos</p>
            </header>

            {/* ETAPA 1: SERVIÇO */}
            {etapa === 1 && (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
                <p className="text-xs font-black uppercase text-zinc-500 mb-4">Selecione o Serviço</p>
                {servicos.map((s: any) => (
                  <button key={s.id} onClick={() => { setSelecao({...selecao, servico: s}); setEtapa(2); }}
                    className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 flex justify-between items-center hover:bg-white/10 transition-all text-left">
                    <span className="font-bold uppercase text-sm">{s.nome}</span>
                    <span className="font-black italic text-primary" style={{ color: config?.cor_primaria }}>R$ {s.preco}</span>
                  </button>
                ))}
              </div>
            )}

            {/* ETAPA 2: BARBEIRO */}
            {etapa === 2 && (
              <div className="space-y-3 animate-in fade-in slide-in-from-right-4">
                <p className="text-xs font-black uppercase text-zinc-500 mb-4">Escolha o Profissional</p>
                {barbeiros.map((b: any) => (
                  <button key={b.id} onClick={() => { setSelecao({...selecao, barbeiro: b}); setEtapa(3); }}
                    className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-4 hover:bg-white/10 transition-all">
                    <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center font-black text-xs">{b.nome[0]}</div>
                    <span className="font-bold uppercase text-sm">{b.nome}</span>
                  </button>
                ))}
              </div>
            )}

            {/* ETAPA 3: DATA E HORA (AQUI ENTRA O PORTEIRO) */}
            {etapa === 3 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <Input type="date" className="bg-white/5 border-white/10 h-12 text-white color-scheme-dark" 
                  value={selecao.data} onChange={e => setSelecao({...selecao, data: e.target.value})} />
                
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"].map(h => {
                    const isOcupado = ocupados.includes(h);
                    return (
                      <button key={h} disabled={isOcupado} onClick={() => { setSelecao({...selecao, horario: h}); setEtapa(4); }}
                        className={cn(
                          "p-2 rounded-xl text-[10px] font-black border transition-all",
                          isOcupado ? "opacity-10 border-transparent strike-through" : "bg-white/5 border-white/10 hover:border-primary hover:text-primary"
                        )}>
                        {h}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ETAPA 4: CONTATO */}
            {etapa === 4 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4 text-center">
                <Input placeholder="Seu Nome Completo" className="bg-white/5 border-white/10 h-14 text-center text-lg font-bold" 
                  value={selecao.nome} onChange={e => setSelecao({...selecao, nome: e.target.value})} />
                <Input placeholder="WhatsApp com DDD" className="bg-white/5 border-white/10 h-14 text-center text-lg font-bold" 
                  value={selecao.whatsapp} onChange={e => setSelecao({...selecao, whatsapp: e.target.value})} />
                <Button className="w-full h-14 font-black uppercase rounded-2xl" 
                  style={{ backgroundColor: config?.cor_primaria, color: '#000' }}
                  onClick={handleFinalizar}
                >Confirmar Agendamento</Button>
              </div>
            )}
          </Card>
        ) : (
          /* O TICKET VIP (HORIZONTAL) */
          <div className="animate-in zoom-in-95 duration-500">
            <Card className="bg-zinc-900 border-none rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col sm:flex-row h-auto sm:h-56">
              {/* Lado Esquerdo (Status) */}
              <div className="w-full sm:w-16 flex items-center justify-center p-4" style={{ backgroundColor: config?.cor_primaria }}>
                <CheckCircle2 className="h-8 w-8 text-black" />
              </div>
              
              {/* Corpo do Passe */}
              <div className="flex-1 p-6 relative flex flex-col justify-between bg-gradient-to-br from-zinc-800 to-zinc-900">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Reserva Confirmada</h2>
                    <p className="text-xl font-black text-white uppercase italic tracking-tighter leading-none mt-1">{config?.nome}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-zinc-500 uppercase">Valor</p>
                    <p className="text-lg font-black text-white italic" style={{ color: config?.cor_primaria }}>R$ {selecao.servico?.preco}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <p className="text-[8px] font-black text-zinc-500 uppercase">Data</p>
                    <p className="text-xs font-bold text-white">{selecao.data.split('-').reverse().join('/')}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-zinc-500 uppercase">Horário</p>
                    <p className="text-xs font-bold text-white">{selecao.horario}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-zinc-500 uppercase">Barbeiro</p>
                    <p className="text-xs font-bold text-white uppercase">{selecao.barbeiro?.nome}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                   <p className="text-sm font-black text-white uppercase">{selecao.nome}</p>
                   <p className="text-[8px] text-zinc-600 font-mono tracking-tighter">REF: {Math.random().toString(36).substring(7).toUpperCase()}</p>
                </div>
              </div>
            </Card>
            
            <p className="text-center text-zinc-500 text-[10px] mt-6 font-bold uppercase animate-pulse">Tire um print do seu passe VIP</p>
            <Button variant="ghost" className="w-full mt-2 text-zinc-400 font-black uppercase text-xs" onClick={() => window.location.reload()}>Novo Agendamento</Button>
          </div>
        )}
      </div>
    </div>
  );
}