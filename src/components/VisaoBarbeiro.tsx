import { useState, useEffect, useMemo, useCallback, useRef, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import jsQR from "jsqr";
import {
  Plus, Check, X, MessageCircle, Users, Clock, ShieldAlert, LogOut, Lock,
  Loader2, Edit, Calendar, Filter, Crown, Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { agendamentoSchema } from "@/lib/schemas";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { hexToRgba, contrastTextOnBrand } from "@/lib/branding";
import DOMPurify from "dompurify";

const MotionButton = motion.create(Button);

// ==========================================
// CONSTANTES
// ==========================================
const HORARIO_PADRAO_ABERTURA = "09:00";
const HORARIO_PADRAO_FECHAMENTO = "19:00";
const HORARIO_PADRAO_NOME = "nossa barbearia";

// ==========================================
// TIPAGENS (MELHORIA #1)
// ==========================================
interface Barbeiro {
  id: string;
  nome: string;
  ativo?: boolean;
  barbearia_slug?: string;
  comissao_pct?: number;
  url_foto?: string;
}

interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao_minutos: number;
}

interface Agendamento {
  id: string;
  nome_cliente: string;
  telefone_cliente: string;
  servico_id: string;
  barbeiro_id: string;
  data: string;
  horario: string;
  status: "Pendente" | "Finalizado" | "Cancelado";
  gorjeta?: number;
  observacao?: string;
}

interface VisaoBarbeiroProps {
  barbeiros: Barbeiro[];
  servicos: Servico[];
  agendamentos: Agendamento[];
  onNovoAgendamento: (agendamento: Partial<Agendamento>) => Promise<{ error?: any }>;
  onStatusChange: (id: string, status: string) => Promise<void>;
  barbeiroSelecionadoId: string;
  setBarbeiroSelecionadoId: (id: string) => void;
  horariosOcupados: (data: string, barbeiroId: string) => string[];
  servicos_find: (id: string) => Servico | undefined;
  isDono: boolean;
  userId?: string;
  corPrimaria?: string;
  checkinHabilitado?: boolean;
}

interface NovoAgendamentoForm {
  nome: string;
  telefone: string;
  servicoId: string;
  barbeiroId: string;
  data: string;
  horario: string;
  observacao: string;
}

interface ErrosForm {
  nome?: boolean;
  telefone?: boolean;
  servicoId?: boolean;
  barbeiroId?: boolean;
  data?: boolean;
  horario?: boolean;
}

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================
function getHojeLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function gerarHorariosDinamicos(abertura: string = HORARIO_PADRAO_ABERTURA, fechamento: string = HORARIO_PADRAO_FECHAMENTO): string[] {
  const horarios: string[] = [];
  let [horaAtual, minAtual] = abertura.split(':').map(Number);
  const [horaFim, minFim] = fechamento.split(':').map(Number);

  while (horaAtual < horaFim || (horaAtual === horaFim && minAtual < minFim)) {
    const hFormated = String(horaAtual).padStart(2, '0');
    const mFormated = String(minAtual).padStart(2, '0');
    horarios.push(`${hFormated}:${mFormated}`);

    minAtual += 30;
    if (minAtual >= 60) {
      minAtual -= 60;
      horaAtual += 1;
    }
  }
  return horarios;
}

function aplicarMascaraTelefone(valor: string): string {
  const digits = valor.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function validarTelefone(telefone: string): boolean {
  return telefone.replace(/\D/g, "").length >= 10;
}

/** Extrai pathname `/checkin/:slug/:ticket` a partir do texto decodificado do QR. */
function extractCheckinPathFromQr(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  try {
    const url = new URL(t);
    if (/^\/checkin\/[^/]+\/[^/]+$/.test(url.pathname)) return url.pathname;
  } catch {
    /* texto não é URL absoluta */
  }
  const m = t.match(/\/checkin\/[^/\s?#]+\/[^/?#\s]+/);
  if (m) return m[0].startsWith("/") ? m[0] : `/${m[0]}`;
  return null;
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
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
  userId,
  corPrimaria = "#D4AF37",
  checkinHabilitado = false,
}: VisaoBarbeiroProps) {
  const navigate = useNavigate();
  const scannerInputRef = useRef<HTMLInputElement>(null);
  // ==========================================
  // ESTADOS
  // ==========================================
  const [open, setOpen] = useState(false);
  const [infoLoja, setInfoLoja] = useState({
    abertura: HORARIO_PADRAO_ABERTURA,
    fechamento: HORARIO_PADRAO_FECHAMENTO,
    nome: HORARIO_PADRAO_NOME,
  });
  const [isLojaAtiva, setIsLojaAtiva] = useState<boolean | null>(null);
  const [statusFiltro, setStatusFiltro] = useState<"Pendente" | "Todos">("Pendente"); // MELHORIA #13
  const [novo, setNovo] = useState<NovoAgendamentoForm>({
    nome: "",
    telefone: "",
    servicoId: "",
    barbeiroId: barbeiroSelecionadoId || "",
    data: "",
    horario: "",
    observacao: "",
  });
  const [erros, setErros] = useState<ErrosForm>({});
  const [dismissing, setDismissing] = useState<{ id: string; status: "Finalizado" | "Cancelado" } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // MELHORIA #6

  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  const brand = corPrimaria?.trim() || "#D4AF37";
  const ctaFg = contrastTextOnBrand(brand);
  const glass = { backgroundColor: hexToRgba(brand, 0.1), backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" } as const;

  const perfilLogado = barbeiros.find((b) => b.id === userId);

  // ==========================================
  // EFEITOS
  // ==========================================
  useEffect(() => {
    async function fetchHorariosConfig() {
      const slug = barbeiros[0]?.barbearia_slug;
      if (!slug) return;
      const { data } = await supabase
        .from('barbearias')
        .select('horario_abertura, horario_fechamento, nome, ativo')
        .eq('slug', slug)
        .single();
      if (data) {
        setIsLojaAtiva(data.ativo !== false);
        setInfoLoja({
          abertura: data.horario_abertura || HORARIO_PADRAO_ABERTURA,
          fechamento: data.horario_fechamento || HORARIO_PADRAO_FECHAMENTO,
          nome: data.nome || HORARIO_PADRAO_NOME,
        });
      }
    }
    fetchHorariosConfig();
  }, [barbeiros]);

  // Sincroniza barbeiroSelecionadoId com o userId para barbeiros comuns
  useEffect(() => {
    if (!isDono && userId && barbeiroSelecionadoId !== userId) {
      setBarbeiroSelecionadoId(userId);
    }
    // Se for dono e não houver seleção, inicializa vazio (todos)
    if (isDono && barbeiroSelecionadoId === undefined) {
      setBarbeiroSelecionadoId("");
    }
  }, [isDono, userId, barbeiroSelecionadoId, setBarbeiroSelecionadoId]);

  useEffect(() => {
    if (open) {
      setNovo((prev) => ({
        ...prev,
        barbeiroId: barbeiroSelecionadoId || "",
        data: getHojeLocal(),
      }));
      setErros({});
    }
  }, [open, barbeiroSelecionadoId]);

  // ==========================================
  // MEMOS
  // ==========================================
  const horarios = useMemo(
    () => gerarHorariosDinamicos(infoLoja.abertura, infoLoja.fechamento),
    [infoLoja]
  );

  const { horaAtual, minAtual, hojeLocal } = useMemo(() => {
    const agora = new Date();
    return {
      horaAtual: agora.getHours(),
      minAtual: agora.getMinutes(),
      hojeLocal: getHojeLocal(),
    };
  }, []);

  const agendamentosFiltrados = useMemo(() => {
    let filtrados = agendamentos;
    if (statusFiltro === "Pendente") {
      filtrados = filtrados.filter((a) => a.status === "Pendente");
    }
    return [...filtrados].sort((a, b) => String(a.horario).localeCompare(String(b.horario)));
  }, [agendamentos, statusFiltro]);

  // MELHORIA #4: Removida dependência desnecessária de agendamentos
  const slotsOcupados = useMemo(() => {
    if (!novo.data || !novo.barbeiroId) return [];
    return horariosOcupados(novo.data, novo.barbeiroId);
  }, [novo.data, novo.barbeiroId, horariosOcupados]);

  // ==========================================
  // CALLBACKS
  // ==========================================
  const handleTelefoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = aplicarMascaraTelefone(e.target.value);
    setNovo((prev) => ({ ...prev, telefone: valor }));
    setErros((prev) => ({ ...prev, telefone: !validarTelefone(valor) }));
  }, []);

  const handleFieldBlur = useCallback((field: keyof NovoAgendamentoForm) => {
    if (field === "nome") {
      setErros((prev) => ({ ...prev, nome: !novo.nome.trim() }));
    } else if (field === "telefone") {
      setErros((prev) => ({ ...prev, telefone: !validarTelefone(novo.telefone) }));
    }
    // Outros campos podem ser validados no submit
  }, [novo]);

  const isFormValid = useMemo(() => {
    return (
      novo.nome.trim().length > 0 &&
      validarTelefone(novo.telefone) &&
      novo.servicoId !== "" &&
      novo.barbeiroId !== "" &&
      novo.data !== "" &&
      novo.horario !== ""
    );
  }, [novo]);

  const handleAgendar = useCallback(async () => {
    // Validação manual antes do Zod (MELHORIA #2)
    const newErros: ErrosForm = {
      nome: !novo.nome.trim(),
      telefone: !validarTelefone(novo.telefone),
      servicoId: !novo.servicoId,
      barbeiroId: !novo.barbeiroId,
      data: !novo.data,
      horario: !novo.horario,
    };
    setErros(newErros);
    if (Object.values(newErros).some(Boolean)) {
      toast.error("Preencha todos os campos corretamente.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Processando...");
    const validacao = agendamentoSchema.safeParse(novo);

    if (!validacao.success) {
      toast.dismiss(toastId);
      toast.error(validacao.error.errors[0].message);
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await onNovoAgendamento({
        nome_cliente: validacao.data.nome,
        telefone_cliente: validacao.data.telefone,
        servico_id: validacao.data.servicoId,
        barbeiro_id: validacao.data.barbeiroId,
        data: validacao.data.data,
        horario: validacao.data.horario,
        observacao: DOMPurify.sanitize(novo.observacao),
      });

      toast.dismiss(toastId);
      if (!res?.error) {
        setOpen(false);
        setNovo({
          nome: "",
          telefone: "",
          servicoId: "",
          barbeiroId: barbeiroSelecionadoId,
          data: getHojeLocal(),
          horario: "",
          observacao: "",
        });
        toast.success(`Agendamento para ${novo.nome} às ${novo.horario} confirmado! ✂️`);
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.dismiss(toastId);
      toast.error("Erro crítico de comunicação.");
    } finally {
      setIsSubmitting(false);
    }
  }, [novo, onNovoAgendamento, barbeiroSelecionadoId]);

  const iniciarSaida = useCallback((id: string, status: "Finalizado" | "Cancelado") => {
    if (dismissing) return;
    if (status === "Cancelado" && !confirm("Cancelar este agendamento? Esta ação não pode ser desfeita.")) {
      return;
    }
    setDismissing({ id, status });
  }, [dismissing]);

  useEffect(() => {
    if (!dismissing) return;
    const { id, status } = dismissing;
    const t = window.setTimeout(() => {
      void Promise.resolve(onStatusChangeRef.current(id, status)).finally(() => setDismissing(null));
    }, 400);
    return () => clearTimeout(t);
  }, [dismissing]);

  const handleScannerQrFile = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      if (!checkinHabilitado) {
        toast.info("O check-in digital está desativado nesta barbearia.");
        return;
      }
      try {
        const bmp = await createImageBitmap(file);
        const canvas = document.createElement("canvas");
        canvas.width = bmp.width;
        canvas.height = bmp.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          toast.error("Não foi possível ler a imagem.");
          return;
        }
        ctx.drawImage(bmp, 0, 0);
        bmp.close?.();
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });
        if (!code?.data) {
          toast.error("Não foi possível ler o QR Code. Tente outra imagem.");
          return;
        }
        const path = extractCheckinPathFromQr(code.data);
        if (!path) {
          toast.error("QR Code não é um ticket de check-in válido.");
          return;
        }
        navigate(path);
      } catch {
        toast.error("Erro ao processar a imagem.");
      }
    },
    [checkinHabilitado, navigate]
  );

  const openScannerFilePicker = useCallback(() => {
    if (!checkinHabilitado) {
      toast.info("Ative o check-in digital em Ajustes (visão dono) para usar o scanner.");
      return;
    }
    scannerInputRef.current?.click();
  }, [checkinHabilitado]);

  // ==========================================
  // RENDER
  // ==========================================
  if (!isDono && (isLojaAtiva === false || (perfilLogado && perfilLogado.ativo === false))) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6 backdrop-blur-md">
        <div className="max-w-sm w-full space-y-6 text-center">
          <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 bg-red-600/20 blur-3xl rounded-full" />
            {isLojaAtiva === false ? (
              <Lock className="h-12 w-12 text-red-500 relative z-10" />
            ) : (
              <ShieldAlert className="h-20 w-20 text-red-500 relative z-10 stroke-[1.5px]" />
            )}
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">
              {isLojaAtiva === false ? "Sistema Bloqueado" : "Acesso Negado"}
            </h1>
            <p className="text-zinc-400 font-bold uppercase text-xs tracking-widest">
              {isLojaAtiva === false
                ? "A barbearia encontra-se com o acesso suspenso."
                : "Seu perfil de barbeiro está desativado pelo dono."}
            </p>
          </div>
          <MotionButton
            variant="ghost"
            className="w-full h-12 text-zinc-500 font-black uppercase text-xs hover:text-white"
            whileTap={{ scale: 0.95 }}
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sair da Conta
          </MotionButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white pb-32">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-2">
        <div>
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Agenda do Dia</h2>
          {isDono && (
            <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: brand }}>
              Visão Administrativa
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <input
            ref={scannerInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            onChange={handleScannerQrFile}
            aria-hidden
          />
          <MotionButton
            type="button"
            variant="outline"
            className="rounded-[20px] border-white/10 bg-white/5 h-14 px-6 font-black uppercase text-xs text-white hover:bg-white/10"
            whileTap={{ scale: 0.95 }}
            onClick={openScannerFilePicker}
            aria-label="Escanear QR Code do ticket de check-in"
          >
            <Camera className="h-5 w-5 mr-2" /> Scanner
          </MotionButton>

          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <MotionButton
              className="rounded-[20px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] gap-2 h-14 px-8 font-black uppercase text-xs border-0"
              style={{ backgroundColor: brand, color: ctaFg }}
              whileTap={{ scale: 0.95 }}
              aria-label="Novo agendamento"
            >
              <Plus className="h-5 w-5 stroke-[3px]" /> Novo Agendamento
            </MotionButton>
          </DialogTrigger>
          <DialogContent className="dark border-white/[0.08] text-white w-[95vw] sm:max-w-md p-6 rounded-[2rem] max-h-[90vh] overflow-y-auto custom-scrollbar bg-zinc-950/95 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle className="text-white font-black uppercase italic text-2xl flex items-center gap-2">
                <Clock style={{ color: brand }} /> Novo Horário
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Cliente</label>
                <Input
                  placeholder="Nome Completo"
                  className={cn(
                    "rounded-xl border-white/[0.08] bg-black/35 h-14 text-base backdrop-blur-sm",
                    erros.nome && "border-red-500"
                  )}
                  value={novo.nome}
                  onChange={(e) => {
                    setNovo({ ...novo, nome: e.target.value });
                    setErros((prev) => ({ ...prev, nome: false }));
                  }}
                  onBlur={() => handleFieldBlur("nome")}
                />
                {erros.nome && <p className="text-red-400 text-[10px] mt-1 ml-2">Nome obrigatório.</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">WhatsApp</label>
                <Input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  className={cn(
                    "rounded-xl border-white/[0.08] bg-black/35 h-14 text-base backdrop-blur-sm",
                    erros.telefone && "border-red-500"
                  )}
                  value={novo.telefone}
                  onChange={handleTelefoneChange}
                  onBlur={() => handleFieldBlur("telefone")}
                />
                {erros.telefone && (
                  <p className="text-red-400 text-[10px] mt-1 ml-2">Telefone inválido (mín. 10 dígitos).</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Barbeiro</label>
                  <Select
                    value={novo.barbeiroId}
                    onValueChange={(v) => {
                      setNovo({ ...novo, barbeiroId: v, horario: "" });
                      setErros((prev) => ({ ...prev, barbeiroId: false }));
                    }}
                  >
                    <SelectTrigger
                      className={cn(
                        "rounded-xl border-white/[0.08] bg-black/35 h-14 text-base backdrop-blur-sm",
                        erros.barbeiroId && "border-red-500"
                      )}
                    >
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white rounded-xl">
                      {barbeiros.filter((b) => b.ativo).map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Serviço</label>
                  <Select
                    value={novo.servicoId}
                    onValueChange={(v) => {
                      setNovo({ ...novo, servicoId: v });
                      setErros((prev) => ({ ...prev, servicoId: false }));
                    }}
                  >
                    <SelectTrigger
                      className={cn(
                        "rounded-xl border-white/[0.08] bg-black/35 h-14 text-base backdrop-blur-sm",
                        erros.servicoId && "border-red-500"
                      )}
                    >
                      <SelectValue placeholder="Serviço" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white rounded-xl">
                      {servicos.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Data</label>
                <Input
                  type="date"
                  className={cn(
                    "rounded-xl border-white/[0.08] bg-black/35 h-14 text-base color-scheme-dark backdrop-blur-sm",
                    erros.data && "border-red-500"
                  )}
                  value={novo.data}
                  onChange={(e) => {
                    setNovo({ ...novo, data: e.target.value, horario: "" });
                    setErros((prev) => ({ ...prev, data: false }));
                  }}
                />
              </div>

              <div className="space-y-2 border-t border-white/[0.08] pt-4 mt-2">
                <label className="text-[10px] font-black text-zinc-500 tracking-widest ml-1 uppercase">
                  Horários Disponíveis
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {horarios.map((h) => {
                    const [hH, mH] = h.split(":").map(Number);
                    const isHoje = novo.data === hojeLocal;
                    const busy = slotsOcupados.includes(h);
                    const disable = !novo.barbeiroId || busy || (isHoje && (hH < horaAtual || (hH === horaAtual && mH <= minAtual)));

                    return (
                      <MotionButton
                        key={h}
                        type="button"
                        variant={novo.horario === h ? "default" : "outline"}
                        disabled={disable}
                        whileTap={!disable ? { scale: 0.95 } : undefined}
                        onClick={() => {
                          setNovo({ ...novo, horario: h });
                          setErros((prev) => ({ ...prev, horario: false }));
                        }}
                        className={cn(
                          "text-[12px] font-bold h-12 rounded-xl transition-colors",
                          novo.horario === h ? "border-0 shadow-lg" : "text-white bg-black/30 border-white/[0.08]",
                          disable && "opacity-20 cursor-not-allowed"
                        )}
                        style={novo.horario === h ? { backgroundColor: brand, color: ctaFg } : undefined}
                      >
                        {h}
                      </MotionButton>
                    );
                  })}
                </div>
                {erros.horario && <p className="text-red-400 text-[10px] mt-1 ml-2">Selecione um horário.</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase ml-1">Recado para o barbeiro (opcional)</label>
                <Textarea
                  placeholder="Ex: Quero igual da foto..."
                  className="bg-white/5 border-white/10 text-white rounded-xl min-h-[80px]"
                  value={novo.observacao}
                  onChange={(e) => setNovo({ ...novo, observacao: e.target.value })}
                />
              </div>

              <MotionButton
                className="w-full h-16 font-black uppercase text-sm rounded-2xl mt-4 border-0 shadow-xl disabled:opacity-50"
                style={{ backgroundColor: brand, color: ctaFg }}
                whileTap={{ scale: isFormValid && !isSubmitting ? 0.95 : 1 }}
                onClick={handleAgendar}
                disabled={!isFormValid || isSubmitting}
                aria-label="Confirmar agendamento"
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : "Confirmar Agendamento"}
              </MotionButton>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>

      {isDono && (
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
          <MotionButton
            variant={barbeiroSelecionadoId === "" ? "default" : "outline"}
            size="sm"
            whileTap={{ scale: 0.95 }}
            onClick={() => setBarbeiroSelecionadoId("")}
            className={cn(
              "rounded-xl text-[10px] font-black uppercase h-10 px-5 border-white/[0.08] transition-colors",
              barbeiroSelecionadoId === "" && "border-0 shadow-lg"
            )}
            style={barbeiroSelecionadoId === "" ? { backgroundColor: brand, color: ctaFg } : { backgroundColor: hexToRgba(brand, 0.05) }}
            aria-label="Todos os barbeiros"
          >
            Todos
          </MotionButton>
          {barbeiros.map((b) => (
            <MotionButton
              key={b.id}
              variant={barbeiroSelecionadoId === b.id ? "default" : "outline"}
              size="sm"
              whileTap={{ scale: 0.95 }}
              onClick={() => setBarbeiroSelecionadoId(b.id)}
              className={cn(
                "rounded-xl text-[10px] font-black uppercase h-10 px-5 whitespace-nowrap border-white/[0.08] transition-colors",
                barbeiroSelecionadoId === b.id && "border-0 shadow-lg",
                !b.ativo && "opacity-40 grayscale"
              )}
              style={barbeiroSelecionadoId === b.id ? { backgroundColor: brand, color: ctaFg } : { backgroundColor: hexToRgba(brand, 0.05) }}
              aria-label={`Agenda de ${b.nome}`}
            >
              {b.nome} {!b.ativo && "(INATIVO)"}
            </MotionButton>
          ))}
        </div>
      )}

      {/* FILTRO DE STATUS (MELHORIA #13) */}
      <div className="flex items-center gap-2 px-1">
        <Filter className="h-4 w-4 text-white/50" />
        <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as "Pendente" | "Todos")}>
          <SelectTrigger className="w-40 h-10 rounded-xl border-white/[0.08] bg-black/35 text-xs uppercase font-black">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800 text-white rounded-xl">
            <SelectItem value="Pendente">Pendentes</SelectItem>
            <SelectItem value="Todos">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="relative pl-6 sm:pl-8 pt-4">
        <div className="absolute left-[11px] sm:left-[13px] top-4 bottom-2 w-[2px] bg-gradient-to-b from-white/20 via-white/5 to-transparent rounded-full" aria-hidden />

        {agendamentosFiltrados.length === 0 ? (
          <div className="text-center py-20 rounded-[2rem] border border-dashed border-white/[0.12] mt-4" style={glass}>
            <Clock className="h-12 w-12 text-zinc-600 mx-auto mb-4 opacity-50" />
            <p className="text-zinc-500 font-bold uppercase text-[11px] tracking-widest">
              Nenhum agendamento {statusFiltro === "Pendente" ? "pendente" : "encontrado"}
            </p>
          </div>
        ) : (
          <ul className="space-y-6">
            {agendamentosFiltrados.map((ag) => {
              const servico = servicos_find(ag.servico_id);
              const barbeiro = barbeiros.find((b) => b.id === ag.barbeiro_id);
              const saindo = dismissing?.id === ag.id;
              const saidaDireita = dismissing?.status === "Finalizado";
              const numValido = ag.telefone_cliente ? ag.telefone_cliente.replace(/\D/g, "") : "";
              const temWhatsapp = numValido.length >= 10;

              return (
                <motion.li
                  key={ag.id}
                  layout
                  initial={{ opacity: 0, x: 36 }}
                  animate={
                    saindo
                      ? { opacity: 0, x: saidaDireita ? 56 : -56, scale: 0.98, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } }
                      : { opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 380, damping: 32 } }
                  }
                  className="relative"
                >
                  <div
                    className="absolute left-[-22px] sm:left-[-24.5px] top-6 sm:top-7 h-3.5 w-3.5 rounded-full border-[3px] border-white/20 bg-zinc-950 shadow-[0_0_12px_rgba(255,255,255,0.15)] z-10 transition-colors"
                    style={{
                      borderColor: saindo ? "transparent" : hexToRgba(brand, 0.85),
                      boxShadow: `0 0 14px ${hexToRgba(brand, 0.4)}`,
                    }}
                  />

                  <Card className={cn("p-5 sm:p-6 rounded-[24px] border border-white/[0.08] shadow-2xl flex flex-col gap-5")} style={glass}>
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-4xl font-black text-white tracking-tighter">{ag.horario}</span>
                          <Badge
                            className="text-[9px] font-black uppercase py-1 px-3 rounded-md border-0"
                            style={{ backgroundColor: hexToRgba(brand, 0.15), color: brand }}
                          >
                            {ag.status}
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <p className="font-black text-xl text-white uppercase leading-tight mb-2 flex items-center gap-1">
                          {ag.nome_cliente}
                          {(() => {
                            const totalAgendamentosCliente = agendamentos.filter(
                              a => a.telefone_cliente === ag.telefone_cliente && a.status === 'Finalizado'
                            ).length;
                            const isVip = totalAgendamentosCliente >= 5;
                            return isVip && <Crown className="h-5 w-5 text-yellow-500" />;
                          })()}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 bg-black/30 p-3 rounded-xl border border-white/[0.05]">
                          <span className="text-[10px] font-black text-zinc-400 uppercase flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" style={{ color: brand }} /> {barbeiro?.nome || "Profissional"}
                          </span>
                          <span className="text-[10px] font-black uppercase flex items-center gap-1.5" style={{ color: brand }}>
                            {servico?.nome || "Corte"} • R${servico?.preco || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    {ag.observacao && (
                      <div className="mt-2 flex items-start gap-2 p-3 bg-yellow-500/10 border-l-2 border-yellow-500 rounded-lg">
                        <MessageCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-yellow-100/80 italic">{ag.observacao}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 pt-4 border-t border-white/[0.08]">
                      <MotionButton
                        size="icon"
                        className={cn(
                          "h-12 w-12 rounded-xl shrink-0 border transition-all",
                          temWhatsapp
                            ? "text-green-500 bg-green-500/10 hover:bg-green-500/20 border-green-500/20"
                            : "text-zinc-600 bg-zinc-800/30 border-zinc-800 opacity-50 cursor-not-allowed"
                        )}
                        whileTap={temWhatsapp ? { scale: 0.95 } : undefined}
                        disabled={!!dismissing || !temWhatsapp}
                        onClick={() => {
                          if (!temWhatsapp) return;
                          const msg = `Fala, *${ag.nome_cliente}*! Tudo bem? ✂️\n\nPassando para confirmar seu horário hoje às *${ag.horario}* aqui na *${infoLoja.nome}*!\n\nJá estou preparando as máquinas. ☕️ Te espero para darmos aquele trato no visual! 🔥👊`;
                          window.open(`https://api.whatsapp.com/send?phone=55${numValido}&text=${encodeURIComponent(msg)}`, "_blank");
                        }}
                        title={temWhatsapp ? "Avisar no WhatsApp" : "Cliente sem telefone cadastrado"}
                        aria-label="Enviar mensagem WhatsApp"
                      >
                        <MessageCircle className="h-6 w-6" />
                      </MotionButton>

                      <MotionButton
                        className="flex-1 h-12 bg-green-600 hover:bg-green-500 text-white font-black uppercase text-[10px] sm:text-xs tracking-widest rounded-xl shadow-lg border-0"
                        whileTap={{ scale: 0.95 }}
                        disabled={!!dismissing}
                        onClick={() => iniciarSaida(ag.id, "Finalizado")}
                        aria-label="Concluir agendamento"
                      >
                        <Check className="h-5 w-5 mr-1.5 stroke-[3px]" /> Concluir
                      </MotionButton>

                      <MotionButton
                        variant="outline"
                        className="flex-1 sm:flex-none sm:w-32 h-12 text-red-500 border-red-500/30 bg-red-500/5 hover:bg-red-500/10 font-black uppercase text-[10px] sm:text-xs tracking-widest rounded-xl transition-colors"
                        whileTap={{ scale: 0.95 }}
                        disabled={!!dismissing}
                        onClick={() => iniciarSaida(ag.id, "Cancelado")}
                        aria-label="Cancelar agendamento"
                      >
                        <X className="h-5 w-5 mr-1.5 stroke-[3px]" /> Cancelar
                      </MotionButton>
                    </div>
                  </Card>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}