import { useEffect, useRef, useState } from "react";
import { Users, Scissors, Trash2, Plus, Power, PowerOff, Link as LinkIcon, Copy, FileText, Settings2, Clock, Save, BarChart3, CalendarX2, ImagePlus, Loader2, Lock, Zap, Crown, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { barbeiroSchema, servicoSchema } from "@/lib/schemas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { hexToRgba, contrastTextOnBrand } from "@/lib/branding";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import imageCompression from 'browser-image-compression';

const MotionButton = motion.create(Button);

const DIAS_SEMANA = [
  { id: 0, label: "D", fullName: "Domingo" }, { id: 1, label: "S", fullName: "Segunda" },
  { id: 2, label: "T", fullName: "Terça" }, { id: 3, label: "Q", fullName: "Quarta" },
  { id: 4, label: "Q", fullName: "Quinta" }, { id: 5, label: "S", fullName: "Sexta" },
  { id: 6, label: "S", fullName: "Sábado" },
];

function useCountUp(target: number, duration = 900) {
  const [display, setDisplay] = useState(target);
  const displayRef = useRef(display);
  displayRef.current = display;
  useEffect(() => {
    const from = displayRef.current;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return display;
}

function StatCard({ label, value, brand, highlight, delay = 0 }: any) {
  const animated = useCountUp(value);
  const ctaFg = contrastTextOnBrand(brand);
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 380, damping: 32, delay }}>
      <Card className="relative overflow-hidden rounded-[22px] border border-white/[0.08] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.2)]"
        style={{ backgroundColor: highlight ? brand : hexToRgba(brand, 0.1), backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}>
        <p className={cn("text-[10px] font-bold uppercase tracking-[0.2em] mb-2", highlight ? "text-black/55" : "text-white/50")}>{label}</p>
        <p className="text-2xl font-bold tabular-nums tracking-tight" style={{ color: highlight ? ctaFg : "#fff" }}>R$ {animated.toFixed(2)}</p>
      </Card>
    </motion.div>
  );
}

type DonoSubTab = "resumo" | "dashboard" | "automacoes" | "config";

export function VisaoDono({
  faturamentoHoje = 0, comissoesAPagarHoje = 0, lucroRealHoje = 0, faturamentoMensal = 0,
  comissaoPorBarbeiroHoje = [], barbeiros = [], servicos = [],
  onAddBarbeiro, onRemoveBarbeiro, onAddServico, onRemoveServico, onToggleBarbeiroStatus, corPrimaria = "#D4AF37",
}: any) {
  const [nBarbeiro, setNBarbeiro] = useState({ nome: "", comissao: "50", email: "", senha: "" });
  const [nServico, setNServico] = useState({ nome: "", preco: "", duracao_minutos: "30" });
  
  const [imagemServico, setImagemServico] = useState<File | null>(null);
  const [isUploadingServico, setIsUploadingServico] = useState(false);

  const [subTab, setSubTab] = useState<DonoSubTab>("resumo");
  const [subDir, setSubDir] = useState(1);
  const [horariosLoja, setHorariosLoja] = useState({ 
    abertura: "09:00", fechamento: "18:00", dias_trabalho: [1, 2, 3, 4, 5, 6],
    inicio_almoco: "12:00", fim_almoco: "13:00", datas_fechadas: [] as string[]
  });
  const [novaDataFechada, setNovaDataFechada] = useState("");
  const [isSavingHorario, setIsSavingHorario] = useState(false);
  
  // 🚀 ESTADOS DE BLOQUEIO E PLANO
  const [isLojaAtiva, setIsLojaAtiva] = useState<boolean | null>(null);
  const [planoAtual, setPlanoAtual] = useState<"starter" | "pro" | "elite">("starter");

  // 🚦 ESTADOS DO SEMÁFORO DE PAGAMENTO E UPGRADE
  const [diasRestantes, setDiasRestantes] = useState<number | null>(null);
  const [fasePagamento, setFasePagamento] = useState<1 | 2 | 3 | 4>(1);
  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false);
  const [modalUpgradeAberto, setModalUpgradeAberto] = useState(false);

  const brand = corPrimaria?.trim() || "#D4AF37";
  const ctaFg = contrastTextOnBrand(brand);
  const glass = { backgroundColor: hexToRgba(brand, 0.1), backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" } as const;
  const formatarMoeda = (v: any) => Number(v || 0).toFixed(2);

  const chartData = comissaoPorBarbeiroHoje.map((item: any) => ({
    name: item.barbeiro?.nome?.split(' ')[0] || "Desconhecido",
    Total: item.total
  })).sort((a: any, b: any) => b.Total - a.Total);

  useEffect(() => {
    async function carregarDadosLoja() {
      const slugAtivo = barbeiros[0]?.barbearia_slug;
      if (!slugAtivo) return;
      
      const { data, error } = await supabase.from('barbearias')
        .select('horario_abertura, horario_fechamento, dias_trabalho, inicio_almoco, fim_almoco, datas_fechadas, ativo, data_vencimento, plano')
        .eq('slug', slugAtivo).single();
        
      if (data && !error) {
        setIsLojaAtiva(data.ativo !== false); 
        setPlanoAtual(data.plano || "starter");
        
        setHorariosLoja({
          abertura: data.horario_abertura || "09:00", 
          fechamento: data.horario_fechamento || "18:00",
          inicio_almoco: data.inicio_almoco || "12:00",
          fim_almoco: data.fim_almoco || "13:00",
          dias_trabalho: Array.isArray(data.dias_trabalho) ? data.dias_trabalho : [1, 2, 3, 4, 5, 6],
          datas_fechadas: Array.isArray(data.datas_fechadas) ? data.datas_fechadas : []
        });

        // 🚦 CÁLCULO DO SEMÁFORO DE PAGAMENTO
        if (data.data_vencimento) {
          const hoje = new Date();
          const vencimento = new Date(data.data_vencimento);
          const diffTime = vencimento.getTime() - hoje.getTime();
          const diffDias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          setDiasRestantes(diffDias);

          if (diffDias > 3) setFasePagamento(1); 
          else if (diffDias >= 0 && diffDias <= 3) setFasePagamento(2); 
          else if (diffDias >= -3 && diffDias < 0) setFasePagamento(3); 
          else setFasePagamento(4); 
        }
      }
    }
    carregarDadosLoja();
  }, [barbeiros]);

  const switchSub = (next: DonoSubTab) => {
    const order: DonoSubTab[] = ["resumo", "dashboard", "automacoes", "config"];
    setSubDir(order.indexOf(next) > order.indexOf(subTab) ? 1 : -1);
    setSubTab(next);
  };

  const handleAddBarbeiro = () => {
    // 🔒 TRAVA DO PLANO STARTER: Máximo 2 Barbeiros
    if (planoAtual === "starter" && barbeiros.length >= 2) {
      setModalUpgradeAberto(true);
      return toast.error("Limite atingido! O Plano Starter permite apenas 2 profissionais.");
    }

    const validacao = barbeiroSchema.safeParse(nBarbeiro);
    if (!validacao.success) return toast.error(validacao.error.errors[0].message);
    onAddBarbeiro(validacao.data.nome, Number(validacao.data.comissao), validacao.data.email, validacao.data.senha);
    setNBarbeiro({ nome: "", comissao: "50", email: "", senha: "" });
  };

  const handleAddServico = async () => {
    const validacao = servicoSchema.safeParse(nServico);
    if (!validacao.success) return toast.error(validacao.error.errors[0].message);
    
    setIsUploadingServico(true);
    let urlFinal = null;

    if (imagemServico) {
      try {
        const options = { maxSizeMB: 0.2, maxWidthOrHeight: 800, useWebWorker: true };
        toast.loading("Otimizando imagem...", { id: "upload-img" });
        const compressedFile = await imageCompression(imagemServico, options);
        const fileExt = compressedFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error } = await supabase.storage.from('servicos').upload(fileName, compressedFile);
        if (error) throw error;
        const { data: publicData } = supabase.storage.from('servicos').getPublicUrl(fileName);
        urlFinal = publicData.publicUrl;
        toast.success("Imagem salva!", { id: "upload-img" });
      } catch (error) {
        toast.error("Erro ao otimizar ou salvar a imagem.", { id: "upload-img" });
        setIsUploadingServico(false);
        return;
      }
    }

    onAddServico(validacao.data.nome, Number(validacao.data.preco), Number(validacao.data.duracao_minutos), urlFinal);
    setNServico({ nome: "", preco: "", duracao_minutos: "30" });
    setImagemServico(null);
    setIsUploadingServico(false);
  };

  const handleSaveHorarios = async () => {
    const slugAtivo = barbeiros[0]?.barbearia_slug;
    if (!slugAtivo) return toast.error("Erro ao identificar sua barbearia.");
    if (horariosLoja.dias_trabalho.length === 0) return toast.error("Selecione pelo menos um dia de trabalho!");
    setIsSavingHorario(true);
    try {
      const { error } = await supabase.from('barbearias').update({
        horario_abertura: horariosLoja.abertura, horario_fechamento: horariosLoja.fechamento, dias_trabalho: horariosLoja.dias_trabalho,
        inicio_almoco: horariosLoja.inicio_almoco, fim_almoco: horariosLoja.fim_almoco, datas_fechadas: horariosLoja.datas_fechadas
      }).eq('slug', slugAtivo);
      if (error) throw error;
      toast.success("Horários atualizados com sucesso!");
    } catch (error) { toast.error("Erro ao salvar horários."); } finally { setIsSavingHorario(false); }
  };

  const toggleDiaSemana = (idDia: number) => {
    setHorariosLoja(prev => {
      const isSelected = prev.dias_trabalho.includes(idDia);
      const novosDias = isSelected ? prev.dias_trabalho.filter(d => d !== idDia) : [...prev.dias_trabalho, idDia].sort();
      return { ...prev, dias_trabalho: novosDias };
    });
  };

  const handleAddDataFechada = () => {
    if (!novaDataFechada) return;
    if (horariosLoja.datas_fechadas.includes(novaDataFechada)) return toast.error("Esta data já está bloqueada.");
    setHorariosLoja(prev => ({ ...prev, datas_fechadas: [...prev.datas_fechadas, novaDataFechada].sort() }));
    setNovaDataFechada("");
  };

  const handleRemoveDataFechada = (dataParaRemover: string) => {
    setHorariosLoja(prev => ({ ...prev, datas_fechadas: prev.datas_fechadas.filter(d => d !== dataParaRemover) }));
  };

  const formatarDataBR = (dataIso: string) => {
    const [ano, mes, dia] = dataIso.split("-");
    return `${dia}/${mes}/${ano}`;
  };

  const tabVariants = { enter: (dir: number) => ({ x: dir * 56, opacity: 0 }), center: { x: 0, opacity: 1 }, exit: (dir: number) => ({ x: dir * -56, opacity: 0 }) };

  // 🚀 BARREIRA 1: BLOQUEIO MANUAL PELO CEO
  if (isLojaAtiva === false) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
        <div className="h-28 w-28 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(239,68,68,0.2)]">
          <Lock className="h-12 w-12 text-red-500" />
        </div>
        <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-3">Acesso Suspenso</h2>
        <p className="text-zinc-400 max-w-md text-sm leading-relaxed mb-6">
          Sua conta encontra-se pendente de regularização manual. O painel administrativo e o agendamento público da sua barbearia foram desativados.
        </p>
        <p className="text-zinc-600 text-xs font-bold uppercase tracking-[0.2em] bg-zinc-900/50 px-4 py-2 rounded-lg border border-zinc-800">
          Entre em contato com o suporte CAJ TECH.
        </p>
      </div>
    );
  }

  // 🚀 BARREIRA 2: BLOQUEIO AUTOMÁTICO POR FALTA DE PAGAMENTO (Fase 4)
  if (fasePagamento === 4) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] text-center px-4">
        <div className="bg-zinc-900 border border-red-500/40 p-8 rounded-[32px] max-w-md w-full text-center space-y-6 shadow-[0_0_60px_rgba(239,68,68,0.15)] relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
           <div className="mx-auto w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-2">
             <Lock className="w-8 h-8 text-red-500" />
           </div>
           <div>
             <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">Sistema Bloqueado</h2>
             <p className="text-zinc-400 text-sm font-bold mt-2">O prazo de carência encerrou. Renove sua assinatura para liberar a agenda e não perder clientes.</p>
           </div>
           
           <div className="p-5 bg-black rounded-2xl border border-zinc-800 space-y-2">
             <p className="text-[10px] uppercase font-black text-emerald-500 tracking-widest">Chave PIX (E-mail)</p>
             <p className="text-white font-mono text-lg select-all">2409d86d-1e1e-45a1-a90c-691908fc1baf</p>
           </div>

           <Button onClick={() => window.open(`https://wa.me/5517992051576?text=Fala equipe CAJ, acabei de realizar o pagamento da minha barbearia para desbloqueio!`, '_blank')} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white h-14 rounded-2xl font-black uppercase tracking-wide text-sm shadow-xl shadow-emerald-600/20">
             Já paguei! Liberar Acesso
           </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32 w-full max-w-full overflow-x-hidden text-white">
      
      {/* 🚦 BANNERS DE AVISO DE PAGAMENTO E UPGRADE RÁPIDO */}
      <div className="flex flex-col gap-2 mx-4 mt-2">
        {planoAtual === "starter" && fasePagamento === 1 && (
           <Button variant="outline" onClick={() => setModalUpgradeAberto(true)} className="w-full bg-white/5 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 font-black text-[10px] uppercase h-9 rounded-xl flex items-center justify-center gap-2">
             <Crown className="h-4 w-4" /> Fazer Upgrade de Plano
           </Button>
        )}

        {fasePagamento === 2 && diasRestantes !== null && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-[20px] flex items-center justify-between">
            <span className="text-yellow-500 text-[10px] sm:text-xs font-black uppercase flex items-center gap-2">
              <span className="animate-pulse h-2.5 w-2.5 bg-yellow-500 rounded-full shrink-0"></span>
              Atenção: Seu teste ou plano vence em {diasRestantes} dias.
            </span>
            <Button size="sm" onClick={() => setModalPagamentoAberto(true)} className="bg-yellow-500 text-black hover:bg-yellow-400 font-black text-[10px] uppercase h-8 px-4 rounded-xl shrink-0">
              Renovar
            </Button>
          </div>
        )}

        {fasePagamento === 3 && diasRestantes !== null && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-[20px] flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <span className="text-red-500 text-[10px] sm:text-xs font-black uppercase flex items-center gap-2">
              <span className="animate-pulse h-2.5 w-2.5 bg-red-500 rounded-full shrink-0"></span>
              🚨 Vencido: Você tem {3 + diasRestantes} dias de cortesia.
            </span>
            <Button size="sm" onClick={() => setModalPagamentoAberto(true)} className="bg-red-600 text-white hover:bg-red-500 font-black text-[10px] uppercase h-8 px-4 rounded-xl shadow-lg shadow-red-500/20 shrink-0">
              Renovar Urgente
            </Button>
          </div>
        )}
      </div>

      {/* ABAS DE NAVEGAÇÃO */}
      <div className="flex rounded-2xl border border-white/[0.08] p-1 gap-1 mx-4" style={glass}>
        {([
          { id: "resumo" as const, label: "Resumo", Icon: FileText },
          { id: "dashboard" as const, label: "Métricas", Icon: BarChart3 },
          { id: "automacoes" as const, label: "VIP", Icon: Zap },
          { id: "config" as const, label: "Ajustes", Icon: Settings2 },
        ] as const).map(({ id, label, Icon }) => (
          <MotionButton key={id} type="button" variant="ghost" whileTap={{ scale: 0.95 }} onClick={() => switchSub(id)}
            className={cn("flex-1 h-11 rounded-xl text-[10px] font-bold uppercase tracking-wide gap-1.5 px-1", subTab === id ? "shadow-lg border-0" : "text-white/60 hover:text-white hover:bg-white/[0.06]")}
            style={subTab === id ? { backgroundColor: brand, color: ctaFg } : undefined}>
            <Icon className="h-4 w-4" />{label}
          </MotionButton>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false} custom={subDir}>
        <motion.div key={subTab} custom={subDir} variants={tabVariants} initial="enter" animate="center" exit="exit" transition={{ type: "spring", stiffness: 400, damping: 36 }} className="space-y-8 px-4">
          
          {subTab === "resumo" && (
            <>
              <section>
                <Card className="relative overflow-hidden rounded-[22px] border border-white/[0.08] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.25)]" style={glass}>
                  <div className="absolute -right-4 -top-4 opacity-[0.07]"><Scissors className="h-24 w-24 rotate-12" style={{ color: brand }} /></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: brand }} />
                      <p className="text-[10px] uppercase font-bold tracking-[0.25em]" style={{ color: brand }}>Link de Agendamento</p>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="rounded-xl border border-white/[0.08] bg-black/35 p-3 flex items-center justify-between gap-2 backdrop-blur-md">
                        <code className="text-[11px] text-zinc-300 font-mono truncate">cajtech.net.br/agendar/{barbeiros[0]?.barbearia_slug || "seu-slug"}</code>
                        <MotionButton size="sm" whileTap={{ scale: 0.95 }} className="h-8 px-4 rounded-xl shrink-0 font-bold uppercase text-[10px] border-0" style={{ backgroundColor: brand, color: ctaFg }}
                          onClick={() => { void navigator.clipboard.writeText(`https://cajtech.net.br/agendar/${barbeiros[0]?.barbearia_slug || "seu-slug"}`); toast.success("Link copiado!"); }}>
                          <Copy className="h-3 w-3 mr-2" /> Copiar
                        </MotionButton>
                      </div>
                    </div>
                  </div>
                </Card>
              </section>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Entradas hoje" value={Number(faturamentoHoje) || 0} brand={brand} delay={0} />
                <StatCard label="Lucro real hoje" value={Number(lucroRealHoje) || 0} brand={brand} highlight delay={0.06} />
                <StatCard label="Faturamento mês" value={Number(faturamentoMensal) || 0} brand={brand} delay={0.1} />
                <StatCard label="Comissões hoje" value={Number(comissoesAPagarHoje) || 0} brand={brand} delay={0.14} />
              </div>
            </>
          )}

          {subTab === "dashboard" && (
            <section className="space-y-6">
              <div className="flex items-center gap-2 px-1">
                <BarChart3 className="h-5 w-5" style={{ color: brand }} />
                <h3 className="font-black text-white uppercase text-xl tracking-tighter italic">Inteligência de Dados</h3>
              </div>
              <Card className="p-5 rounded-[22px] border border-white/[0.08] shadow-xl space-y-4" style={glass}>
                <div>
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Ranking de Faturamento (Hoje)</p>
                  <p className="text-sm font-semibold text-white">Produção por Profissional</p>
                </div>
                <div className="h-64 w-full mt-4">
                  {chartData.length > 0 && chartData.some((d: any) => d.Total > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val}`} />
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }} formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Produção']} />
                        <Bar dataKey="Total" radius={[6, 6, 6, 6]}>
                          {chartData.map((entry: any, index: number) => (<Cell key={`cell-${index}`} fill={index === 0 ? brand : hexToRgba(brand, 0.4)} />))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center border border-dashed border-white/10 rounded-xl">
                      <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">Nenhuma produção registrada hoje</p>
                    </div>
                  )}
                </div>
              </Card>
              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-black text-white/50 uppercase tracking-widest px-1">Detalhamento da Equipe</p>
                <div className="grid gap-2">
                  {comissaoPorBarbeiroHoje.map((item: any, i: number) => (
                    <Card key={item.barbeiro?.id ?? i} className={cn("p-4 rounded-[20px] border border-white/[0.08] flex justify-between items-center shadow-lg", !item.barbeiro?.ativo && "opacity-60")} style={glass}>
                      <div>
                        <p className="font-semibold text-white uppercase text-xs tracking-tight">{item.barbeiro?.nome}</p>
                        <p className="text-[9px] text-white/45 font-bold uppercase tracking-tighter">{item.cortes} atendimentos</p>
                      </div>
                      <p className="text-lg font-bold tabular-nums" style={{ color: brand }}>R$ {formatarMoeda(item.total)}</p>
                    </Card>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* 🚀 NOVA ABA: AUTOMAÇÕES VIP (Com Tags "Em Breve") */}
          {subTab === "automacoes" && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Zap className="h-5 w-5" style={{ color: brand }} />
                <h3 className="font-black text-white uppercase text-xl tracking-tighter italic">Automações VIP</h3>
              </div>

              {planoAtual === "starter" ? (
                <Card className="p-8 rounded-[22px] border border-white/[0.08] shadow-xl text-center flex flex-col items-center gap-4" style={glass}>
                  <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                    <Lock className="h-8 w-8 text-zinc-500" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white uppercase italic">Recursos Bloqueados</h4>
                    <p className="text-xs text-zinc-400 mt-1 max-w-[250px] mx-auto">Sua barbearia está no plano Starter. Faça o upgrade para desbloquear ferramentas avançadas.</p>
                  </div>
                  <div className="flex flex-col gap-2 w-full mt-2 text-left">
                    <p className="text-[10px] text-emerald-500 uppercase font-black px-2 flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3"/> Barbeiros Ilimitados
                    </p>
                    <p className="text-[10px] text-emerald-500 uppercase font-black px-2 flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3"/> Lembretes via WhatsApp 
                      <span className="ml-auto bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-[8px] px-2 py-0.5 rounded-full tracking-widest">EM BREVE</span>
                    </p>
                    <p className="text-[10px] text-emerald-500 uppercase font-black px-2 flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3"/> Clube de Assinatura (Netflix)
                      <span className="ml-auto bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 text-[8px] px-2 py-0.5 rounded-full tracking-widest">EM BREVE</span>
                    </p>
                  </div>
                  <Button onClick={() => setModalUpgradeAberto(true)} className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase shadow-lg h-12 rounded-xl">
                    Desbloquear Agora
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-3">
                  <Card 
                    onClick={() => toast.info("🚀 Funcionalidade em fase final de testes. Você será o primeiro a receber!")}
                    className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 cursor-pointer hover:bg-emerald-500/10 transition-colors relative overflow-hidden"
                  >
                    <div className="absolute top-3 right-3 bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest">
                      Em Breve
                    </div>
                    <div className="flex items-center gap-3">
                      <Zap className="h-8 w-8 text-emerald-500" />
                      <div>
                        <h4 className="font-bold text-sm uppercase">Lembretes Automáticos</h4>
                        <p className="text-[10px] text-zinc-400 font-medium">Disparo de WhatsApp 2 horas antes do corte.</p>
                      </div>
                    </div>
                  </Card>

                  <Card 
                    onClick={() => toast.info("🚀 Funcionalidade em fase final de testes. Você será o primeiro a receber!")}
                    className="p-5 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 cursor-pointer hover:bg-yellow-500/10 transition-colors relative overflow-hidden"
                  >
                    <div className="absolute top-3 right-3 bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest">
                      Em Breve
                    </div>
                    <div className="flex items-center gap-3">
                      <Crown className="h-8 w-8 text-yellow-500" />
                      <div>
                        <h4 className="font-bold text-sm uppercase">Clube de Assinatura</h4>
                        <p className="text-[10px] text-zinc-400 font-medium">Crie planos mensais para seus clientes fiéis.</p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </section>
          )}

          {subTab === "config" && (
            <>
              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Clock className="h-4 w-4" style={{ color: brand }} />
                  <h3 className="font-bold text-white uppercase text-sm tracking-tight">Horário de Funcionamento</h3>
                </div>
                <Card className="p-5 rounded-[22px] border border-white/[0.08] shadow-xl space-y-5" style={glass}>
                  <div className="space-y-2">
                    <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Dias de Trabalho</p>
                    <div className="flex justify-between gap-1">
                      {DIAS_SEMANA.map((dia) => {
                        const isSelected = horariosLoja.dias_trabalho.includes(dia.id);
                        return (
                          <button key={dia.id} onClick={() => toggleDiaSemana(dia.id)}
                            className={cn("h-10 flex-1 rounded-xl text-xs font-bold transition-all border", isSelected ? "border-transparent shadow-lg" : "bg-black/30 border-white/[0.08] text-white/40 hover:bg-white/5")}
                            style={isSelected ? { backgroundColor: brand, color: ctaFg } : {}} title={dia.fullName}>
                            {dia.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Abertura</p>
                      <input type="time" value={horariosLoja.abertura} onChange={(e) => setHorariosLoja({ ...horariosLoja, abertura: e.target.value })} className="w-full rounded-xl border border-white/[0.08] bg-black/30 p-3 text-sm text-white outline-none focus:border-white/20 backdrop-blur-sm" style={{ colorScheme: 'dark' }} />
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Fechamento</p>
                      <input type="time" value={horariosLoja.fechamento} onChange={(e) => setHorariosLoja({ ...horariosLoja, fechamento: e.target.value })} className="w-full rounded-xl border border-white/[0.08] bg-black/30 p-3 text-sm text-white outline-none focus:border-white/20 backdrop-blur-sm" style={{ colorScheme: 'dark' }} />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/[0.05] space-y-3">
                    <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Pausa (Almoço / Descanso)</p>
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-2">
                        <p className="text-[9px] text-white/30 uppercase font-bold tracking-widest">Início da Pausa</p>
                        <input type="time" value={horariosLoja.inicio_almoco} onChange={(e) => setHorariosLoja({ ...horariosLoja, inicio_almoco: e.target.value })} className="w-full rounded-xl border border-white/[0.08] bg-black/30 p-3 text-sm text-white outline-none focus:border-white/20 backdrop-blur-sm" style={{ colorScheme: 'dark' }} />
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="text-[9px] text-white/30 uppercase font-bold tracking-widest">Fim da Pausa</p>
                        <input type="time" value={horariosLoja.fim_almoco} onChange={(e) => setHorariosLoja({ ...horariosLoja, fim_almoco: e.target.value })} className="w-full rounded-xl border border-white/[0.08] bg-black/30 p-3 text-sm text-white outline-none focus:border-white/20 backdrop-blur-sm" style={{ colorScheme: 'dark' }} />
                      </div>
                    </div>
                  </div>

                </Card>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <CalendarX2 className="h-4 w-4" style={{ color: brand }} />
                  <h3 className="font-bold text-white uppercase text-sm tracking-tight">Feriados e Bloqueios</h3>
                </div>
                <Card className="p-5 rounded-[22px] border border-white/[0.08] shadow-xl space-y-4" style={glass}>
                  <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Adicionar dia fechado</p>
                  <div className="flex gap-2">
                    <input type="date" value={novaDataFechada} onChange={(e) => setNovaDataFechada(e.target.value)} className="flex-1 rounded-xl border border-white/[0.08] bg-black/30 p-3 text-sm text-white outline-none focus:border-white/20 backdrop-blur-sm" style={{ colorScheme: 'dark' }} />
                    <MotionButton className="h-12 w-12 shrink-0 rounded-xl border-0 p-0" style={{ backgroundColor: brand, color: ctaFg }} whileTap={{ scale: 0.95 }} onClick={handleAddDataFechada}>
                      <Plus className="h-6 w-6 stroke-[3px]" />
                    </MotionButton>
                  </div>

                  {horariosLoja.datas_fechadas.length > 0 && (
                    <div className="pt-2">
                      <p className="text-[9px] text-white/30 uppercase font-bold tracking-widest mb-2">Dias bloqueados</p>
                      <div className="flex flex-wrap gap-2">
                        {horariosLoja.datas_fechadas.map(data => (
                          <div key={data} className="flex items-center gap-2 bg-black/40 border border-white/[0.08] pl-3 pr-1 py-1 rounded-full backdrop-blur-sm">
                            <span className="text-[11px] font-bold text-zinc-300">{formatarDataBR(data)}</span>
                            <button onClick={() => handleRemoveDataFechada(data)} className="h-6 w-6 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="pt-4 border-t border-white/[0.05]">
                    <MotionButton className="w-full h-12 rounded-xl font-bold uppercase tracking-wide gap-2 border-0 bg-white/10 text-white hover:bg-white/20 shadow-lg" whileTap={{ scale: 0.95 }} onClick={handleSaveHorarios} disabled={isSavingHorario}>
                      <Save className="h-4 w-4" />{isSavingHorario ? "Salvando..." : "Salvar Configurações Gerais"}
                    </MotionButton>
                  </div>
                </Card>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Users className="h-4 w-4" style={{ color: brand }} />
                  <h3 className="font-bold text-white uppercase text-sm tracking-tight">Equipe</h3>
                </div>
                <Card className="p-4 rounded-[22px] border border-white/[0.08] space-y-3 shadow-xl" style={glass}>
                  <input placeholder="Nome do Barbeiro" className="w-full rounded-xl border border-white/[0.08] bg-black/30 p-3 text-sm text-white outline-none focus:border-white/20 backdrop-blur-sm" value={nBarbeiro.nome} onChange={(e) => setNBarbeiro({ ...nBarbeiro, nome: e.target.value })} />
                  <div className="flex gap-2">
                    <input placeholder="Email" className="flex-1 rounded-xl border border-white/[0.08] bg-black/30 p-3 text-sm text-white outline-none focus:border-white/20 backdrop-blur-sm" value={nBarbeiro.email} onChange={(e) => setNBarbeiro({ ...nBarbeiro, email: e.target.value })} />
                    <input placeholder="%" type="number" className="w-20 rounded-xl border border-white/[0.08] bg-black/30 p-3 text-sm text-white outline-none focus:border-white/20 backdrop-blur-sm" value={nBarbeiro.comissao} onChange={(e) => setNBarbeiro({ ...nBarbeiro, comissao: e.target.value })} />
                  </div>
                  <input placeholder="Senha" type="password" className="w-full rounded-xl border border-white/[0.08] bg-black/30 p-3 text-sm text-white outline-none focus:border-white/20 backdrop-blur-sm" value={nBarbeiro.senha} onChange={(e) => setNBarbeiro({ ...nBarbeiro, senha: e.target.value })} />
                  <MotionButton className="w-full h-12 rounded-xl font-bold uppercase border-0" style={{ backgroundColor: brand, color: ctaFg }} whileTap={{ scale: 0.95 }} onClick={handleAddBarbeiro}>Cadastrar Barbeiro</MotionButton>
                </Card>

                <div className="grid gap-2">
                  {barbeiros.map((b: any) => (
                    <div key={b.id} className={cn("flex justify-between items-center rounded-xl border border-white/[0.08] p-3 transition-all", !b.ativo && "opacity-50 grayscale")} style={glass}>
                      <div className="flex items-center gap-3">
                        <div className={cn("h-2 w-2 rounded-full", b.ativo ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500")} />
                        <span className="text-xs font-semibold text-white uppercase tracking-tight">{b.nome} ({b.comissao_pct}%)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MotionButton variant="ghost" size="sm" whileTap={{ scale: 0.95 }} onClick={() => onToggleBarbeiroStatus(b.id, !b.ativo)} className={cn("h-8 w-8 p-0 rounded-full", b.ativo ? "text-zinc-400 hover:text-red-400" : "text-green-400")}>
                          {b.ativo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </MotionButton>
                        <MotionButton variant="ghost" size="sm" whileTap={{ scale: 0.95 }} onClick={() => onRemoveBarbeiro(b.id)} className="h-8 w-8 p-0 rounded-full text-zinc-500 hover:text-red-400" disabled={b.ativo}>
                          <Trash2 className="h-4 w-4" />
                        </MotionButton>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Scissors className="h-4 w-4" style={{ color: brand }} />
                  <h3 className="font-bold text-white uppercase text-sm tracking-tight">Serviços e preços</h3>
                </div>

                <Card className="p-4 rounded-[22px] border border-white/[0.08] shadow-xl space-y-3" style={glass}>
                  <input placeholder="Nome do Serviço" className="w-full rounded-xl border border-white/[0.08] bg-black/30 p-3 text-sm text-white outline-none focus:border-white/20 backdrop-blur-sm" value={nServico.nome} onChange={(e) => setNServico({ ...nServico, nome: e.target.value })} />
                  
                  <div className="flex items-center gap-3">
                    <label className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border border-dashed border-white/20 bg-black/30 text-xs text-white/60 cursor-pointer hover:bg-white/5 transition-colors">
                      <ImagePlus className="h-4 w-4" />
                      {imagemServico ? imagemServico.name.substring(0, 15) + "..." : "Adicionar Foto (Opcional)"}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => setImagemServico(e.target.files?.[0] || null)} />
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-3 text-zinc-500 text-sm">R$</span>
                      <input placeholder="0,00" type="number" className="w-full rounded-xl border border-white/[0.08] bg-black/30 p-3 pl-9 text-sm text-white outline-none focus:border-white/20 backdrop-blur-sm" value={nServico.preco} onChange={(e) => setNServico({ ...nServico, preco: e.target.value })} />
                    </div>
                    <div className="relative w-28 shrink-0">
                      <span className="absolute right-3 top-3 text-zinc-500 text-sm">min</span>
                      <input placeholder="30" type="number" step="15" className="w-full rounded-xl border border-white/[0.08] bg-black/30 p-3 pr-10 text-sm text-white outline-none focus:border-white/20 backdrop-blur-sm" value={nServico.duracao_minutos} onChange={(e) => setNServico({ ...nServico, duracao_minutos: e.target.value })} />
                    </div>
                    <MotionButton className="h-12 w-12 shrink-0 rounded-xl border-0 p-0" style={{ backgroundColor: brand, color: ctaFg }} whileTap={{ scale: 0.95 }} onClick={handleAddServico} disabled={isUploadingServico}>
                      {isUploadingServico ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-6 w-6 stroke-[3px]" />}
                    </MotionButton>
                  </div>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {servicos.map((s: any) => (
                    <div key={s.id} className="flex justify-between items-center rounded-xl border border-white/[0.08] p-3" style={glass}>
                      <div className="flex items-center gap-3">
                        {s.url_imagem && (
                          <img src={s.url_imagem} alt="Serviço" className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                        )}
                        <div className="text-[11px]">
                          <p className="font-semibold text-white uppercase tracking-tight">{s.nome}</p>
                          <p className="font-bold italic tabular-nums" style={{ color: brand }}>
                            R$ {formatarMoeda(s.preco)} <span className="text-zinc-500 text-[9px] font-normal not-italic ml-1 opacity-70">• {s.duracao_minutos} min</span>
                          </p>
                        </div>
                      </div>
                      <MotionButton variant="ghost" size="icon" whileTap={{ scale: 0.95 }} onClick={() => onRemoveServico(s.id)} className="h-9 w-9 text-zinc-500 hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </MotionButton>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 💳 MODAL DE UPGRADE / ESCOLHA DE PLANOS */}
      {modalUpgradeAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md overflow-y-auto pt-20 pb-10">
          <div className="w-full max-w-4xl space-y-6">
            <div className="flex justify-between items-center px-4">
              <h2 className="text-white font-black uppercase italic text-2xl tracking-tighter">Planos CAJ TECH</h2>
              <button onClick={() => setModalUpgradeAberto(false)} className="text-zinc-500 hover:text-white transition-colors bg-white/5 h-10 w-10 rounded-full flex items-center justify-center">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-2">
              
              {/* CARD: STARTER */}
              <Card className="p-6 rounded-3xl border border-zinc-800 bg-black flex flex-col justify-between">
                <div>
                  <h3 className="text-zinc-400 font-black uppercase text-sm tracking-widest">Starter</h3>
                  <p className="text-[10px] text-zinc-500 mt-1 h-8">Para sair do papel e do WhatsApp.</p>
                  <p className="text-4xl font-black text-white my-4 italic">R$ 50<span className="text-sm text-zinc-500 not-italic">/mês</span></p>
                  <div className="space-y-3 mb-6">
                    <p className="text-xs font-semibold text-zinc-300 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500"/> Link de Agendamento</p>
                    <p className="text-xs font-semibold text-zinc-300 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500"/> Até 2 Barbeiros</p>
                    <p className="text-xs font-semibold text-zinc-300 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500"/> Controle de Caixa</p>
                  </div>
                </div>
                <Button disabled={planoAtual === "starter"} onClick={() => window.open(`https://wa.me/5517992051576?text=Quero mudar para o plano Starter!`, '_blank')} className="w-full bg-zinc-800 text-white font-bold h-12 rounded-xl">
                  {planoAtual === "starter" ? "Seu Plano Atual" : "Selecionar"}
                </Button>
              </Card>

              {/* CARD: PRO (Destaque) */}
              <Card className="p-6 rounded-3xl border-2 border-emerald-500 bg-emerald-500/5 flex flex-col justify-between relative transform scale-105 shadow-2xl shadow-emerald-500/20 z-10">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  Mais Vendido
                </div>
                <div>
                  <h3 className="text-emerald-500 font-black uppercase text-sm tracking-widest">Pro</h3>
                  <p className="text-[10px] text-zinc-400 mt-1 h-8">A máquina de automação e gestão.</p>
                  <p className="text-5xl font-black text-white my-4 italic">R$ 99<span className="text-sm text-zinc-500 not-italic">,90/mês</span></p>
                  <div className="space-y-3 mb-6">
                    <p className="text-xs font-semibold text-white flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500"/> Tudo do Starter +</p>
                    <p className="text-xs font-semibold text-zinc-300 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500"/> WhatsApp Automático</p>
                    <p className="text-xs font-semibold text-zinc-300 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500"/> Barbeiros Ilimitados</p>
                    <p className="text-xs font-semibold text-zinc-300 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500"/> Clube de Assinatura</p>
                  </div>
                </div>
                <Button disabled={planoAtual === "pro"} onClick={() => window.open(`https://wa.me/5517992051576?text=Quero assinar o Plano Pro!`, '_blank')} className="w-full bg-emerald-500 text-black font-black uppercase h-12 rounded-xl">
                  {planoAtual === "pro" ? "Seu Plano Atual" : "Assinar Plano Pro"}
                </Button>
              </Card>

              {/* CARD: ELITE */}
              <Card className="p-6 rounded-3xl border border-yellow-500/50 bg-black flex flex-col justify-between">
                <div>
                  <h3 className="text-yellow-500 font-black uppercase text-sm tracking-widest flex items-center gap-2"><Crown className="h-4 w-4"/> Elite</h3>
                  <p className="text-[10px] text-zinc-500 mt-1 h-8">SaaS + Marketing por nossa conta.</p>
                  <p className="text-4xl font-black text-white my-4 italic">R$ 497<span className="text-sm text-zinc-500 not-italic">/mês</span></p>
                  <div className="space-y-3 mb-6">
                    <p className="text-xs font-semibold text-white flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-yellow-500"/> Tudo do Pro +</p>
                    <p className="text-xs font-semibold text-zinc-300 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-yellow-500"/> Criação de Logos e Design</p>
                    <p className="text-xs font-semibold text-zinc-300 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-yellow-500"/> Gestão de Tráfego Pago</p>
                    <p className="text-xs font-semibold text-zinc-300 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-yellow-500"/> Redes Sociais Especializadas</p>
                  </div>
                </div>
                <Button disabled={planoAtual === "elite"} onClick={() => window.open(`https://wa.me/5517992051576?text=Quero falar com um consultor sobre o Plano Elite!`, '_blank')} className="w-full bg-yellow-500 text-black font-black uppercase h-12 rounded-xl">
                  {planoAtual === "elite" ? "Seu Plano Atual" : "Falar com Consultor"}
                </Button>
              </Card>

            </div>
          </div>
        </div>
      )}

      {/* 💳 MODAL DE ASSINATURA / RENOVAÇÃO SIMPLES */}
      {modalPagamentoAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm transition-all">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-[32px] p-6 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
            
            <div className="flex justify-between items-center pb-2">
              <h2 className="text-white font-black uppercase italic text-2xl tracking-tighter">Renovar Plano</h2>
              <button onClick={() => setModalPagamentoAberto(false)} className="text-zinc-500 hover:text-white transition-colors bg-white/5 h-8 w-8 rounded-full flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 text-center">
              <p className="text-zinc-400 text-xs font-bold leading-relaxed">
                Faça o PIX no valor do seu plano para garantir seu acesso contínuo e não perder clientes na agenda.
              </p>
              
              <div className="bg-black p-5 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center gap-2 shadow-inner">
                 <span className="text-[10px] uppercase font-black text-emerald-500 tracking-widest">Chave PIX E-mail</span>
                 <span className="text-white font-mono text-lg select-all bg-white/5 px-4 py-2 rounded-lg border border-white/10 w-full">2409d86d-1e1e-45a1-a90c-691908fc1baf</span>
              </div>
            </div>

            <Button 
              onClick={() => window.open(`https://wa.me/5517992051576?text=Fala equipe CAJ, acabei de renovar meu plano, segue o comprovante!`, '_blank')} 
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black h-14 rounded-2xl text-sm uppercase italic tracking-wide shadow-xl shadow-emerald-600/20"
            >
              Já Paguei! Enviar Comprovante
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}

function X(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  )
}