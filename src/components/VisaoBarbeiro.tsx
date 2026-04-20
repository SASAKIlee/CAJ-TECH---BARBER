import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import jsQR from "jsqr";
import { ShieldAlert, LogOut, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { contrastTextOnBrand } from "@/lib/branding";
import { DonoBloqueio } from "@/components/dono/DonoBloqueio";

// Nossos Componentes Fatiados
import { BarbeiroAcoes } from "./barbeiro/BarbeiroAcoes";
import { AgendaBarbeiro } from "./barbeiro/AgendaBarbeiro";
import { ModalNovoAgendamento } from "./barbeiro/ModalNovoAgendamento";
const MotionButton = motion.create(Button);

export function VisaoBarbeiro(props: any) {
  const {
    barbeiros = [], servicos = [], agendamentos = [], onNovoAgendamento, onStatusChange,
    barbeiroSelecionadoId, setBarbeiroSelecionadoId, horariosOcupados, servicos_find, isDono,
    userId, corPrimaria = "#D4AF37", checkinHabilitado = false, planoAtual = "pro",
    pixGerado = null, tempoPix = 0, isGerandoPix = false, onGerarPix, onCopiarPix, onRenovacaoClick, getValorPlano
  } = props;

  const navigate = useNavigate();
  const scannerInputRef = useRef<HTMLInputElement>(null);
  
  const [openModal, setOpenModal] = useState(false);
  const [infoLoja, setInfoLoja] = useState({ abertura: "09:00", fechamento: "19:00", nome: "Nossa Barbearia", data_vencimento: null as string | null });
  const [isLojaAtiva, setIsLojaAtiva] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const brand = corPrimaria?.trim() || "#D4AF37";
  const ctaFg = contrastTextOnBrand(brand);
  const slugBarbearia = barbeiros[0]?.barbearia_slug;
  const perfilLogado = barbeiros.find((b: any) => b.id === userId);

  // Busca de configurações da Loja
  // Busca de configurações da Loja
  useEffect(() => {
    if (!slugBarbearia) {
      setIsLojaAtiva(true); // Se não achar o slug, destrava o loading infinito!
      return;
    }
    const controller = new AbortController();
    supabase.from('barbearias').select('horario_abertura, horario_fechamento, nome, ativo, data_vencimento').eq('slug', slugBarbearia).single()
      .then(({ data }) => {
        if (data && !controller.signal.aborted) {
          setIsLojaAtiva(data.ativo !== false);
          setInfoLoja({ abertura: data.horario_abertura || "09:00", fechamento: data.horario_fechamento || "19:00", nome: data.nome || "Nossa Barbearia", data_vencimento: data.data_vencimento });
        } else if (!data) setIsLojaAtiva(false);
      });
    return () => controller.abort();
  }, [slugBarbearia]);

  // Logica do QR Code (Mantida e Otimizada)
  const handleScannerQrFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    if (!checkinHabilitado) { toast.info("O check-in digital está desativado."); return; }
    
    setIsScanning(true);
    try {
      const bmp = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width; canvas.height = bmp.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Erro na imagem");
      ctx.drawImage(bmp, 0, 0); bmp.close?.();
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });
      if (!code?.data) throw new Error("QR Code não encontrado.");
      
      const match = code.data.match(/\/checkin\/[^/\s?#]+\/[^/?#\s]+/);
      if (match) navigate(match[0].startsWith("/") ? match[0] : `/${match[0]}`);
      else throw new Error("QR Invalido");
    } catch (err: any) { toast.error(err.message); } finally { setIsScanning(false); }
  }, [checkinHabilitado, navigate]);

  // Regras de Bloqueio
  if (isLojaAtiva === null) return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black"><Loader2 className="h-10 w-10 animate-spin text-white/40" /></div>;

  const dataVenc = infoLoja.data_vencimento ? new Date(infoLoja.data_vencimento) : null;
  const isVencida = dataVenc && dataVenc < new Date();
  const bloqueado = isLojaAtiva === false || isVencida;

  if (bloqueado) {
    if (isDono && isVencida) return <DonoBloqueio motivo="inadimplencia" planoAtual={planoAtual} pixGerado={pixGerado} tempoPix={tempoPix} isGerandoPix={isGerandoPix} onGerarPix={onGerarPix} onCopiarPix={onCopiarPix} onRenovacaoClick={onRenovacaoClick} getValorPlano={getValorPlano} />;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6 backdrop-blur-md">
        <div className="max-w-sm w-full space-y-6 text-center">
          <Lock className="h-12 w-12 text-red-500 mx-auto" />
          <h1 className="text-3xl font-black text-white uppercase">Sistema Bloqueado</h1>
          <p className="text-zinc-400 font-bold uppercase text-xs">{isDono ? "Sua barbearia está com acesso suspenso." : "Barbearia indisponível."}</p>
          {isDono ? <Button onClick={onRenovacaoClick} className="w-full bg-emerald-600">Regularizar Pagamento</Button> : <Button variant="ghost" className="w-full" onClick={() => supabase.auth.signOut()}><LogOut className="mr-2 h-4 w-4" /> Sair</Button>}
        </div>
      </div>
    );
  }

  if (!isDono && perfilLogado && perfilLogado.ativo === false) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6 backdrop-blur-md text-center">
        <ShieldAlert className="h-20 w-20 text-red-500 mx-auto mb-4" />
        <h1 className="text-3xl font-black text-white uppercase">Acesso Negado</h1>
        <p className="text-zinc-400 uppercase text-xs mb-6 mt-2">Seu perfil está desativado.</p>
        <Button variant="ghost" className="w-full" onClick={() => supabase.auth.signOut()}>Sair da Conta</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white pb-32">
      <BarbeiroAcoes 
        isDono={isDono} barbeiros={barbeiros} barbeiroSelecionadoId={barbeiroSelecionadoId}
        setBarbeiroSelecionadoId={setBarbeiroSelecionadoId} brand={brand} ctaFg={ctaFg}
        isScanning={isScanning} onOpenScanner={() => { if(!checkinHabilitado) toast.info("Ative o check-in digital."); else scannerInputRef.current?.click(); }}
        onScannerChange={handleScannerQrFile} scannerRef={scannerInputRef} onOpenModal={() => setOpenModal(true)}
      />

      <AgendaBarbeiro 
        agendamentos={agendamentos} barbeiros={barbeiros} servicos_find={servicos_find} 
        brand={brand} infoLojaNome={infoLoja.nome} onStatusChange={onStatusChange} 
      />

      <ModalNovoAgendamento 
        open={openModal} onOpenChange={setOpenModal} brand={brand} ctaFg={ctaFg}
        barbeiros={barbeiros} servicos={servicos} barbeiroSelecionadoId={barbeiroSelecionadoId}
        onNovoAgendamento={onNovoAgendamento} horariosOcupados={horariosOcupados} infoLoja={infoLoja}
      />
    </div>
  );
}