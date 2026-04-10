import { useEffect, useRef, useState } from "react";
import { 
  Users, Scissors, Trash2, Plus, Power, PowerOff, 
  Copy, FileText, Settings2, Clock, Save, 
  BarChart3, CalendarX2, ImagePlus, Loader2, Lock, 
  Zap, Crown, CheckCircle2, X, Timer, QrCode, CheckCircle, UserCircle2,
  PieChart as PieChartIcon, TrendingUp, Award, Activity
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
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, PieChart, Pie, Legend } from 'recharts';
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

const formatarMoedaBR = (valor: number) => {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor || 0);
};

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
      <Card className="relative overflow-hidden rounded-[22px] border border-white/[0.08] p-5 shadow-2xl h-full flex flex-col justify-center"
        style={{ backgroundColor: highlight ? brand : hexToRgba(brand, 0.1), backdropFilter: "blur(14px)" }}>
        <p className={cn("text-[10px] font-bold uppercase tracking-[0.2em] mb-2", highlight ? "text-black/55" : "text-white/50")}>{label}</p>
        <p className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight" style={{ color: highlight ? ctaFg : "#fff" }}>
          R$ {formatarMoedaBR(animated)}
        </p>
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

  const [imagemLogo, setImagemLogo] = useState<File | null>(null);
  const [imagemFundo, setImagemFundo] = useState<File | null>(null);
  const [isUploadingBranding, setIsUploadingBranding] = useState(false);

  // Preview URLs em tempo real
  const previewLogo = imagemLogo ? URL.createObjectURL(imagemLogo) : null;
  const previewFundo = imagemFundo ? URL.createObjectURL(imagemFundo) : null;

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
  const glass = { backgroundColor: hexToRgba(brand, 0.1), backdropFilter: "blur(14px)" } as const;

  const tabVariants = {
    enter: (dir: number) => ({ x: dir * 56, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir * -56, opacity: 0 })
  };

  useEffect(() => {
    async function carregarDadosLoja() {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) return;
      
      const { data, error } = await supabase
        .from('barbearias')
        .select('*')
        .eq('dono_id', authData.user.id)
        .single();
        
      if (data && !error) {
        setMeuSlug(data.slug);
        setIsLojaAtiva(data.ativo !== false); 
        setPlanoAtual(data.plano || "starter");
        
        // 🚀 CORREÇÃO DO LOAD: Mapeando com os nomes reais do banco de dados (pausa_inicio, dias_abertos, etc)
        setHorariosLoja({
          abertura: data.horario_abertura || "09:00", 
          fechamento: data.horario_fechamento || "18:00",
          inicio_almoco: data.pausa_inicio || "12:00", 
          fim_almoco: data.pausa_fim || "13:00",
          dias_trabalho: Array.isArray(data.dias_abertos) ? data.dias_abertos : [1, 2, 3, 4, 5, 6],
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
    if (pixGerado && tempoPix > 0) {
      interval = setInterval(() => setTempoPix(t => t - 1), 1000);
    } else if (tempoPix === 0) {
      setPixGerado(null);
    }
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
      if (!barbearia) throw new Error("Barbearia não identificada. Entre em contato com o suporte.");

      const { data, error } = await supabase.functions.invoke('mercado-pago-pix', {
        body: {
          barbearia_id: barbearia.id,
          plano: planoPagamento,
          email_dono: authData.user.email || "financeiro@cajtech.net.br"
        }
      });

      if (error || data?.error) throw new Error(data?.error || "Erro na comunicação com o servidor de pagamentos.");

      setPixGerado(data.qr_code); 
      setTempoPix(900);
      toast.success("PIX gerado com sucesso! Copie o código abaixo.");
      
    } catch (err: any) {
      toast.error(err.message || "Falha ao gerar o PIX. Verifique o console.");
    } finally {
      setIsGerandoPix(false);
    }
  };

  const copiarPix = () => {
    if (pixGerado) {
      navigator.clipboard.writeText(pixGerado);
      toast.success("Código PIX Copia e Cola salvo!");
    }
  };

  const switchSub = (next: DonoSubTab) => {
    const order: DonoSubTab[] = ["resumo", "dashboard", "automacoes", "config"];
    setSubDir(order.indexOf(next) > order.indexOf(subTab) ? 1 : -1);
    setSubTab(next);
  };

  const handleUploadImagem = async (file: File, bucket: string) => {
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.1, maxWidthOrHeight: 600 });
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

  const handleUploadImagem = async (file: File, bucket: string) => {
    try {
      // 🚀 Melhora a compressão para evitar erro de payload
      const compressed = await imageCompression(file, { maxSizeMB: 0.2, maxWidthOrHeight: 800 });
      
      // 🚀 Gera um nome limpo (evita caracteres especiais que dão Erro 400)
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      
      const { error, data } = await supabase.storage
        .from(bucket)
        .upload(fileName, compressed, { upsert: true });

      if (error) throw error;
      
      // Pega a URL pública
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
      return publicUrl;
    } catch (err) {
      console.error("Erro no Storage:", err);
      toast.error("Erro ao subir imagem. Verifique as permissões do bucket.");
      return null;
    }
  };

    onAddServico(validacao.data.nome, Number(validacao.data.preco), Number(validacao.data.duracao_minutos), urlFinal);
    setNServico({ nome: "", preco: "", duracao_minutos: "30" });
    setImagemServico(null);
    setIsUploadingServico(false);
  };

  // 🚀 CORREÇÃO DO SAVE: Enviando para o banco de dados exatamente os nomes corretos
  const handleSaveHorarios = async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return toast.error("Sessão expirada.");
    
    setIsSavingHorario(true);
    try {
      const { error } = await supabase.from('barbearias').update({
        horario_abertura: horariosLoja.abertura, 
        horario_fechamento: horariosLoja.fechamento, 
        dias_abertos: horariosLoja.dias_trabalho,    // Enviando como dias_abertos
        pausa_inicio: horariosLoja.inicio_almoco,    // Enviando como pausa_inicio
        pausa_fim: horariosLoja.fim_almoco,          // Enviando como pausa_fim
        datas_fechadas: horariosLoja.datas_fechadas
      }).eq('dono_id', authData.user.id);
      
      if (error) throw error;
      toast.success("Configurações de horário salvas com sucesso!");
    } catch (err) { 
      toast.error("Erro ao salvar horários."); 
    } finally { 
      setIsSavingHorario(false); 
    }
  };

  const handleSaveBranding = async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return toast.error("Sessão expirada.");

    if (!imagemLogo && !imagemFundo) return toast.info("Nenhuma imagem selecionada para salvar.");

    setIsUploadingBranding(true);
    try {
      const updates: any = {};
      if (imagemLogo) {
        const urlLogo = await handleUploadImagem(imagemLogo, 'barbearias');
        if (urlLogo) updates.url_logo = urlLogo;
      }
      if (imagemFundo) {
        const urlFundo = await handleUploadImagem(imagemFundo, 'barbearias');
        if (urlFundo) updates.url_fundo = urlFundo;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from('barbearias').update(updates).eq('dono_id', authData.user.id);
        if (error) throw error;
        toast.success("Identidade visual atualizada com sucesso!");
        setImagemLogo(null);
        setImagemFundo(null);
      }
    } catch (err) {
      toast.error("Erro ao salvar imagens de identidade visual.");
    } finally {
      setIsUploadingBranding(false);
    }
  };

  const toggleDiaSemana = (idDia: number) => {
    setHorariosLoja(prev => {
      const isSelected = prev.dias_trabalho.includes(idDia);
      if (isSelected && prev.dias_trabalho.length === 1) {
        toast.error("A barbearia precisa abrir pelo menos um dia na semana!");
        return prev;
      }
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

  if (isLojaAtiva === false) return renderBloqueioManual();
  if (fasePagamento === 4) return renderBloqueioInadimplencia();

  return (
    <div className="flex flex-col gap-6 pb-40 pt-4 w-full overflow-x-hidden text-white">
      {/* SEÇÃO DE ALERTAS */}
      <div className="px-4 flex flex-col gap-3">
        {renderBannersAlerta()}
      </div>

      {/* NAVEGAÇÃO */}
      <div className="px-4">
        <div className="flex rounded-2xl border border-white/[0.08] p-1.5 gap-1.5 shadow-2xl" style={glass}>
          {([
            { id: "resumo", label: "Resumo", Icon: FileText },
            { id: "dashboard", label: "Métricas", Icon: BarChart3 },
            { id: "automacoes", label: "VIP", Icon: Zap },
            { id: "config", label: "Ajustes", Icon: Settings2 },
          ] as const).map(({ id, label, Icon }) => (
            <MotionButton key={id} type="button" variant="ghost" whileTap={{ scale: 0.95 }} onClick={() => switchSub(id as DonoSubTab)}
              className={cn("flex-1 h-12 rounded-xl text-[10px] font-bold uppercase tracking-wide px-1 transition-colors", subTab === id ? "shadow-lg border-0" : "text-white/60 hover:text-white")}
              style={subTab === id ? { backgroundColor: brand, color: ctaFg } : undefined}>
              <div className="flex flex-col items-center gap-1">
                <Icon className="h-4 w-4" />
                <span className="hidden xs:inline">{label}</span>
              </div>
            </MotionButton>
          ))}
        </div>
      </div>

      {/* CONTEÚDO DAS ABAS */}
      <div className="px-4">
        <AnimatePresence mode="wait" initial={false} custom={subDir}>
          <motion.div key={subTab} custom={subDir} variants={tabVariants} initial="enter" animate="center" exit="exit" 
            transition={{ type: "spring", stiffness: 400, damping: 36 }} className="flex flex-col gap-8">
            
            {subTab === "resumo" && renderTabResumo()}
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

  /** ==========================================
   * RENDERIZAÇÃO DAS ABAS
   * ========================================== */

  function renderBannersAlerta() {
    if (planoAtual === "starter" && fasePagamento === 1) {
      return (
        <Button variant="outline" onClick={() => setModalUpgradeAberto(true)} className="w-full bg-emerald-500/5 border-emerald-500/20 text-emerald-500 font-black text-[10px] uppercase h-10 rounded-xl gap-2">
          <Crown className="h-4 w-4" /> Evoluir para o Plano PRO
        </Button>
      );
    }
    if (fasePagamento === 2) {
      return (
        <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-[20px] flex items-center justify-between text-yellow-500 text-[10px] font-black uppercase">
          <span className="flex items-center gap-2"><span className="animate-pulse h-2.5 w-2.5 bg-yellow-500 rounded-full" /> Vencimento em {diasRestantes} dias</span>
          <Button size="sm" onClick={() => handleAbrirCheckout('renovacao')} className="bg-yellow-500 text-black h-10 px-6 rounded-xl font-black">Pagar</Button>
        </div>
      );
    }
    if (fasePagamento === 3) {
      return (
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-[20px] flex flex-col sm:flex-row gap-3 items-center justify-between text-red-500 text-[10px] font-black uppercase">
          <span className="flex items-center gap-2"><span className="animate-pulse h-2.5 w-2.5 bg-red-500 rounded-full" /> Vencido: {3 + (diasRestantes || 0)} dias</span>
          <Button size="sm" onClick={() => handleAbrirCheckout('renovacao')} className="bg-red-600 text-white h-10 px-6 rounded-xl shadow-lg shadow-red-500/20 font-black">Regularizar</Button>
        </div>
      );
    }
    return null;
  }

  function renderTabResumo() {
    const slug = meuSlug || "seu-slug";
    
    // 🚀 AGORA ELE PEGA O LINK CERTO DO AMBIENTE QUE VOCÊ ESTÁ TESTANDO!
    const linkCompleto = `${window.location.origin}/agendar/${slug}`;
    const linkDisplay = `${window.location.host}/agendar/${slug}`;

    return (
      <>
        <section>
          <Card className="relative overflow-hidden rounded-[22px] border border-white/[0.08] p-5 shadow-2xl" style={glass}>
            <div className="absolute -right-4 -top-4 opacity-[0.07]"><Scissors className="h-24 w-24 rotate-12" style={{ color: brand }} /></div>
            <p className="text-[10px] uppercase font-bold tracking-[0.25em] mb-3" style={{ color: brand }}>Link de Agendamento</p>
            <div className="rounded-xl border border-white/[0.08] bg-black/35 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-md">
              <code className="text-[11px] text-zinc-300 font-mono truncate">{linkDisplay}</code>
              <Button size="sm" className="h-10 px-6 rounded-xl font-black uppercase text-[10px] w-full sm:w-auto" style={{ backgroundColor: brand, color: ctaFg }}
                onClick={() => { navigator.clipboard.writeText(linkCompleto); toast.success("Link copiado!"); }}>
                <Copy className="h-4 w-4 mr-2" /> Copiar Link
              </Button>
            </div>
          </Card>
        </section>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <StatCard label="Entradas hoje" value={faturamentoHoje} brand={brand} />
          <StatCard label="Lucro real hoje" value={lucroRealHoje} brand={brand} highlight />
          <StatCard label="Faturamento mês" value={faturamentoMensal} brand={brand} />
          <StatCard label="Comissões hoje" value={comissoesAPagarHoje} brand={brand} />
        </div>
      </>
    );
  }

  function renderTabDashboard() {
    const dataEquipe = comissaoPorBarbeiroHoje.map((item: any) => ({ 
      name: item.barbeiro?.nome?.split(' ')[0] || "...", 
      Total: Number(item.total) || 0 
    })).sort((a: any, b: any) => b.Total - a.Total);
    const hasDataEquipe = dataEquipe.some((d: any) => d.Total > 0);

    const faturamento = Number(faturamentoHoje) || 0;
    const lucro = Number(lucroRealHoje) || 0;
    const comissao = Number(comissoesAPagarHoje) || 0;
    
    const margem = faturamento > 0 ? Math.round((lucro / faturamento) * 100) : 0;
    const topBarbeiro = hasDataEquipe ? dataEquipe[0] : null;
    const barbeirosAtivosHoje = dataEquipe.filter((d: any) => d.Total > 0).length;
    const mediaPorBarbeiro = barbeirosAtivosHoje > 0 ? formatarMoedaBR(faturamento / barbeirosAtivosHoje) : "0,00";

    const dataFinanceiro = [
      { name: 'Lucro Líquido', value: lucro },
      { name: 'Comissões Pagas', value: comissao }
    ];
    const hasDataFinanceiro = lucro > 0 || comissao > 0;
    const COLORS = [brand, hexToRgba(brand, 0.25)];

    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="p-4 rounded-[20px] border border-white/[0.08]" style={glass}>
            <div className="flex items-center gap-1.5 mb-2 opacity-60">
              <TrendingUp className="h-3 w-3" />
              <p className="text-[9px] font-black uppercase tracking-widest">Margem de Lucro</p>
            </div>
            <p className="text-xl font-black tabular-nums" style={{ color: brand }}>{margem}%</p>
          </Card>
          
          <Card className="p-4 rounded-[20px] border border-white/[0.08]" style={glass}>
            <div className="flex items-center gap-1.5 mb-2 opacity-60">
              <Award className="h-3 w-3" />
              <p className="text-[9px] font-black uppercase tracking-widest">Destaque do Dia</p>
            </div>
            <p className="text-xl font-black truncate text-white">{topBarbeiro ? topBarbeiro.name : '-'}</p>
          </Card>

          <Card className="p-4 rounded-[20px] border border-white/[0.08] col-span-2 sm:col-span-1" style={glass}>
            <div className="flex items-center gap-1.5 mb-2 opacity-60">
              <Activity className="h-3 w-3" />
              <p className="text-[9px] font-black uppercase tracking-widest">Média / Profissional</p>
            </div>
            <p className="text-xl font-black text-white tabular-nums">R$ {mediaPorBarbeiro}</p>
          </Card>
        </div>

        <Card className="p-5 rounded-[22px] border border-white/[0.08] shadow-xl relative" style={glass}>
          <div className="flex items-center gap-2 mb-6">
             <Users className="h-4 w-4 opacity-50" />
             <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Produção por Profissional</p>
          </div>
          {!hasDataEquipe ? (
            <div className="flex flex-col items-center justify-center h-40 text-center space-y-3 opacity-60">
               <BarChart3 className="h-8 w-8 text-zinc-600 mb-1" />
               <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Nenhum corte registrado hoje</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <BarChart data={dataEquipe} margin={{ left: -30 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="name" stroke="#777" fontSize={10} axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="#777" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '16px', fontSize: '12px' }} itemStyle={{ color: brand }} formatter={(value: number) => [`R$ ${formatarMoedaBR(value)}`, 'Produção']} />
                  <Bar dataKey="Total" radius={[6, 6, 6, 6]} maxBarSize={45}>
                    {dataEquipe.map((_, i) => <Cell key={i} fill={i === 0 ? brand : hexToRgba(brand, 0.4)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5 rounded-[22px] border border-white/[0.08] shadow-xl relative" style={glass}>
          <div className="flex items-center gap-2 mb-2">
             <PieChartIcon className="h-4 w-4 opacity-50" />
             <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Distribuição (Lucro vs Comissão)</p>
          </div>
          {!hasDataFinanceiro ? (
            <div className="flex flex-col items-center justify-center h-48 text-center space-y-3 opacity-60">
               <PieChartIcon className="h-8 w-8 text-zinc-600 mb-1" />
               <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Sem faturamento no momento</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dataFinanceiro} cx="50%" cy="45%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                    {dataFinanceiro.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '16px', fontSize: '12px' }} itemStyle={{ color: '#fff' }} formatter={(value: number) => [`R$ ${formatarMoedaBR(value)}`, '']} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(value) => <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    );
  }

  function renderTabVIP() {
    return (
      <section className="space-y-4 animate-in fade-in duration-500">
        <h3 className="font-black text-white uppercase text-xl italic flex items-center gap-2">
          <Zap className="h-5 w-5" style={{ color: brand }} /> Automações VIP
        </h3>
        {planoAtual === "starter" ? (
          <Card className="p-8 rounded-[22px] border border-white/[0.08] text-center flex flex-col items-center gap-4" style={glass}>
            <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
               <Lock className="h-8 w-8 text-zinc-600" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-white uppercase italic">Recursos Bloqueados</h4>
              <p className="text-sm text-zinc-400 max-w-[220px] mx-auto">Sua barbearia está no plano Starter. Evolua para o PRO para liberar:</p>
            </div>
            <div className="space-y-3 w-full text-left bg-black/30 p-5 rounded-2xl border border-white/5">
              <p className="text-xs text-emerald-500 font-black uppercase flex items-center gap-2"><CheckCircle2 className="h-4 w-4"/> Lembretes WhatsApp <span className="ml-auto text-[8px] bg-white/10 px-2 py-1 rounded-full tracking-widest">EM BREVE</span></p>
              <p className="text-xs text-emerald-500 font-black uppercase flex items-center gap-2"><CheckCircle2 className="h-4 w-4"/> Clube de Assinatura <span className="ml-auto text-[8px] bg-white/10 px-2 py-1 rounded-full tracking-widest">EM BREVE</span></p>
              <p className="text-xs text-emerald-500 font-black uppercase flex items-center gap-2"><CheckCircle2 className="h-4 w-4"/> Barbeiros Ilimitados</p>
            </div>
            <Button onClick={() => setModalUpgradeAberto(true)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase h-14 rounded-xl shadow-lg shadow-emerald-600/20 text-sm">Evoluir e Desbloquear</Button>
          </Card>
        ) : (
          <div className="grid gap-4">
             <Card onClick={() => toast.info("🚀 Funcionalidade em fase final de testes.")} className="p-6 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 cursor-pointer relative group transition-all hover:bg-emerald-500/10">
               <span className="absolute top-4 right-4 text-[9px] bg-emerald-500/20 text-emerald-500 px-3 py-1 rounded-full font-black uppercase tracking-widest">Em Breve</span>
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-emerald-500/10 rounded-full flex items-center justify-center"><Zap className="h-6 w-6 text-emerald-500" /></div>
                  <div>
                    <h4 className="font-black text-sm uppercase">Lembretes Automáticos</h4>
                    <p className="text-xs text-zinc-400 font-medium mt-1">WhatsApp disparado 2h antes de cada agendamento.</p>
                  </div>
               </div>
             </Card>

             <Card onClick={() => toast.info("🚀 Em fase de homologação.")} className="p-6 rounded-3xl border border-yellow-500/20 bg-yellow-500/5 cursor-pointer relative group transition-all hover:bg-yellow-500/10">
               <span className="absolute top-4 right-4 text-[9px] bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-full font-black uppercase tracking-widest">Em Breve</span>
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-yellow-500/10 rounded-full flex items-center justify-center"><Crown className="h-6 w-6 text-yellow-500" /></div>
                  <div>
                    <h4 className="font-black text-sm uppercase">Clube de Assinatura</h4>
                    <p className="text-xs text-zinc-400 font-medium mt-1">Crie planos mensais recorrentes para seus clientes VIP.</p>
                  </div>
               </div>
             </Card>
          </div>
        )}
      </section>
    );
  }

  function renderTabConfig() {
    return (
      <section className="space-y-10 animate-in fade-in duration-500 pb-10">
        
        {/* BLOCO 1: HORÁRIOS COMPLETO */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Clock className="h-5 w-5" style={{ color: brand }} />
            <h3 className="font-black text-white uppercase text-lg tracking-tight italic">Horário de Funcionamento</h3>
          </div>
          <Card className="p-5 sm:p-6 rounded-[22px] border border-white/[0.08] shadow-xl space-y-6" style={glass}>
            
            <div className="space-y-3">
              <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Dias de Atendimento</p>
              <div className="flex justify-between gap-1.5 sm:gap-2">
                {DIAS_SEMANA.map((dia) => {
                  const isSelected = horariosLoja.dias_trabalho.includes(dia.id);
                  return (
                    <button key={dia.id} onClick={() => toggleDiaSemana(dia.id)}
                      className={cn("h-12 flex-1 rounded-xl text-sm font-black transition-all border", isSelected ? "border-transparent shadow-lg" : "bg-black/30 border-white/[0.08] text-white/40")}
                      style={isSelected ? { backgroundColor: brand, color: ctaFg } : {}}>
                      {dia.label}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-[10px] text-white/50 uppercase font-bold ml-1 tracking-widest">Abertura</label>
                <input type="time" value={horariosLoja.abertura} onChange={e => setHorariosLoja({...horariosLoja, abertura: e.target.value})} className="w-full rounded-xl border border-white/[0.08] bg-black/30 p-4 text-white outline-none focus:border-white/20 text-base" style={{colorScheme: 'dark'}} />
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-[10px] text-white/50 uppercase font-bold ml-1 tracking-widest">Fechamento</label>
                <input type="time" value={horariosLoja.fechamento} onChange={e => setHorariosLoja({...horariosLoja, fechamento: e.target.value})} className="w-full rounded-xl border border-white/[0.08] bg-black/30 p-4 text-white outline-none focus:border-white/20 text-base" style={{colorScheme: 'dark'}} />
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.05] space-y-3">
              <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Pausa (Almoço / Descanso)</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] text-white/50 uppercase font-bold ml-1 tracking-widest">Início Pausa</label>
                  <input type="time" value={horariosLoja.inicio_almoco} onChange={e => setHorariosLoja({...horariosLoja, inicio_almoco: e.target.value})} className="w-full rounded-xl border border-white/[0.08] bg-black/30 p-4 text-white outline-none focus:border-white/20 text-base" style={{colorScheme: 'dark'}} />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] text-white/50 uppercase font-bold ml-1 tracking-widest">Fim Pausa</label>
                  <input type="time" value={horariosLoja.fim_almoco} onChange={e => setHorariosLoja({...horariosLoja, fim_almoco: e.target.value})} className="w-full rounded-xl border border-white/[0.08] bg-black/30 p-4 text-white outline-none focus:border-white/20 text-base" style={{colorScheme: 'dark'}} />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.05] space-y-3">
              <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Adicionar dia Fechado (Feriado)</p>
              <div className="flex gap-2">
                 <input type="date" value={novaDataFechada} onChange={(e) => setNovaDataFechada(e.target.value)} className="flex-1 rounded-xl border border-white/[0.08] bg-black/30 p-4 text-base text-white outline-none focus:border-white/20" style={{ colorScheme: 'dark' }} />
                 <Button onClick={handleAddDataFechada} className="h-14 w-14 shrink-0 rounded-xl" style={{ backgroundColor: brand, color: ctaFg }}>
                   <Plus className="h-6 w-6 stroke-[3px]" />
                 </Button>
              </div>
              {horariosLoja.datas_fechadas.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {horariosLoja.datas_fechadas.map(data => (
                    <div key={data} className="flex items-center gap-2 bg-black/40 border border-white/[0.08] pl-4 pr-1 py-1 rounded-full">
                      <span className="text-xs font-bold">{formatarDataBR(data)}</span>
                      <button onClick={() => handleRemoveDataFechada(data)} className="h-8 w-8 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={handleSaveHorarios} disabled={isSavingHorario} className="w-full bg-white/10 hover:bg-white/20 text-white h-14 rounded-xl font-black uppercase text-sm tracking-wider mt-4">
              {isSavingHorario ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Save className="h-5 w-5 mr-2" />} 
              {isSavingHorario ? "Salvando..." : "Salvar Horários"}
            </Button>
          </Card>
        </div>

        {/* BLOCO 2: GESTÃO DE EQUIPE */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Users className="h-5 w-5" style={{ color: brand }} />
            <h3 className="font-black text-white uppercase text-lg tracking-tight italic">Equipe de Barbeiros</h3>
          </div>
          <Card className="p-5 sm:p-6 rounded-[22px] border border-white/[0.08] space-y-4" style={glass}>
            <Input placeholder="Nome completo do barbeiro" className="bg-black/30 border-white/10 h-14 rounded-xl text-base px-4" value={nBarbeiro.nome} onChange={e => setNBarbeiro({...nBarbeiro, nome: e.target.value})} />
            
            <label className="flex items-center justify-center gap-2 h-14 rounded-xl border border-dashed border-white/20 bg-black/20 text-xs uppercase font-black cursor-pointer hover:bg-white/5 transition-colors">
              {imagemBarbeiro ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <UserCircle2 className="h-5 w-5 opacity-50" />} 
              <span className="opacity-80">{imagemBarbeiro ? "Foto Selecionada: " + imagemBarbeiro.name.substring(0, 15) : "Anexar Foto do Perfil (Opcional)"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => setImagemBarbeiro(e.target.files?.[0] || null)} />
            </label>

            <div className="flex flex-col sm:flex-row gap-3">
              <Input placeholder="E-mail de acesso" className="flex-1 bg-black/30 border-white/10 h-14 rounded-xl text-base px-4" value={nBarbeiro.email} onChange={e => setNBarbeiro({...nBarbeiro, email: e.target.value})} />
              <div className="relative w-full sm:w-32">
                 <span className="absolute right-4 top-4 text-zinc-500 font-black">%</span>
                 <Input placeholder="Comissão" type="number" className="w-full bg-black/30 border-white/10 h-14 rounded-xl text-base px-4 pr-10" value={nBarbeiro.comissao} onChange={e => setNBarbeiro({...nBarbeiro, comissao: e.target.value})} />
              </div>
            </div>
            <Input placeholder="Senha de acesso" type="password" className="bg-black/30 border-white/10 h-14 rounded-xl text-base px-4" value={nBarbeiro.senha} onChange={e => setNBarbeiro({...nBarbeiro, senha: e.target.value})} />
            <Button onClick={handleAddBarbeiroComFotoETrava} disabled={isUploadingBarbeiro} className="w-full h-14 rounded-xl font-black uppercase text-sm tracking-wider shadow-lg shadow-black/40" style={{ backgroundColor: brand, color: ctaFg }}>
              {isUploadingBarbeiro ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Plus className="h-5 w-5 mr-2" />}
              {isUploadingBarbeiro ? "Processando..." : "Cadastrar Profissional"}
            </Button>
          </Card>
          
          <div className="grid gap-3">
             {barbeiros.map((b: any) => (
               <div key={b.id} className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl flex items-center justify-between group">
                 <div className="flex items-center gap-4">
                    {b.url_foto ? (
                      <img src={b.url_foto} alt={b.nome} className={cn("h-12 w-12 rounded-full object-cover border-2", b.ativo ? "border-emerald-500" : "border-red-500 grayscale opacity-50")} />
                    ) : (
                      <div className={cn("h-12 w-12 rounded-full flex items-center justify-center text-lg font-black", b.ativo ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/50" : "bg-red-500/20 text-red-500 border border-red-500/50")}>
                        {b.nome.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className={cn("text-base font-black uppercase italic tracking-tight", !b.ativo && "opacity-50 line-through")}>{b.nome}</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Comissão: <span className="text-white">{b.comissao_pct}%</span></p>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <Button size="icon" variant="ghost" className="h-12 w-12 text-zinc-500 hover:text-white hover:bg-white/10 rounded-xl" onClick={() => onToggleBarbeiroStatus(b.id, !b.ativo)}>
                      {b.ativo ? <PowerOff className="h-6 w-6" /> : <Power className="h-6 w-6" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-12 w-12 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl" disabled={b.ativo} onClick={() => onRemoveBarbeiro(b.id)}>
                      <Trash2 className="h-6 w-6" />
                    </Button>
                 </div>
               </div>
             ))}
          </div>
        </div>

        {/* BLOCO 3: GESTÃO DE SERVIÇOS */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Scissors className="h-5 w-5" style={{ color: brand }} />
            <h3 className="font-black text-white uppercase text-lg tracking-tight italic">Serviços e Tabela de Preços</h3>
          </div>
          <Card className="p-5 sm:p-6 rounded-[22px] border border-white/[0.08] space-y-4" style={glass}>
            <Input placeholder="Nome do serviço (ex: Corte Degradê)" className="bg-black/30 border-white/10 h-14 rounded-xl text-base px-4" value={nServico.nome} onChange={e => setNServico({...nServico, nome: e.target.value})} />
            <label className="flex items-center justify-center gap-2 h-14 rounded-xl border border-dashed border-white/20 bg-black/20 text-xs uppercase font-black cursor-pointer hover:bg-white/5 transition-colors">
              {imagemServico ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <ImagePlus className="h-5 w-5 opacity-50" />} 
              <span className="opacity-80">{imagemServico ? "Foto: " + imagemServico.name.substring(0, 15) : "Anexar Foto Ilustrativa"}</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => setImagemServico(e.target.files?.[0] || null)} />
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <span className="absolute left-4 top-4 text-zinc-500 font-bold">R$</span>
                <Input placeholder="0,00" type="number" className="bg-black/30 border-white/10 h-14 pl-12 rounded-xl text-base" value={nServico.preco} onChange={e => setNServico({...nServico, preco: e.target.value})} />
              </div>
              <div className="relative w-32 shrink-0">
                <span className="absolute right-4 top-4 text-zinc-500 font-bold text-xs uppercase">Min</span>
                <Input placeholder="30" type="number" className="bg-black/30 border-white/10 h-14 pr-12 pl-4 rounded-xl text-base" value={nServico.duracao_minutos} onChange={e => setNServico({...nServico, duracao_minutos: e.target.value})} />
              </div>
              <Button onClick={handleAddServicoComFoto} disabled={isUploadingServico} className="h-14 w-14 rounded-xl shrink-0 shadow-lg" style={{ backgroundColor: brand, color: ctaFg }}>
                {isUploadingServico ? <Loader2 className="animate-spin h-6 w-6" /> : <Plus className="h-6 w-6" />}
              </Button>
            </div>
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
             {servicos.map((s: any) => (
               <div key={s.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between group">
                 <div className="flex items-center gap-4">
                   {s.url_imagem ? (
                     <img src={s.url_imagem} className="h-12 w-12 rounded-xl object-cover border border-white/10" />
                   ) : (
                     <div className="h-12 w-12 rounded-xl bg-black/30 flex items-center justify-center border border-white/5">
                        <Scissors className="h-5 w-5 text-white/20" />
                     </div>
                   )}
                   <div>
                     <p className="text-sm font-black uppercase italic tracking-tight">{s.nome}</p>
                     <p className="text-[11px] font-black mt-0.5 tracking-widest uppercase" style={{ color: brand }}>
                       R$ {formatarMoedaBR(s.preco)} <span className="text-zinc-500 font-bold ml-1 opacity-70">• {s.duracao_minutos} min</span>
                     </p>
                   </div>
                 </div>
                 <Button size="icon" variant="ghost" className="h-12 w-12 text-zinc-600 hover:text-red-500 rounded-xl" onClick={() => onRemoveServico(s.id)}>
                    <Trash2 className="h-6 w-6" />
                 </Button>
               </div>
             ))}
          </div>
        </div>

        {/* 🚀 NOVO BLOCO 4: IDENTIDADE VISUAL */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <ImagePlus className="h-5 w-5" style={{ color: brand }} />
            <h3 className="font-black text-white uppercase text-lg tracking-tight italic">Identidade Visual</h3>
          </div>
          <Card className="p-5 sm:p-6 rounded-[22px] border border-white/[0.08] shadow-xl space-y-5" style={glass}>
            
            <div className="space-y-3">
              <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Logo da Barbearia</p>
              
              {/* Preview Dinâmico da Logo */}
              {previewLogo && (
                <div className="h-20 w-20 rounded-2xl border border-white/20 overflow-hidden mb-2 shadow-lg">
                  <img src={previewLogo} alt="Preview Logo" className="h-full w-full object-cover" />
                </div>
              )}
              
              <label className="flex items-center justify-center gap-2 h-14 rounded-xl border border-dashed border-white/20 bg-black/20 text-[10px] uppercase font-black cursor-pointer hover:bg-white/5 transition-colors">
                {imagemLogo ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <ImagePlus className="h-4 w-4 opacity-50" />} 
                <span className="opacity-80">{imagemLogo ? "Logo Selecionada (Clique para trocar)" : "Anexar Nova Logo"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => setImagemLogo(e.target.files?.[0] || null)} />
              </label>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Imagem de Fundo (Capa do App)</p>
              
              {/* Preview Dinâmico do Fundo */}
              {previewFundo && (
                <div className="h-32 w-full rounded-2xl border border-white/20 overflow-hidden mb-2 shadow-lg relative">
                  <img src={previewFundo} alt="Preview Fundo" className="h-full w-full object-cover opacity-60" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white shadow-black drop-shadow-md">Preview do Fundo</span>
                  </div>
                </div>
              )}

              <label className="flex items-center justify-center gap-2 h-14 rounded-xl border border-dashed border-white/20 bg-black/20 text-[10px] uppercase font-black cursor-pointer hover:bg-white/5 transition-colors">
                {imagemFundo ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <ImagePlus className="h-4 w-4 opacity-50" />} 
                <span className="opacity-80">{imagemFundo ? "Fundo Selecionado (Clique para trocar)" : "Anexar Imagem de Fundo"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => setImagemFundo(e.target.files?.[0] || null)} />
              </label>
            </div>

            <Button onClick={handleSaveBranding} disabled={isUploadingBranding} className="w-full h-14 rounded-2xl font-black uppercase tracking-wider shadow-lg shadow-black/40 mt-2" style={{ backgroundColor: brand, color: ctaFg }}>
              {isUploadingBranding ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Save className="h-5 w-5 mr-2" />}
              {isUploadingBranding ? "Enviando imagens..." : "Salvar Identidade Visual"}
            </Button>
          </Card>
        </div>

      </section>
    );
  }

  function renderBloqueioManual() {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
        <div className="h-28 w-28 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-6 shadow-2xl">
          <Lock className="h-12 w-12 text-red-500" />
        </div>
        <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-3">Acesso Suspenso</h2>
        <p className="text-zinc-400 max-w-md text-sm leading-relaxed mb-6">Sua barbearia encontra-se pendente de regularização. Fale com nosso suporte.</p>
        <Button onClick={() => window.open('https://wa.me/5517992051576')} className="bg-zinc-800 h-14 px-8 rounded-2xl font-black uppercase tracking-widest">Suporte CAJ TECH</Button>
      </div>
    );
  }

  function renderBloqueioInadimplencia() {
    return (
      <div className="flex flex-col items-center justify-center min-h-[85vh] px-4 py-10">
        <div className="bg-zinc-900 border border-red-500/40 p-8 rounded-[40px] max-w-md w-full text-center space-y-6 shadow-[0_0_80px_rgba(239,68,68,0.15)] relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
           <Lock className="w-16 h-16 text-red-500 mx-auto opacity-20 absolute -top-4 -right-4 rotate-12" />
           <div className="space-y-2 relative z-10">
             <h2 className="text-3xl font-black text-white uppercase italic leading-none">Sistema<br/>Bloqueado</h2>
             <p className="text-zinc-400 text-sm font-medium">Renove sua assinatura para religar sua agenda online imediatamente.</p>
           </div>
           <div className="bg-black/50 border border-zinc-800 p-5 rounded-3xl relative z-10">
             <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Plano Atual: {planoAtual}</p>
             <p className="text-4xl font-black text-white italic">R$ {formatarMoedaBR(getValorPlano(planoAtual))}</p>
           </div>
           {!pixGerado ? (
             <Button onClick={() => handleAbrirCheckout('renovacao')} disabled={isGerandoPix} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black h-16 rounded-2xl shadow-xl uppercase italic tracking-widest text-base relative z-10">
               <span className="flex items-center justify-center gap-2"><QrCode className="h-5 w-5" /> Pagar via PIX Agora</span>
             </Button>
           ) : (
             <div className="space-y-4 animate-in slide-in-from-bottom-4 relative z-10">
               <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl">
                 <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center justify-center gap-2 mb-2">
                   <Timer className="h-4 w-4 animate-pulse" /> Expira em {formatarTempo(tempoPix)}
                 </p>
                 <Button onClick={copiarPix} className="w-full mt-3 bg-emerald-500 text-black hover:bg-emerald-400 font-black h-12 rounded-xl flex items-center justify-center gap-2">
                    <Copy className="h-4 w-4" /> Copiar Código PIX
                 </Button>
               </div>
               <p className="text-[9px] text-zinc-500 font-medium italic">O sistema será desbloqueado automaticamente até 1 minuto após o pagamento.</p>
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
        <div className="w-full max-w-4xl py-10 mt-10">
          <div className="flex justify-between items-center mb-8 px-4">
            <h2 className="text-white font-black uppercase italic text-2xl tracking-tighter">Planos CAJ TECH</h2>
            <button onClick={() => setModalUpgradeAberto(false)} className="bg-white/5 h-12 w-12 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"><X className="text-zinc-500 h-6 w-6" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4">
             {/* STARTER */}
             <Card className="p-6 bg-black border-zinc-800 rounded-3xl flex flex-col justify-between opacity-60">
                <div>
                  <h3 className="text-zinc-500 font-black uppercase text-xs tracking-widest">Starter</h3>
                  <p className="text-4xl font-black text-white my-4 italic">R$ 50<span className="text-xs opacity-30">/mês</span></p>
                  <ul className="text-[11px] text-zinc-400 space-y-3 mb-6">
                    <li className="flex gap-2 font-bold uppercase"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Até 2 Barbeiros</li>
                    <li className="flex gap-2 font-bold uppercase"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Link de Agendamento</li>
                  </ul>
                </div>
                <Button variant="outline" className="border-zinc-800 text-zinc-500 uppercase font-black text-[10px] h-12 rounded-xl" disabled>Seu Plano Atual</Button>
             </Card>
             {/* PRO */}
             <Card className="p-6 bg-emerald-500/5 border-emerald-500 border-2 rounded-3xl relative md:scale-105 shadow-2xl z-10 flex flex-col justify-between">
                <div>
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-[9px] font-black uppercase px-4 py-1 rounded-full shadow-lg">Mais Vendido</span>
                  <h3 className="text-emerald-500 font-black uppercase text-xs tracking-widest">PRO</h3>
                  <p className="text-5xl font-black text-white my-4 italic">R$ 99<span className="text-xs opacity-50">,90/mês</span></p>
                  <ul className="text-[11px] text-zinc-300 space-y-3 mb-6">
                      <li className="flex gap-2 font-bold uppercase"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Barbeiros Ilimitados</li>
                      <li className="flex gap-2 font-bold uppercase"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> WhatsApp VIP (Automação)</li>
                      <li className="flex gap-2 font-bold uppercase"><CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Clube de Assinatura</li>
                  </ul>
                </div>
                {planoAtual === 'pro' ? (
                   <Button variant="outline" className="w-full bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-black uppercase h-14 rounded-xl" disabled>Seu Plano Atual</Button>
                ) : (
                   <Button onClick={() => handleAbrirCheckout('upgrade', 'pro')} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase h-14 rounded-xl shadow-lg">Evoluir e Pagar</Button>
                )}
             </Card>
             {/* ELITE */}
             <Card className="p-6 bg-black border-zinc-800 rounded-3xl flex flex-col justify-between">
                <div>
                  <h3 className="text-yellow-500 font-black uppercase text-xs tracking-widest flex items-center gap-2"><Crown className="h-4 w-4" /> Elite</h3>
                  <p className="text-4xl font-black text-white my-4 italic">R$ 497<span className="text-xs opacity-30">/mês</span></p>
                  <ul className="text-[11px] text-zinc-400 space-y-3 mb-6">
                    <li className="flex gap-2 font-bold uppercase"><CheckCircle2 className="h-4 w-4 text-yellow-500 shrink-0" /> Tudo do Pro +</li>
                    <li className="flex gap-2 font-bold uppercase"><CheckCircle2 className="h-4 w-4 text-yellow-500 shrink-0" /> Marketing Completo</li>
                    <li className="flex gap-2 font-bold uppercase"><CheckCircle2 className="h-4 w-4 text-yellow-500 shrink-0" /> Gestão de Tráfego Pago</li>
                  </ul>
                </div>
                {planoAtual === 'elite' ? (
                   <Button variant="outline" className="border-zinc-800 text-zinc-500 uppercase font-black text-[10px] h-12 rounded-xl" disabled>Seu Plano Atual</Button>
                ) : (
                   <Button onClick={() => handleAbrirCheckout('upgrade', 'elite')} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-black uppercase h-14 rounded-xl shadow-lg">Evoluir e Pagar</Button>
                )}
             </Card>
          </div>
        </div>
      </div>
    );
  }

  function renderModalRenovacao() {
    if (!modalPagamentoAberto) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
        <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-[32px] p-8 space-y-6 relative shadow-2xl overflow-hidden animate-in zoom-in-95">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
          <button onClick={() => { setModalPagamentoAberto(false); setPixGerado(null); }} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X className="h-6 w-6" /></button>
          
          <div className="text-center space-y-2">
            <h2 className="text-white font-black uppercase italic text-2xl tracking-tighter">Pagamento Seguro</h2>
            <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">Plano {planoPagamento} • R$ {formatarMoedaBR(getValorPlano(planoPagamento))}</p>
          </div>

          {!pixGerado ? (
             <Button 
                onClick={handleGerarPixDinâmico} 
                disabled={isGerandoPix}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black h-14 rounded-2xl uppercase italic shadow-lg shadow-emerald-600/20"
             >
               {isGerandoPix ? <Loader2 className="animate-spin h-5 w-5" /> : "Gerar PIX de Pagamento"}
             </Button>
           ) : (
             <div className="space-y-4 animate-in fade-in zoom-in-95">
               <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl text-center">
                 <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center justify-center gap-2 mb-3">
                   <CheckCircle className="h-4 w-4" /> PIX Gerado com Sucesso
                 </p>
                 <Button onClick={copiarPix} className="w-full bg-emerald-500 text-black hover:bg-emerald-400 font-black h-14 rounded-xl flex items-center gap-2 text-sm">
                    <Copy className="h-5 w-5" /> Copiar Código
                 </Button>
                 <p className="text-[10px] font-bold text-emerald-500/70 uppercase mt-3">Expira em {formatarTempo(tempoPix)}</p>
               </div>
               <p className="text-[9px] text-zinc-500 text-center font-medium italic">A tela será atualizada sozinha após o pagamento.</p>
             </div>
           )}
        </div>
      </div>
    );
  }
}