import { useCallback, useMemo, useState, useEffect } from "react";
import {
  FileText,
  BarChart3,
  Zap,
  Settings2,
  Megaphone,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { barbeiroSchema, servicoSchema } from "@/lib/schemas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { hexToRgba, contrastTextOnBrand } from "@/lib/branding";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import imageCompression from "browser-image-compression";
import { useDonoData } from "@/hooks/useDonoData";
import { calcularStatsFiltrados } from "@/lib/dono-stats";
import { DonoSubTab, PlanoType, BarbeiroForm, ServicoForm } from "@/types/dono";
import { DonoTabResumo } from "@/components/dono/DonoTabResumo";
import { DonoTabDashboard } from "@/components/dono/DonoTabDashboard";
import { DonoTabVIP } from "@/components/dono/DonoTabVIP";
import { DonoTabConfig } from "@/components/dono/DonoTabConfig";
import { DonoBannersAlerta } from "@/components/dono/DonoBannersAlerta";
import { DonoModalUpgrade } from "@/components/dono/DonoModalUpgrade";
import { DonoModalRenovacao } from "@/components/dono/DonoModalRenovacao";
import { DonoBloqueio } from "@/components/dono/DonoBloqueio";

const MotionButton = motion.create(Button);

const VALORES_PLANO: Record<PlanoType, number> = {
  starter: 50.0,
  pro: 99.9,
  elite: 497.0,
};

interface VisaoDonoProps {
  faturamentoHoje?: number;
  comissoesAPagarHoje?: number;
  lucroRealHoje?: number;
  faturamentoMensal?: number;
  despesasNoDia?: number;
  comissaoPorBarbeiroHoje?: Array<{ barbeiro: { id: string; nome: string }; total: number }>;
  barbeiros?: Array<{ id: string; nome: string; ativo: boolean; comissao_pct?: number; url_foto?: string | null }>;
  servicos?: Array<{ id: string; nome: string; preco: number; duracao_minutos: number; url_imagem?: string | null }>;
  onAddBarbeiro?: (nome: string, comissao: number, email: string, senha: string, urlFoto: string | null) => void;
  onRemoveBarbeiro?: (id: string) => void;
  onAddServico?: (nome: string, preco: number, duracao: number, urlImagem: string | null) => void;
  onRemoveServico?: (id: string) => void;
  onToggleBarbeiroStatus?: (id: string, ativo: boolean) => void;
  onAddDespesa?: (despesa: unknown) => void;
  corPrimaria?: string;
}

export function VisaoDono({
  faturamentoHoje: faturamentoHojeProp = 0,
  comissoesAPagarHoje: comissoesAPagarHojeProp = 0,
  lucroRealHoje: lucroRealHojeProp = 0,
  faturamentoMensal: faturamentoMensalProp = 0,
  despesasNoDia: _despesasNoDia,
  comissaoPorBarbeiroHoje = [],
  barbeiros = [],
  servicos = [],
  onAddBarbeiro,
  onRemoveBarbeiro,
  onAddServico,
  onRemoveServico,
  onToggleBarbeiroStatus,
  onAddDespesa: _onAddDespesa,
  corPrimaria = "#D4AF37",
}: VisaoDonoProps) {
  const { data, updateData, pixGerado, setPixGerado, tempoPix, setTempoPix } = useDonoData();
  const [avisoRede, setAvisoRede] = useState<string | null>(null);
  const [barbeiroFiltroId, setBarbeiroFiltroId] = useState("");
  const [subTab, setSubTab] = useState<DonoSubTab>("resumo");
  const [subDir, setSubDir] = useState(1);
  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false);
  const [modalUpgradeAberto, setModalUpgradeAberto] = useState(false);
  const [planoPagamento, setPlanoPagamento] = useState<PlanoType>("starter");
  const [isGerandoPix, setIsGerandoPix] = useState(false);

  // Formulários
  const [nBarbeiro, setNBarbeiro] = useState<BarbeiroForm>({ nome: "", comissao: "50", email: "", senha: "" });
  const [nServico, setNServico] = useState<ServicoForm>({ nome: "", preco: "", duracao_minutos: "30" });
  const [imagemBarbeiro, setImagemBarbeiro] = useState<File | null>(null);
  const [imagemServico, setImagemServico] = useState<File | null>(null);
  const [imagemLogo, setImagemLogo] = useState<File | null>(null);
  const [imagemFundo, setImagemFundo] = useState<File | null>(null);
  const [novaDataFechada, setNovaDataFechada] = useState("");

  // Loading states
  const [isUploadingBarbeiro, setIsUploadingBarbeiro] = useState(false);
  const [isUploadingServico, setIsUploadingServico] = useState(false);
  const [isUploadingBranding, setIsUploadingBranding] = useState(false);
  const [isSavingHorario, setIsSavingHorario] = useState(false);

  const brand = corPrimaria?.trim() || "#D4AF37";
  const ctaFg = contrastTextOnBrand(brand);
  const glass = { backgroundColor: hexToRgba(brand, 0.1), backdropFilter: "blur(14px)" } as const;

  const tabVariants = {
    enter: (dir: number) => ({ x: dir * 56, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir * -56, opacity: 0 }),
  };

  // ==========================================
  // EFEITOS
  // ==========================================
  // Busca aviso global do CEO ao carregar
  useEffect(() => {
    const buscarAviso = async () => {
      const { data, error } = await supabase
        .from('avisos_rede')
        .select('mensagem, criado_em')
        .eq('ativo', true)
        .order('criado_em', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        const dataAviso = new Date(data.criado_em);
        const agora = new Date();
        const diffHoras = (agora.getTime() - dataAviso.getTime()) / (1000 * 60 * 60);
        
        if (diffHoras < 24) {
          setAvisoRede(data.mensagem);
        }
      }
    };

    buscarAviso();
  }, []);

  // ==========================================
  // MEMOS PARA CÁLCULOS DERIVADOS
  // ==========================================
  const stats = useMemo(
    () =>
      calcularStatsFiltrados(
        faturamentoHojeProp,
        comissoesAPagarHojeProp,
        lucroRealHojeProp,
        faturamentoMensalProp,
        comissaoPorBarbeiroHoje,
        barbeiros,
        barbeiroFiltroId
      ),
    [faturamentoHojeProp, comissoesAPagarHojeProp, lucroRealHojeProp, faturamentoMensalProp, comissaoPorBarbeiroHoje, barbeiros, barbeiroFiltroId]
  );

  // ==========================================
  // CALLBACKS
  // ==========================================
  const switchSub = useCallback(
    (next: DonoSubTab) => {
      const order: DonoSubTab[] = ["resumo", "dashboard", "automacoes", "config"];
      setSubDir(order.indexOf(next) > order.indexOf(subTab) ? 1 : -1);
      setSubTab(next);
    },
    [subTab]
  );

  const handleUploadImagem = useCallback(async (file: File, bucket: string): Promise<string | null> => {
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 0.1, maxWidthOrHeight: 600 });
      const uniqueId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
      const fileName = `${uniqueId}.${compressed.name.split(".").pop()}`;
      const { error } = await supabase.storage.from(bucket).upload(fileName, compressed);
      if (error) throw error;
      return supabase.storage.from(bucket).getPublicUrl(fileName).data.publicUrl;
    } catch {
      toast.error("Erro no processamento da imagem.");
      return null;
    }
  }, []);

  const handleAddBarbeiroComFotoETrava = useCallback(async () => {
    if (data.planoAtual === "starter" && barbeiros.length >= 2) {
      setModalUpgradeAberto(true);
      return toast.error("Upgrade necessário: Plano Starter permite 2 profissionais.");
    }
    const validacao = barbeiroSchema.safeParse(nBarbeiro);
    if (!validacao.success) return toast.error(validacao.error.errors[0].message);
    setIsUploadingBarbeiro(true);
    let urlFinal: string | null = null;
    if (imagemBarbeiro) {
      urlFinal = await handleUploadImagem(imagemBarbeiro, "equipe");
    }
    onAddBarbeiro?.(validacao.data.nome, Number(validacao.data.comissao), validacao.data.email, validacao.data.senha, urlFinal);
    setNBarbeiro({ nome: "", comissao: "50", email: "", senha: "" });
    setImagemBarbeiro(null);
    setIsUploadingBarbeiro(false);
  }, [data.planoAtual, barbeiros.length, nBarbeiro, imagemBarbeiro, handleUploadImagem, onAddBarbeiro]);

  const handleAddServicoComFoto = useCallback(async () => {
    const validacao = servicoSchema.safeParse(nServico);
    if (!validacao.success) return toast.error(validacao.error.errors[0].message);
    setIsUploadingServico(true);
    let urlFinal: string | null = null;
    if (imagemServico) {
      urlFinal = await handleUploadImagem(imagemServico, "servicos");
    }
    onAddServico?.(validacao.data.nome, Number(validacao.data.preco), Number(validacao.data.duracao_minutos), urlFinal);
    setNServico({ nome: "", preco: "", duracao_minutos: "30" });
    setImagemServico(null);
    setIsUploadingServico(false);
  }, [nServico, imagemServico, handleUploadImagem, onAddServico]);

  const handleSaveHorarios = useCallback(async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return toast.error("Sessão expirada.");
    setIsSavingHorario(true);
    try {
      const { error } = await supabase
        .from("barbearias")
        .update({
          horario_abertura: data.horariosLoja.abertura,
          horario_fechamento: data.horariosLoja.fechamento,
          dias_abertos: data.horariosLoja.dias_trabalho,
          pausa_inicio: data.horariosLoja.inicio_almoco,
          pausa_fim: data.horariosLoja.fim_almoco,
          datas_fechadas: data.horariosLoja.datas_fechadas,
        })
        .eq("dono_id", authData.user.id);
      if (error) throw error;
      toast.success("Configurações de horário salvas com sucesso!");
    } catch {
      toast.error("Erro ao salvar horários.");
    } finally {
      setIsSavingHorario(false);
    }
  }, [data.horariosLoja]);

  const handleSaveBranding = useCallback(async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) return toast.error("Sessão expirada.");
    if (!imagemLogo && !imagemFundo) return toast.info("Nenhuma imagem selecionada para salvar.");
    setIsUploadingBranding(true);
    try {
      const updates: Record<string, string> = {};
      if (imagemLogo) {
        const urlLogo = await handleUploadImagem(imagemLogo, "barbearias");
        if (urlLogo) updates.url_logo = urlLogo;
      }
      if (imagemFundo) {
        const urlFundo = await handleUploadImagem(imagemFundo, "barbearias");
        if (urlFundo) updates.url_fundo = urlFundo;
      }
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from("barbearias").update(updates).eq("dono_id", authData.user.id);
        if (error) throw error;
        toast.success("Identidade visual atualizada com sucesso!");
        setImagemLogo(null);
        setImagemFundo(null);
      }
    } catch {
      toast.error("Erro ao salvar imagens de identidade visual.");
    } finally {
      setIsUploadingBranding(false);
    }
  }, [imagemLogo, imagemFundo, handleUploadImagem]);

  const toggleDiaSemana = useCallback((idDia: number) => {
    updateData({
      horariosLoja: {
        ...data.horariosLoja,
        dias_trabalho: data.horariosLoja.dias_trabalho.includes(idDia)
          ? data.horariosLoja.dias_trabalho.filter((d) => d !== idDia)
          : [...data.horariosLoja.dias_trabalho, idDia].sort(),
      },
    });
  }, [data.horariosLoja, updateData]);

  const handleAddDataFechada = useCallback(() => {
    if (!novaDataFechada) return;
    if (data.horariosLoja.datas_fechadas.includes(novaDataFechada)) return toast.error("Esta data já está bloqueada.");
    updateData({
      horariosLoja: {
        ...data.horariosLoja,
        datas_fechadas: [...data.horariosLoja.datas_fechadas, novaDataFechada].sort(),
      },
    });
    setNovaDataFechada("");
  }, [novaDataFechada, data.horariosLoja, updateData]);

  const handleRemoveDataFechada = useCallback(
    (dataParaRemover: string) => {
      updateData({
        horariosLoja: {
          ...data.horariosLoja,
          datas_fechadas: data.horariosLoja.datas_fechadas.filter((d) => d !== dataParaRemover),
        },
      });
    },
    [data.horariosLoja, updateData]
  );

  const handleAbrirCheckout = useCallback(
    (tipo: "renovacao" | "upgrade", planoAlvo?: PlanoType) => {
      setPixGerado(null);
      if (tipo === "renovacao") {
        setPlanoPagamento(data.planoAtual);
        setModalPagamentoAberto(true);
      } else if (tipo === "upgrade" && planoAlvo) {
        setModalUpgradeAberto(false);
        setPlanoPagamento(planoAlvo);
        setModalPagamentoAberto(true);
      }
    },
    [data.planoAtual, setPixGerado]
  );

  const handleGerarPixDinâmico = useCallback(async () => {
    setIsGerandoPix(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Sessão expirada. Recarregue a página.");
      const { data: barbearia } = await supabase.from("barbearias").select("id").eq("dono_id", authData.user.id).single();
      if (!barbearia) throw new Error("Barbearia não identificada. Entre em contato com o suporte.");
      const { data, error } = await supabase.functions.invoke("mercado-pago-pix", {
        body: {
          barbearia_id: barbearia.id,
          plano: planoPagamento,
          email_dono: authData.user.email || "financeiro@cajtech.net.br",
        },
      });
      if (error || data?.error) throw new Error(data?.error || "Erro na comunicação com o servidor de pagamentos.");
      setPixGerado(data.qr_code);
      setTempoPix(900);
      toast.success("PIX gerado com sucesso! Copie o código abaixo.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Falha ao gerar o PIX. Verifique o console.";
      toast.error(message);
    } finally {
      setIsGerandoPix(false);
    }
  }, [planoPagamento, setPixGerado, setTempoPix]);

  const copiarPix = useCallback(() => {
    if (pixGerado) {
      navigator.clipboard.writeText(pixGerado);
      toast.success("Código PIX Copia e Cola salvo!");
    }
  }, [pixGerado]);

  const getValorPlano = useCallback((planoTarget: PlanoType) => {
    return VALORES_PLANO[planoTarget] || 99.9;
  }, []);

  // ==========================================
  // RENDER CONDICIONAL DE BLOQUEIO
  // ==========================================
  if (data.isLojaAtiva === false) {
    return (
      <DonoBloqueio
        motivo="manual"
        planoAtual={data.planoAtual}
        pixGerado={pixGerado}
        tempoPix={tempoPix}
        isGerandoPix={isGerandoPix}
        onGerarPix={() => handleAbrirCheckout("renovacao")}
        onCopiarPix={copiarPix}
        onRenovacaoClick={() => handleAbrirCheckout("renovacao")}
        getValorPlano={getValorPlano}
      />
    );
  }
  if (data.fasePagamento === 4) {
    return (
      <DonoBloqueio
        motivo="inadimplencia"
        planoAtual={data.planoAtual}
        pixGerado={pixGerado}
        tempoPix={tempoPix}
        isGerandoPix={isGerandoPix}
        onGerarPix={() => handleAbrirCheckout("renovacao")}
        onCopiarPix={copiarPix}
        onRenovacaoClick={() => handleAbrirCheckout("renovacao")}
        getValorPlano={getValorPlano}
      />
    );
  }

  // ==========================================
  // RENDER PRINCIPAL
  // ==========================================
  return (
    <div className="flex flex-col gap-6 pb-40 pt-4 w-full overflow-x-hidden text-white relative">
      {/* BANNER DE AVISO GLOBAL (do CEO) */}
      {avisoRede && (
        <div className="mx-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-xl shadow-lg flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 z-30">
          <div className="flex items-center gap-2 overflow-hidden">
            <Megaphone className="h-5 w-5 animate-pulse shrink-0" />
            <span className="font-bold text-sm uppercase tracking-wide truncate">{avisoRede}</span>
          </div>
          <button
            onClick={() => setAvisoRede(null)}
            className="hover:bg-white/20 rounded-full p-1 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="px-4 flex flex-col gap-3">
        <DonoBannersAlerta
          planoAtual={data.planoAtual}
          fasePagamento={data.fasePagamento}
          diasRestantes={data.diasRestantes}
          onUpgradeClick={() => setModalUpgradeAberto(true)}
          onRenovacaoClick={() => handleAbrirCheckout("renovacao")}
          brand={brand}
          ctaFg={ctaFg}
        />
      </div>

      <div className="px-4">
        <div className="flex rounded-2xl border border-white/[0.08] p-1.5 gap-1.5 shadow-2xl" style={glass}>
          {([
            { id: "resumo", label: "Resumo", Icon: FileText },
            { id: "dashboard", label: "Métricas", Icon: BarChart3 },
            { id: "automacoes", label: "VIP", Icon: Zap },
            { id: "config", label: "Ajustes", Icon: Settings2 },
          ] as const).map(({ id, label, Icon }) => (
            <MotionButton
              key={id}
              type="button"
              variant="ghost"
              whileTap={{ scale: 0.95 }}
              onClick={() => switchSub(id as DonoSubTab)}
              className={cn(
                "flex-1 h-12 rounded-xl text-[10px] font-bold uppercase tracking-wide px-1 transition-colors",
                subTab === id ? "shadow-lg border-0" : "text-white/60 hover:text-white"
              )}
              style={subTab === id ? { backgroundColor: brand, color: ctaFg } : undefined}
            >
              <div className="flex flex-col items-center gap-1">
                <Icon className="h-4 w-4" />
                <span className="hidden xs:inline">{label}</span>
              </div>
            </MotionButton>
          ))}
        </div>
      </div>

      <div className="px-4">
        <AnimatePresence mode="wait" initial={false} custom={subDir}>
          <motion.div
            key={subTab}
            custom={subDir}
            variants={tabVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 400, damping: 36 }}
            className="flex flex-col gap-8"
          >
            {subTab === "resumo" && (
              <DonoTabResumo slug={data.slug} stats={stats} brand={brand} ctaFg={ctaFg} glass={glass} />
            )}
            {subTab === "dashboard" && (
              <DonoTabDashboard
                stats={stats}
                barbeiros={barbeiros}
                barbeiroFiltroId={barbeiroFiltroId}
                onFiltroChange={setBarbeiroFiltroId}
                brand={brand}
                ctaFg={ctaFg}
                glass={glass}
              />
            )}
            {subTab === "automacoes" && (
              <DonoTabVIP
                planoAtual={data.planoAtual}
                vipRemindersEnabled={data.vipRemindersEnabled}
                vipClubEnabled={data.vipClubEnabled}
                onVipRemindersChange={(enabled) => updateData({ vipRemindersEnabled: enabled })}
                onVipClubChange={(enabled) => updateData({ vipClubEnabled: enabled })}
                onUpgradeClick={() => setModalUpgradeAberto(true)}
                brand={brand}
                ctaFg={ctaFg}
                glass={glass}
              />
            )}
            {subTab === "config" && (
              <DonoTabConfig
                barbeiros={barbeiros}
                servicos={servicos}
                horariosLoja={data.horariosLoja}
                checkinHabilitado={data.checkinHabilitado}
                nBarbeiro={nBarbeiro}
                nServico={nServico}
                imagemBarbeiro={imagemBarbeiro}
                imagemServico={imagemServico}
                imagemLogo={imagemLogo}
                imagemFundo={imagemFundo}
                novaDataFechada={novaDataFechada}
                isUploadingBarbeiro={isUploadingBarbeiro}
                isUploadingServico={isUploadingServico}
                isUploadingBranding={isUploadingBranding}
                isSavingHorario={isSavingHorario}
                planoAtual={data.planoAtual}
                brand={brand}
                ctaFg={ctaFg}
                glass={glass}
                onCheckinChange={(enabled) => updateData({ checkinHabilitado: enabled })}
                onNBarbeiroChange={setNBarbeiro}
                onNServicoChange={setNServico}
                onImagemBarbeiroChange={setImagemBarbeiro}
                onImagemServicoChange={setImagemServico}
                onImagemLogoChange={setImagemLogo}
                onImagemFundoChange={setImagemFundo}
                onNovaDataFechadaChange={setNovaDataFechada}
                onToggleDiaSemana={toggleDiaSemana}
                onAddDataFechada={handleAddDataFechada}
                onRemoveDataFechada={handleRemoveDataFechada}
                onSaveHorarios={handleSaveHorarios}
                onSaveBranding={handleSaveBranding}
                onAddBarbeiro={handleAddBarbeiroComFotoETrava}
                onAddServico={handleAddServicoComFoto}
                onToggleBarbeiroStatus={onToggleBarbeiroStatus ?? (() => {})}
                onRemoveBarbeiro={onRemoveBarbeiro ?? (() => {})}
                onRemoveServico={onRemoveServico ?? (() => {})}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <DonoModalUpgrade
        open={modalUpgradeAberto}
        onClose={() => setModalUpgradeAberto(false)}
        planoAtual={data.planoAtual}
        onUpgrade={(plano) => handleAbrirCheckout("upgrade", plano)}
      />
      <DonoModalRenovacao
        open={modalPagamentoAberto}
        onClose={() => {
          setModalPagamentoAberto(false);
          setPixGerado(null);
        }}
        planoAtual={planoPagamento}
        pixGerado={pixGerado}
        tempoPix={tempoPix}
        isGerandoPix={isGerandoPix}
        onGerarPix={handleGerarPixDinâmico}
        onCopiarPix={copiarPix}
      />
    </div>
  );
}
