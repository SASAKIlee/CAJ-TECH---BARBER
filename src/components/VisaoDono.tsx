import { useEffect, useRef, useState } from "react";
import { 
  Users, Scissors, Trash2, Plus, Power, PowerOff, 
  Copy, FileText, Settings2, Clock, Save, 
  BarChart3, CalendarX2, ImagePlus, Loader2, Lock, 
  Zap, Crown, CheckCircle2, X, Timer, QrCode, CheckCircle, UserCircle2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { barbeiroSchema, servicoSchema } from "@/lib/schemas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { hexToRgba, contrastTextOnBrand } from "@/lib/branding";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
// Importamos o CartesianGrid para dar o visual de painel financeiro
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import imageCompression from 'browser-image-compression';

const MotionButton = motion.create(Button);

const DIAS_SEMANA = [
  { id: 0, label: "D", fullName: "Domingo" }, { id: 1, label: "S", fullName: "Segunda" },
  { id: 2, label: "T", fullName: "Terça" }, { id: 3, label: "Q", fullName: "Quarta" },
  { id: 4, label: "Q", fullName: "Quinta" }, { id: 5, label: "S", fullName: "Sexta" },
  { id: 6, label: "S", fullName: "Sábado" },
];

type DonoSubTab = "resumo" | "dashboard" | "automacoes" | "config";
type PlanoType = "starter" | "pro" | "elite";

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
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 380, damping: 32, delay }} className="w-full">
      <Card className="relative overflow-hidden rounded-[24px] border border-white/[0.08] p-5 shadow-xl h-full"
        style={{ backgroundColor: highlight ? brand : hexToRgba(brand, 0.08), backdropFilter: "blur(16px)" }}>
        <p className={cn("text-[10px] font-black uppercase tracking-[0.15em] mb-2 opacity-70", highlight ? "text-black" : "text-white")}>{label}</p>
        <p className="text-xl font-black tabular-nums tracking-tighter" style={{ color: highlight ? ctaFg : "#fff" }}>R$ {animated.toFixed(2)}</p>
      </Card>
    </motion.div>
  );
}

export function VisaoDono({
  faturamentoHoje = 0, comissoesAPagarHoje = 0, lucroRealHoje = 0, faturamentoMensal = 0,
  comissaoPorBarbeiroHoje = [], barbeiros = [], servicos = [],
  onAddBarbeiro, onRemoveBarbeiro, onAddServico, onRemoveServico, onToggleBarbeiroStatus, corPrimaria = "#D4AF37",
}: any) {
  
  const [meuSlug, setMeuSlug] = useState<string>("");
  const [nBarbeiro, setNBarbeiro] = useState({ nome: "", comissao: "50", email: "", senha: "" });
  const [imagemBarbeiro, setImagemBarbeiro] = useState<File | null>(null);
  const [isUploadingBarbeiro, setIsUploadingBarbeiro] = useState(false);
  const [nServico, setNServico] = useState({ nome: "", preco: "", duracao_minutos: "30" });
  const [imagemServico, setImagemServico] = useState<File | null>(null);
  const [isUploadingServico, setIsUploadingServico] = useState(false);

  const [subTab, setSubTab] = useState<DonoSubTab>("resumo");
  const [subDir, setSubDir] = useState(1);
  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false);
  const [modalUpgradeAberto, setModalUpgradeAberto] = useState(false);

  const [isLojaAtiva, setIsLojaAtiva] = useState<boolean | null>(null);
  const [planoAtual, setPlanoAtual] = useState<PlanoType>("starter");
  const [horariosLoja, setHorariosLoja] = useState({ 
    abertura: "09:00", fechamento: "18:00", dias_trabalho: [1, 2, 3, 4, 5, 6],
    inicio_almoco: "12:00", fim_almoco: "13:00", datas_fechadas: [] as string[]
  });
  const [novaDataFechada, setNovaDataFechada] = useState("");
  const [isSavingHorario, setIsSavingHorario] = useState(false);

  const [diasRestantes, setDiasRestantes] = useState<number | null>(null);
  const [fasePagamento, setFasePagamento] = useState<1 | 2 | 3 | 4>(1);

  const [planoPagamento, setPlanoPagamento] = useState<PlanoType>("starter");
  const [isGerandoPix, setIsGerandoPix] = useState(false);
  const [pixGerado, setPixGerado] = useState<string | null>(null);
  const [tempoPix, setTempoPix] = useState(900);

  const brand = corPrimaria?.trim() || "#D4AF37";
  const ctaFg = contrastTextOnBrand(brand);
  const glass = { backgroundColor: hexToRgba(brand, 0.05), backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" } as const;

  const tabVariants = {
    enter: (dir: number) => ({ x: dir * 56, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir * -56, opacity: 0 })
  };

  useEffect(() => {
    async function carregarDadosLoja() {
      // 🛡️ BLINDAGEM: Verifica autenticação com segurança
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) return;
      
      const { data, error } = await supabase.from('barbearias').select('*').eq('dono_id', authData.user.id).single();
      if (data && !error) {
        setMeuSlug(data.slug);
        setIsLojaAtiva(data.ativo !== false); 
        setPlanoAtual(data.plano || "starter");
        setHorariosLoja({
          abertura: data.horario_abertura || "09:00", fechamento: data.horario_fechamento || "18:00",
          inicio_almoco: data.inicio_almoco || "12:00", fim_almoco: data.fim_almoco || "13:00",
          dias_trabalho: Array.isArray(data.dias_trabalho) ? data.dias_trabalho : [1, 2, 3, 4, 5, 6],
          datas_fechadas: Array.isArray(data.datas_fechadas) ? data.datas_fechadas : []
        });

        if (data.data_vencimento) {
          const hoje = new Date();
          const vencimento = new Date(data.data_vencimento);
          const diffDias = Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
          setDiasRestantes(diffDias);
          if (diffDias > 3) setFasePagamento(1); 
          else if (diffDias >= 0 && diffDias <= 3) setFasePagamento(2); 
          else if (diffDias >= -3 && diffDias < 0) setFasePagamento(3); 
          else setFasePagamento(4); 
        }
      }
    }
    carregarDadosLoja();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (pixGerado && tempoPix > 0) interval = setInterval(() => setTempoPix(t => t - 1), 1000);
    else if (tempoPix === 0) setPixGerado(null);
    return () => clearInterval(interval);
  }, [pixGerado, tempoPix]);

  const formatarTempo = (segundos: number) => {
    const m = Math.floor(segundos / 60).toString().padStart(2, '0');
    const s = (segundos % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getValorPlano = (planoTarget: PlanoType) => {
    if (planoTarget === 'starter') return 50.00;
    if (planoTarget === 'pro') return 99.90;
    if (planoTarget === 'elite') return 497.00;
    return 99.90;
  };

  const handleAbrirCheckout = (tipo: 'renovacao' | 'upgrade', planoAlvo?: PlanoType) => {
    setPixGerado(null);
    if (tipo === 'renovacao') {
      setPlanoPagamento(planoAtual);
      setModalPagamentoAberto(true);
    } else if (tipo === 'upgrade' && planoAlvo) {
      setModalUpgradeAberto(false);
      setPlanoPagamento(planoAlvo);
      setModalPagamentoAberto(true);
    }
  };

  const handleGerarPixDinâmico = async () => {
    setIsGerandoPix(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Sessão expirada. Recarregue a página.");

      const { data: barbearia } = await supabase.from('barbearias').select('id').eq('dono_id', authData.user.id).single();
      if (!barbearia) throw new Error("Barbearia não identificada.");

      const { data, error } = await supabase.functions.invoke('mercado-pago-pix', {
        body: { barbearia_id: barbearia.id, plano: planoPagamento, email_dono: authData.user.email }
      });

      if (error || data?.error) throw new Error(data?.error || "Erro na comunicação com o servidor de pagamentos.");
      
      setPixGerado(data.qr_code); 
      setTempoPix(900);
      toast.success("PIX gerado com segurança!");
    } catch (err: any) { 
      toast.error(err.message); 
    } finally { 
      setIsGerandoPix(false); 
    }
  };

  const copiarPix = () => { if (pixGerado) { navigator.clipboard.writeText(pixGerado); toast.success("Código copiado!"); } };

  const switchSub = (next: DonoSubTab) => {
    const order: DonoSubTab[] = ["resumo", "dashboard", "automacoes", "config"];
    setSubDir(order.indexOf(next) > order.indexOf(subTab) ? 1 : -1);
    setSubTab(next);
  };

  const handleSaveHorarios = async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return toast.error("Sessão expirada.");
    
    setIsSavingHorario(true);
    try {
      const { error } = await supabase.from('barbearias').update({
        horario_abertura: horariosLoja.abertura, horario_fechamento: horariosLoja.fechamento, 
        dias_trabalho: horariosLoja.dias_trabalho, inicio_almoco: horariosLoja.inicio_almoco, 
        fim_almoco: horariosLoja.fim_almoco, datas_fechadas: horariosLoja.datas_fechadas
      }).eq('dono_id', authData.user.id);
      
      if (error) throw error;
      toast.success("Horários salvos com sucesso!");
    } catch (err) { 
      toast.error("Erro ao salvar."); 
    } finally { 
      setIsSavingHorario(false); 
    }
  };

  const handleUploadImagem = async (file: File, bucket: string) => {
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.1, maxWidthOrHeight: 600 });
      // 🛡️ BLINDAGEM: Criptografia para gerar nomes de arquivos únicos e evitar substituições
      const uniqueId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
      const fileName = `${uniqueId}.${compressed.name.split('.').pop()}`;
      
      const { error } = await supabase.storage.from(bucket).upload(fileName, compressed);
      if (error) throw error;
      
      return supabase.storage.from(bucket).getPublicUrl(fileName).data.publicUrl;
    } catch (err) {
      toast.error("Erro no processamento da imagem.");
      return null;
    }
  };

  const handleAddBarbeiroComFotoETrava = async () => {
    if (planoAtual === "starter" && barbeiros.length >= 2) {
      setModalUpgradeAberto(true);
      return toast.error("Seu plano Starter permite apenas 2 profissionais.");
    }
    const validacao = barbeiroSchema.safeParse(nBarbeiro);
    if (!validacao.success) return toast.error(validacao.error.errors[0].message);
    
    setIsUploadingBarbeiro(true);
    let urlFinal = null;
    if (imagemBarbeiro) {
      urlFinal = await handleUploadImagem(imagemBarbeiro, 'equipe');
    }

    onAddBarbeiro(validacao.data.nome, Number(validacao.data.comissao), validacao.data.email, validacao.data.senha, urlFinal);
    setNBarbeiro({ nome: "", comissao: "50", email: "", senha: "" });
    setImagemBarbeiro(null);
    setIsUploadingBarbeiro(false);
  };

  const handleAddServicoComFoto = async () => {
    const validacao = servicoSchema.safeParse(nServico);
    if (!validacao.success) return toast.error(validacao.error.errors[0].message);
    
    setIsUploadingServico(true);
    let urlFinal = null;
    if (imagemServico) {
      urlFinal = await handleUploadImagem(imagemServico, 'servicos');
    }

    onAddServico(validacao.data.nome, Number(validacao.data.preco), Number(validacao.data.duracao_minutos), urlFinal);
    setNServico({ nome: "", preco: "", duracao_minutos: "30" });
    setImagemServico(null);
    setIsUploadingServico(false);
  };

  const toggleDiaSemana = (idDia: number) => {
    setHorariosLoja(prev => {
      const isSelected = prev.dias_trabalho.includes(idDia);
      return { ...prev, dias_trabalho: isSelected ? prev.dias_trabalho.filter(d => d !== idDia) : [...prev.dias_trabalho, idDia].sort() };
    });
  };

  const handleAddDataFechada = () => {
    if (!novaDataFechada || horariosLoja.datas_fechadas.includes(novaDataFechada)) return;
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

  if (isLojaAtiva === false) return renderBloqueioManual();
  if (fasePagamento === 4) return renderBloqueioInadimplencia();

  return (
    <div className="flex flex-col gap-6 pb-40 pt-4 w-full overflow-x-hidden text-white">
      <div className="px-4 flex flex-col gap-3">
        {renderBannersAlerta()}
      </div>

      <div className="px-4">
        <div className="flex rounded-[20px] border border-white/[0.08] p-1.5 gap-1.5 shadow-2xl" style={glass}>
          {([
            { id: "resumo", label: "Resumo", Icon: FileText },
            { id: "dashboard", label: "Métricas", Icon: BarChart3 },
            { id: "automacoes", label: "VIP", Icon: Zap },
            { id: "config", label: "Ajustes", Icon: Settings2 },
          ] as const).map(({ id, label, Icon }) => (
            <MotionButton key={id} type="button" variant="ghost" whileTap={{ scale: 0.95 }} onClick={() => switchSub(id as DonoSubTab)}
              className={cn("flex-1 h-12 rounded-[14px] text-[10px] font-black uppercase tracking-widest px-0 transition-all", subTab === id ? "shadow-lg border-0" : "text-white/40 hover:text-white/70")}
              style={subTab === id ? { backgroundColor: brand, color: ctaFg } : undefined}>
              <div className="flex flex-col items-center gap-1">
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">{label}</span>
              </div>
            </MotionButton>
          ))}
        </div>
      </div>

      <div className="px-4">
        <AnimatePresence mode="wait" initial={false} custom={subDir}>
          <motion.div key={subTab} custom={subDir} variants={tabVariants} initial="enter" animate="center" exit="exit" 
            transition={{ type: "spring", stiffness: 400, damping: 35 }} className="flex flex-col gap-8">
            
            {subTab === "resumo" && (
              <>
                <Card className="relative overflow-hidden rounded-[28px] border border-white/[0.08] p-6 shadow-2xl" style={glass}>
                  <p className="text-[10px] uppercase font-black tracking-[0.3em] mb-4 opacity-50" style={{ color: brand }}>Link de Agendamento</p>
                  <div className="flex flex-col gap-3">
                    <div className="rounded-2xl bg-black/40 p-4 border border-white/5 backdrop-blur-md">
                      <code className="text-xs text-zinc-400 font-mono break-all leading-relaxed">cajtech.net.br/agendar/{meuSlug || "..."}</code>
                    </div>
                    <Button size="lg" className="h-14 rounded-2xl font-black uppercase tracking-widest text-xs w-full shadow-lg" style={{ backgroundColor: brand, color: ctaFg }}
                      onClick={() => { navigator.clipboard.writeText(`https://cajtech.net.br/agendar/${meuSlug}`); toast.success("Copiado com sucesso!"); }}>
                      <Copy className="h-4 w-4 mr-2" /> Copiar Link
                    </Button>
                  </div>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <StatCard label="Entradas hoje" value={faturamentoHoje} brand={brand} />
                  <StatCard label="Lucro Real" value={lucroRealHoje} brand={brand} highlight />
                  <StatCard label="Faturamento Mês" value={faturamentoMensal} brand={brand} />
                  <StatCard label="Comissões" value={comissoesAPagarHoje} brand={brand} />
                </div>
              </>
            )}

            {subTab === "dashboard" && renderTabDashboard()}
            {subTab === "automacoes" && renderTabVIP()}
            {subTab === "config" && renderTabConfig()}

          </motion.div>
        </AnimatePresence>
      </div>

      {renderModalUpgrade()}
      {renderModalRenovacao()}
    </div>
  );

  function renderBannersAlerta() {
    if (planoAtual === "starter" && fasePagamento === 1) {
      return (
        <Button variant="outline" onClick={() => setModalUpgradeAberto(true)} className="w-full bg-emerald-500/5 border-emerald-500/20 text-emerald-500 font-black text-[10px] uppercase h-12 rounded-2xl gap-2">
          <Crown className="h-4 w-4" /> Evoluir para o Plano PRO
        </Button>
      );
    }
    if (fasePagamento === 2) {
      return (
        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-[24px] flex items-center justify-between text-yellow-500 text-[10px] font-black uppercase">
          <span className="flex items-center gap-2"><span className="animate-pulse h-2 w-2 bg-yellow-500 rounded-full" /> Vencimento em {diasRestantes} dias</span>
          <Button size="sm" onClick={() => handleAbrirCheckout('renovacao')} className="bg-yellow-500 text-black h-9 px-5 rounded-xl font-black">Pagar</Button>
        </div>
      );
    }
    if (fasePagamento === 3) {
      return (
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-[24px] flex items-center justify-between text-red-500 text-[10px] font-black uppercase">
          <span className="flex items-center gap-2"><span className="animate-pulse h-2 w-2 bg-red-500 rounded-full" /> Vencido: {3 + (diasRestantes || 0)}d</span>
          <Button size="sm" onClick={() => handleAbrirCheckout('renovacao')} className="bg-red-600 text-white h-9 px-5 rounded-xl font-black">Regularizar</Button>
        </div>
      );
    }
    return null;
  }

  function renderTabDashboard() {
    // Tratamento seguro dos dados: Garante que "Total" seja um número válido
    const data = comissaoPorBarbeiroHoje.map((item: any) => ({ 
      name: item.barbeiro?.nome?.split(' ')[0] || "...", 
      Total: Number(item.total) || 0 
    })).sort((a: any, b: any) => b.Total - a.Total);

    const hasData = data.some((d: any) => d.Total > 0);

    return (
      <div className="flex flex-col gap-6">
        <h3 className="font-black text-white uppercase text-lg italic flex items-center gap-2 px-1">
          <BarChart3 className="h-5 w-5" style={{ color: brand }} /> Desempenho
        </h3>
        
        <Card className="p-6 rounded-[28px] border border-white/[0.08] shadow-xl relative" style={glass}>
          {!hasData ? (
            // 🛡️ NOVO: Empty State Bonito (Impede de ficar aquele buraco vazio feio)
            <div className="flex flex-col items-center justify-center h-48 text-center space-y-3 opacity-60">
               <BarChart3 className="h-10 w-10 text-zinc-500 mb-2" />
               <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Nenhuma produção registrada hoje</p>
               <p className="text-xs font-medium text-zinc-500">As métricas da sua equipe aparecerão aqui.</p>
            </div>
          ) : (
            // 🛡️ NOVO: Gráfico com Grid e MaxBarSize (Impede o tijolo amarelo)
            <div className="h-64 w-full mt-2">
              <ResponsiveContainer>
                <BarChart data={data} margin={{ left: -30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#777" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="#777" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                    contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '16px', fontSize: '12px', fontWeight: 'bold' }} 
                    itemStyle={{ color: brand }}
                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Produção']}
                  />
                  {/* O "maxBarSize={45}" é o salva-vidas do visual! */}
                  <Bar dataKey="Total" radius={[6, 6, 6, 6]} maxBarSize={45}>
                    {data.map((_, i) => <Cell key={i} fill={i === 0 ? brand : hexToRgba(brand, 0.4)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    );
  }

  function renderTabVIP() {
    return (
      <div className="flex flex-col gap-6">
        <h3 className="font-black text-white uppercase text-lg italic flex items-center gap-2 px-1"><Zap className="h-5 w-5" style={{ color: brand }} /> Automações VIP</h3>
        {planoAtual === "starter" ? (
          <Card className="p-8 rounded-[32px] border border-white/[0.08] text-center flex flex-col items-center gap-6" style={glass}>
            <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center border border-white/10"><Lock className="h-8 w-8 text-zinc-600" /></div>
            <div className="space-y-4 w-full text-left bg-black/30 p-6 rounded-2xl border border-white/5">
              <p className="text-xs text-emerald-500 font-black uppercase flex items-center gap-3"><CheckCircle2 className="h-4 w-4"/> WhatsApp Automático</p>
              <p className="text-xs text-emerald-500 font-black uppercase flex items-center gap-3"><CheckCircle2 className="h-4 w-4"/> Clube de Assinatura</p>
            </div>
            <Button onClick={() => setModalUpgradeAberto(true)} className="w-full bg-emerald-600 text-white font-black uppercase h-16 rounded-2xl shadow-xl text-sm italic">Desbloquear Agora</Button>
          </Card>
        ) : (
          <div className="grid gap-4">
             <Card onClick={() => toast.info("🚀 Operação automática de disparos ativada!")} className="p-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 cursor-pointer relative group transition-all hover:bg-emerald-500/10">
               <span className="absolute top-4 right-4 text-[9px] bg-emerald-500/20 text-emerald-500 px-3 py-1 rounded-full font-black uppercase tracking-widest">Ativo</span>
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center"><Zap className="h-6 w-6 text-emerald-500" /></div>
                  <div>
                    <h4 className="font-black text-sm uppercase">Lembretes Automáticos</h4>
                    <p className="text-xs text-zinc-400 font-medium mt-1 italic">WhatsApp 2h antes do corte.</p>
                  </div>
               </div>
             </Card>
             <Card onClick={() => toast.info("🚀 Módulo em homologação final.")} className="p-6 rounded-3xl border border-yellow-500/20 bg-yellow-500/5 cursor-pointer relative group transition-all hover:bg-yellow-500/10">
               <span className="absolute top-4 right-4 text-[9px] bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-full font-black uppercase tracking-widest">Em Breve</span>
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-yellow-500/10 rounded-2xl flex items-center justify-center"><Crown className="h-6 w-6 text-yellow-500" /></div>
                  <div>
                    <h4 className="font-black text-sm uppercase">Clube de Assinatura</h4>
                    <p className="text-xs text-zinc-400 font-medium mt-1 italic">Crie planos mensais recorrentes.</p>
                  </div>
               </div>
             </Card>
          </div>
        )}
      </div>
    );
  }

  function renderTabConfig() {
    return (
      <div className="flex flex-col gap-10 pb-20">
        <div className="flex flex-col gap-4">
          <h3 className="font-black text-white uppercase text-lg italic flex items-center gap-2 px-1"><Clock className="h-5 w-5" style={{ color: brand }} /> Horários</h3>
          <Card className="p-6 rounded-[28px] border border-white/[0.08] shadow-xl space-y-6" style={glass}>
            <div className="flex justify-between gap-1.5">
              {DIAS_SEMANA.map((dia) => {
                const isSelected = horariosLoja.dias_trabalho.includes(dia.id);
                return (
                  <button key={dia.id} onClick={() => toggleDiaSemana(dia.id)} 
                    className={cn("h-12 flex-1 rounded-xl text-xs font-black transition-all border", isSelected ? "border-transparent" : "bg-black/30 border-white/5 text-white/30")} 
                    style={isSelected ? { backgroundColor: brand, color: ctaFg } : {}}>{dia.label}</button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[9px] text-zinc-500 uppercase font-black ml-1">Abertura</p>
                <input type="time" value={horariosLoja.abertura} onChange={e => setHorariosLoja({...horariosLoja, abertura: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white text-center" style={{colorScheme: 'dark'}} />
              </div>
              <div className="space-y-1">
                <p className="text-[9px] text-zinc-500 uppercase font-black ml-1">Fechamento</p>
                <input type="time" value={horariosLoja.fechamento} onChange={e => setHorariosLoja({...horariosLoja, fechamento: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white text-center" style={{colorScheme: 'dark'}} />
              </div>
            </div>
            <Button onClick={handleSaveHorarios} disabled={isSavingHorario} className="w-full h-14 rounded-2xl bg-white/10 text-white font-black uppercase tracking-widest text-xs">{isSavingHorario ? <Loader2 className="animate-spin h-5 w-5" /> : "Salvar Horários"}</Button>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="font-black text-white uppercase text-lg italic flex items-center gap-2 px-1"><Users className="h-5 w-5" style={{ color: brand }} /> Equipe</h3>
          <Card className="p-6 rounded-[28px] border border-white/[0.08] shadow-xl space-y-4" style={glass}>
            <Input placeholder="Nome do Barbeiro" className="bg-black/30 border-white/10 h-14 rounded-xl" value={nBarbeiro.nome} onChange={e => setNBarbeiro({...nBarbeiro, nome: e.target.value})} />
            
            <label className="flex items-center justify-center gap-2 h-14 rounded-xl border border-dashed border-white/20 bg-black/20 text-[10px] uppercase font-black cursor-pointer hover:bg-white/5">
              {imagemBarbeiro ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <UserCircle2 className="h-4 w-4 opacity-50" />} 
              {imagemBarbeiro ? "Foto Selecionada" : "Anexar Foto (Opcional)"}
              <input type="file" accept="image/*" className="hidden" onChange={e => setImagemBarbeiro(e.target.files?.[0] || null)} />
            </label>

            <div className="flex gap-3">
              <Input placeholder="E-mail" className="bg-black/30 border-white/10 h-14 rounded-xl flex-1" value={nBarbeiro.email} onChange={e => setNBarbeiro({...nBarbeiro, email: e.target.value})} />
              <Input placeholder="%" type="number" className="bg-black/30 border-white/10 h-14 rounded-xl w-20 text-center" value={nBarbeiro.comissao} onChange={e => setNBarbeiro({...nBarbeiro, comissao: e.target.value})} />
            </div>
            <Input placeholder="Senha" type="password" className="bg-black/30 border-white/10 h-14 rounded-xl" value={nBarbeiro.senha} onChange={e => setNBarbeiro({...nBarbeiro, senha: e.target.value})} />
            <Button onClick={handleAddBarbeiroComFotoETrava} disabled={isUploadingBarbeiro} className="w-full h-14 rounded-2xl font-black uppercase shadow-lg shadow-black/40" style={{ backgroundColor: brand, color: ctaFg }}>{isUploadingBarbeiro ? <Loader2 className="animate-spin h-5 w-5" /> : "Cadastrar Barbeiro"}</Button>
          </Card>
          
          <div className="grid gap-3">
            {barbeiros.map((b: any) => (
              <div key={b.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("h-10 w-10 rounded-full flex items-center justify-center font-black", b.ativo ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500")}>{b.nome[0].toUpperCase()}</div>
                  <div>
                    <p className="font-bold text-xs uppercase">{b.nome}</p>
                    <p className="text-[10px] text-zinc-500 uppercase font-black">{b.comissao_pct}% comissão</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => onToggleBarbeiroStatus(b.id, !b.ativo)} className="text-zinc-500">{b.ativo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}</Button>
                  <Button size="icon" variant="ghost" onClick={() => onRemoveBarbeiro(b.id)} disabled={b.ativo} className="text-zinc-500"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderBloqueioManual() {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-8">
        <div className="h-28 w-28 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-8 shadow-2xl"><Lock className="h-12 w-12 text-red-500" /></div>
        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Acesso Suspenso</h2>
        <p className="text-zinc-500 text-sm leading-relaxed mb-10 italic">Sua conta requer atenção manual. Fale com nosso suporte técnico.</p>
        <Button onClick={() => window.open('https://wa.me/5517992051576')} className="bg-zinc-800 h-16 w-full rounded-2xl font-black uppercase tracking-widest italic shadow-xl">Suporte CAJ TECH</Button>
      </div>
    );
  }

  function renderBloqueioInadimplencia() {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-10 bg-black">
        <div className="bg-zinc-900/50 border border-red-500/30 p-8 rounded-[40px] max-w-sm w-full text-center space-y-8 shadow-[0_0_100px_rgba(239,68,68,0.1)]">
           <Lock className="w-16 h-16 text-red-500 mx-auto opacity-40" />
           <h2 className="text-3xl font-black text-white uppercase italic leading-none">Sistema<br/>Bloqueado</h2>
           <div className="bg-black/50 border border-zinc-800 p-5 rounded-3xl">
             <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1 italic">Assinatura Mensal</p>
             <p className="text-3xl font-black text-white italic">R$ {getValorPlano(planoAtual).toFixed(2)}</p>
           </div>
           {!pixGerado ? (
             <Button onClick={() => handleAbrirCheckout('renovacao')} disabled={isGerandoPix} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black h-16 rounded-2xl shadow-xl uppercase italic tracking-widest text-base">
               {isGerandoPix ? <Loader2 className="animate-spin h-6 w-6" /> : "Pagar via PIX Agora"}
             </Button>
           ) : (
             <div className="space-y-4 animate-in zoom-in-95">
               <div className="bg-emerald-500/10 border border-emerald-500/30 p-6 rounded-3xl">
                 <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-4">Expira em {formatarTempo(tempoPix)}</p>
                 <Button onClick={copiarPix} className="w-full bg-emerald-500 text-black font-black h-14 rounded-xl flex items-center justify-center gap-2">Copiar Código PIX</Button>
               </div>
               <p className="text-[10px] text-zinc-500 italic uppercase font-black">Desbloqueio automático após pagamento</p>
             </div>
           )}
        </div>
      </div>
    );
  }

  function renderModalUpgrade() {
    if (!modalUpgradeAberto) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl overflow-y-auto">
        <div className="w-full max-w-4xl flex flex-col gap-8 py-10">
          <div className="flex justify-between items-center px-4">
            <h2 className="text-white font-black uppercase italic text-2xl tracking-tighter italic">Planos CAJ TECH</h2>
            <button onClick={() => setModalUpgradeAberto(false)} className="bg-white/5 h-12 w-12 rounded-full flex items-center justify-center"><X className="text-zinc-500 h-6 w-6" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 pb-20">
             {(['starter', 'pro', 'elite'] as PlanoType[]).map((p) => (
               <Card key={p} className={cn("p-8 rounded-[32px] flex flex-col justify-between gap-8 transition-all border-2", planoAtual === p ? "border-white/10 bg-white/5 opacity-50" : "border-emerald-500/20 bg-black shadow-2xl")}>
                  <div className="space-y-4">
                    <h3 className="text-zinc-400 font-black uppercase text-xs tracking-[0.3em]">{p}</h3>
                    <p className="text-4xl font-black text-white italic">R$ {getValorPlano(p).toFixed(0)}<span className="text-xs opacity-30">/mês</span></p>
                    <ul className="space-y-3">
                       <li className="flex items-center gap-2 text-[10px] font-black text-zinc-300 uppercase"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Link de Agenda</li>
                       {p !== 'starter' && <li className="flex items-center gap-2 text-[10px] font-black text-zinc-300 uppercase"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> WhatsApp VIP</li>}
                       {p === 'elite' && <li className="flex items-center gap-2 text-[10px] font-black text-zinc-300 uppercase"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Marketing Full</li>}
                    </ul>
                  </div>
                  {planoAtual === p ? (
                    <Button variant="outline" disabled className="h-14 rounded-2xl uppercase font-black text-[10px]">Plano Atual</Button>
                  ) : (
                    <Button onClick={() => handleAbrirCheckout('upgrade', p)} className="h-14 rounded-2xl uppercase font-black text-xs shadow-lg" style={{ backgroundColor: brand, color: ctaFg }}>Evoluir Agora</Button>
                  )}
               </Card>
             ))}
          </div>
        </div>
      </div>
    );
  }

  function renderModalRenovacao() {
    if (!modalPagamentoAberto) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
        <div className="bg-zinc-900 border border-white/5 w-full max-w-sm rounded-[40px] p-8 space-y-8 relative shadow-2xl overflow-hidden animate-in zoom-in-95">
          <button onClick={() => { setModalPagamentoAberto(false); setPixGerado(null); }} className="absolute top-6 right-6 text-zinc-600"><X className="h-6 w-6" /></button>
          <div className="text-center space-y-2">
            <h2 className="text-white font-black uppercase italic text-2xl tracking-tighter">Pagamento Seguro</h2>
            <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest italic">Plano {planoPagamento} • R$ {getValorPlano(planoPagamento).toFixed(2)}</p>
          </div>
          {!pixGerado ? (
             <Button onClick={handleGerarPixDinâmico} disabled={isGerandoPix} className="w-full bg-emerald-600 text-white font-black h-16 rounded-2xl uppercase italic tracking-widest shadow-xl shadow-emerald-600/20">{isGerandoPix ? <Loader2 className="animate-spin h-5 w-5" /> : "Gerar PIX de Pagamento"}</Button>
           ) : (
             <div className="space-y-6 animate-in fade-in zoom-in-95 text-center">
               <div className="bg-emerald-500/5 border border-emerald-500/20 p-6 rounded-3xl">
                 <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 italic">Expira em {formatarTempo(tempoPix)}</p>
                 <Button onClick={copiarPix} className="w-full bg-emerald-500 text-black font-black h-14 rounded-xl flex items-center justify-center gap-2">Copiar Código</Button>
               </div>
               <p className="text-[10px] text-zinc-500 font-black uppercase italic tracking-widest">O sistema desbloqueia em 1 min após o PIX</p>
             </div>
           )}
        </div>
      </div>
    );
  }
}