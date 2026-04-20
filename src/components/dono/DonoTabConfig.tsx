import { useEffect, useMemo } from "react";
import {
  QrCode,
  Clock,
  Users,
  Scissors,
  ImagePlus,
  Plus,
  Save,
  X,
  Loader2,
  CheckCircle2,
  UserCircle2,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { DonoTabConfigProps } from "@/types/dono";

const DIAS_SEMANA = [
  { id: 0, label: "D", fullName: "Domingo" },
  { id: 1, label: "S", fullName: "Segunda" },
  { id: 2, label: "T", fullName: "Terça" },
  { id: 3, label: "Q", fullName: "Quarta" },
  { id: 4, label: "Q", fullName: "Quinta" },
  { id: 5, label: "S", fullName: "Sexta" },
  { id: 6, label: "S", fullName: "Sábado" },
];

const formatarMoedaBR = (valor: number) => {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor || 0);
};

const formatarDataBR = (dataIso: string) => {
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
};

export function DonoTabConfig({
  barbeiros,
  servicos,
  horariosLoja,
  checkinHabilitado,
  nBarbeiro,
  nServico,
  imagemBarbeiro,
  imagemServico,
  imagemLogo,
  imagemFundo,
  novaDataFechada,
  isUploadingBarbeiro,
  isUploadingServico,
  isUploadingBranding,
  isSavingHorario,
  brand,
  ctaFg,
  glass,
  onCheckinChange,
  onToggleDiaSemana,
  onAddDataFechada,
  onRemoveDataFechada,
  onSaveHorarios,
  onSaveBranding,
  onAddBarbeiro,
  onAddServico,
  onToggleBarbeiroStatus,
  onRemoveBarbeiro,
  onRemoveServico,
  onNBarbeiroChange,
  onNServicoChange,
  onImagemBarbeiroChange,
  onImagemServicoChange,
  onImagemLogoChange,
  onImagemFundoChange,
  onNovaDataFechadaChange,
}: DonoTabConfigProps) {
  // Gerenciar URLs de preview com limpeza automática
  const previewLogo = useMemo(
    () => (imagemLogo ? URL.createObjectURL(imagemLogo) : null),
    [imagemLogo]
  );
  const previewFundo = useMemo(
    () => (imagemFundo ? URL.createObjectURL(imagemFundo) : null),
    [imagemFundo]
  );

  // Limpar URLs ao desmontar ou quando as imagens mudarem
  useEffect(() => {
    return () => {
      if (previewLogo) URL.revokeObjectURL(previewLogo);
      if (previewFundo) URL.revokeObjectURL(previewFundo);
    };
  }, [previewLogo, previewFundo]);

  return (
    <section className="space-y-10 animate-in fade-in duration-500 pb-10">
      {/* CHECK-IN DIGITAL */}
      <CheckInSection
        checkinHabilitado={checkinHabilitado}
        brand={brand}
        glass={glass}
        onCheckinChange={onCheckinChange}
      />

      {/* HORÁRIOS DE FUNCIONAMENTO */}
      <HorariosSection
        horariosLoja={horariosLoja}
        novaDataFechada={novaDataFechada}
        isSavingHorario={isSavingHorario}
        brand={brand}
        ctaFg={ctaFg}
        glass={glass}
        onToggleDiaSemana={onToggleDiaSemana}
        onAddDataFechada={onAddDataFechada}
        onRemoveDataFechada={onRemoveDataFechada}
        onNovaDataFechadaChange={onNovaDataFechadaChange}
        onSaveHorarios={onSaveHorarios}
        // ⚠️ NOTA: Os inputs de horário (abertura, fechamento, etc.) não têm onChange.
        // O desenvolvedor deve adicionar callbacks no componente pai para permitir edição.
      />

      {/* GESTÃO DE EQUIPE */}
      <EquipeSection
        barbeiros={barbeiros}
        nBarbeiro={nBarbeiro}
        imagemBarbeiro={imagemBarbeiro}
        isUploadingBarbeiro={isUploadingBarbeiro}
        brand={brand}
        ctaFg={ctaFg}
        glass={glass}
        onNBarbeiroChange={onNBarbeiroChange}
        onImagemBarbeiroChange={onImagemBarbeiroChange}
        onAddBarbeiro={onAddBarbeiro}
        onToggleBarbeiroStatus={onToggleBarbeiroStatus}
        onRemoveBarbeiro={onRemoveBarbeiro}
      />

      {/* GESTÃO DE SERVIÇOS */}
      <ServicosSection
        servicos={servicos}
        nServico={nServico}
        imagemServico={imagemServico}
        isUploadingServico={isUploadingServico}
        brand={brand}
        ctaFg={ctaFg}
        glass={glass}
        onNServicoChange={onNServicoChange}
        onImagemServicoChange={onImagemServicoChange}
        onAddServico={onAddServico}
        onRemoveServico={onRemoveServico}
      />

      {/* IDENTIDADE VISUAL */}
      <BrandingSection
        imagemLogo={imagemLogo}
        imagemFundo={imagemFundo}
        previewLogo={previewLogo}
        previewFundo={previewFundo}
        isUploadingBranding={isUploadingBranding}
        brand={brand}
        ctaFg={ctaFg}
        glass={glass}
        onImagemLogoChange={onImagemLogoChange}
        onImagemFundoChange={onImagemFundoChange}
        onSaveBranding={onSaveBranding}
      />
    </section>
  );
}

// ==========================================
// SUB-COMPONENTES INTERNOS
// ==========================================

function CheckInSection({
  checkinHabilitado,
  brand,
  glass,
  onCheckinChange,
}: {
  checkinHabilitado: boolean;
  brand: string;
  glass: React.CSSProperties;
  onCheckinChange: (enabled: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <QrCode className="h-5 w-5" style={{ color: brand }} />
        <h3 className="font-black text-white uppercase text-lg tracking-tight italic">Check-in Digital</h3>
      </div>
      <Card className="p-5 sm:p-6 rounded-[22px] border border-white/[0.08] shadow-xl" style={glass}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-black uppercase">QR Code no Ticket</h4>
            <p className="text-[10px] text-zinc-400 mt-1">
              {checkinHabilitado
                ? "Clientes podem fazer check-in escaneando o QR Code."
                : "Ative para gerar QR Code nos tickets e permitir check-in digital."}
            </p>
          </div>
          <Switch checked={checkinHabilitado} onCheckedChange={onCheckinChange} />
        </div>
      </Card>
    </div>
  );
}

function HorariosSection({
  horariosLoja,
  novaDataFechada,
  isSavingHorario,
  brand,
  ctaFg,
  glass,
  onToggleDiaSemana,
  onAddDataFechada,
  onRemoveDataFechada,
  onNovaDataFechadaChange,
  onSaveHorarios,
}: {
  horariosLoja: DonoTabConfigProps["horariosLoja"];
  novaDataFechada: string;
  isSavingHorario: boolean;
  brand: string;
  ctaFg: string;
  glass: React.CSSProperties;
  onToggleDiaSemana: (id: number) => void;
  onAddDataFechada: () => void;
  onRemoveDataFechada: (data: string) => void;
  onNovaDataFechadaChange: (data: string) => void;
  onSaveHorarios: () => void;
}) {
  return (
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
                <button
                  key={dia.id}
                  onClick={() => onToggleDiaSemana(dia.id)}
                  className={cn(
                    "h-12 flex-1 rounded-xl text-sm font-black transition-all border",
                    isSelected ? "border-transparent shadow-lg" : "bg-black/30 border-white/[0.08] text-white/40"
                  )}
                  style={isSelected ? { backgroundColor: brand, color: ctaFg } : {}}
                  aria-label={`${dia.fullName} ${isSelected ? "selecionado" : "não selecionado"}`}
                >
                  {dia.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ⚠️ NOTA: Estes inputs de horário não possuem onChange. O desenvolvedor deve fornecer callbacks. */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-[10px] text-white/50 uppercase font-bold ml-1 tracking-widest">Abertura</label>
            <input
              type="time"
              value={horariosLoja.abertura}
              readOnly // temporariamente somente leitura até implementar onChange
              className="w-full rounded-xl border border-white/[0.08] bg-black/30 p-4 text-white outline-none focus:border-white/20 text-base cursor-not-allowed opacity-70"
              style={{ colorScheme: "dark" }}
            />
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-[10px] text-white/50 uppercase font-bold ml-1 tracking-widest">Fechamento</label>
            <input
              type="time"
              value={horariosLoja.fechamento}
              readOnly
              className="w-full rounded-xl border border-white/[0.08] bg-black/30 p-4 text-white outline-none focus:border-white/20 text-base cursor-not-allowed opacity-70"
              style={{ colorScheme: "dark" }}
            />
          </div>
        </div>

        <div className="pt-2 border-t border-white/[0.05] space-y-3">
          <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Pausa (Almoço / Descanso)</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] text-white/50 uppercase font-bold ml-1 tracking-widest">Início Pausa</label>
              <input
                type="time"
                value={horariosLoja.inicio_almoco}
                readOnly
                className="w-full rounded-xl border border-white/[0.08] bg-black/30 p-4 text-white outline-none focus:border-white/20 text-base cursor-not-allowed opacity-70"
                style={{ colorScheme: "dark" }}
              />
            </div>
            <div className="flex-1 space-y-2">
              <label className="text-[10px] text-white/50 uppercase font-bold ml-1 tracking-widest">Fim Pausa</label>
              <input
                type="time"
                value={horariosLoja.fim_almoco}
                readOnly
                className="w-full rounded-xl border border-white/[0.08] bg-black/30 p-4 text-white outline-none focus:border-white/20 text-base cursor-not-allowed opacity-70"
                style={{ colorScheme: "dark" }}
              />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-white/[0.05] space-y-3">
          <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Adicionar dia Fechado (Feriado)</p>
          <div className="flex gap-2">
            <input
              type="date"
              value={novaDataFechada}
              onChange={(e) => onNovaDataFechadaChange(e.target.value)}
              className="flex-1 rounded-xl border border-white/[0.08] bg-black/30 p-4 text-base text-white outline-none focus:border-white/20"
              style={{ colorScheme: "dark" }}
              aria-label="Selecionar data fechada"
            />
            <Button
              onClick={onAddDataFechada}
              className="h-14 w-14 shrink-0 rounded-xl"
              style={{ backgroundColor: brand, color: ctaFg }}
              aria-label="Adicionar data fechada"
            >
              <Plus className="h-6 w-6 stroke-[3px]" />
            </Button>
          </div>
          {horariosLoja.datas_fechadas.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {horariosLoja.datas_fechadas.map((data) => (
                <div key={data} className="flex items-center gap-2 bg-black/40 border border-white/[0.08] pl-4 pr-1 py-1 rounded-full">
                  <span className="text-xs font-bold">{formatarDataBR(data)}</span>
                  <button
                    onClick={() => onRemoveDataFechada(data)}
                    className="h-8 w-8 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
                    aria-label={`Remover data ${formatarDataBR(data)}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Button
          onClick={onSaveHorarios}
          disabled={isSavingHorario}
          className="w-full bg-white/10 hover:bg-white/20 text-white h-14 rounded-xl font-black uppercase text-sm tracking-wider mt-4"
          aria-label="Salvar horários de funcionamento"
        >
          {isSavingHorario ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Save className="h-5 w-5 mr-2" />}
          {isSavingHorario ? "Salvando..." : "Salvar Horários"}
        </Button>
      </Card>
    </div>
  );
}

function EquipeSection({
  barbeiros,
  nBarbeiro,
  imagemBarbeiro,
  isUploadingBarbeiro,
  brand,
  ctaFg,
  glass,
  onNBarbeiroChange,
  onImagemBarbeiroChange,
  onAddBarbeiro,
  onToggleBarbeiroStatus,
  onRemoveBarbeiro,
}: {
  barbeiros: DonoTabConfigProps["barbeiros"];
  nBarbeiro: DonoTabConfigProps["nBarbeiro"];
  imagemBarbeiro: DonoTabConfigProps["imagemBarbeiro"];
  isUploadingBarbeiro: boolean;
  brand: string;
  ctaFg: string;
  glass: React.CSSProperties;
  onNBarbeiroChange: (form: DonoTabConfigProps["nBarbeiro"]) => void;
  onImagemBarbeiroChange: (file: File | null) => void;
  onAddBarbeiro: () => void;
  onToggleBarbeiroStatus: (id: string, ativo: boolean) => void;
  onRemoveBarbeiro: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Users className="h-5 w-5" style={{ color: brand }} />
        <h3 className="font-black text-white uppercase text-lg tracking-tight italic">Equipe de Barbeiros</h3>
      </div>
      <Card className="p-5 sm:p-6 rounded-[22px] border border-white/[0.08] space-y-4" style={glass}>
        <Input
          placeholder="Nome completo do barbeiro"
          className="bg-black/30 border-white/10 h-14 rounded-xl text-base px-4"
          value={nBarbeiro.nome}
          onChange={(e) => onNBarbeiroChange({ ...nBarbeiro, nome: e.target.value })}
          aria-label="Nome do barbeiro"
        />

        <label className="flex items-center justify-center gap-2 h-14 rounded-xl border border-dashed border-white/20 bg-black/20 text-xs uppercase font-black cursor-pointer hover:bg-white/5 transition-colors">
          {imagemBarbeiro ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          ) : (
            <UserCircle2 className="h-5 w-5 opacity-50" />
          )}
          <span className="opacity-80">
            {imagemBarbeiro ? "Foto Selecionada: " + imagemBarbeiro.name.substring(0, 15) : "Anexar Foto do Perfil (Opcional)"}
          </span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onImagemBarbeiroChange(e.target.files?.[0] || null)} />
        </label>

        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="E-mail de acesso"
            className="flex-1 bg-black/30 border-white/10 h-14 rounded-xl text-base px-4"
            value={nBarbeiro.email}
            onChange={(e) => onNBarbeiroChange({ ...nBarbeiro, email: e.target.value })}
            aria-label="E-mail do barbeiro"
          />
          <div className="relative w-full sm:w-32">
            <span className="absolute right-4 top-4 text-zinc-500 font-black">%</span>
            <Input
              placeholder="Comissão"
              type="number"
              className="w-full bg-black/30 border-white/10 h-14 rounded-xl text-base px-4 pr-10"
              value={nBarbeiro.comissao}
              onChange={(e) => onNBarbeiroChange({ ...nBarbeiro, comissao: e.target.value })}
              aria-label="Percentual de comissão"
            />
          </div>
        </div>
        <Input
          placeholder="Senha de acesso"
          type="password"
          className="bg-black/30 border-white/10 h-14 rounded-xl text-base px-4"
          value={nBarbeiro.senha}
          onChange={(e) => onNBarbeiroChange({ ...nBarbeiro, senha: e.target.value })}
          aria-label="Senha do barbeiro"
        />
        <Button
          onClick={onAddBarbeiro}
          disabled={isUploadingBarbeiro}
          className="w-full h-14 rounded-xl font-black uppercase text-sm tracking-wider shadow-lg shadow-black/40"
          style={{ backgroundColor: brand, color: ctaFg }}
          aria-label="Cadastrar profissional"
        >
          {isUploadingBarbeiro ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Plus className="h-5 w-5 mr-2" />}
          {isUploadingBarbeiro ? "Processando..." : "Cadastrar Profissional"}
        </Button>
      </Card>

      <div className="grid gap-3">
        {barbeiros.map((b) => (
          <div key={b.id} className="bg-white/5 border border-white/10 p-4 sm:p-5 rounded-2xl flex items-center justify-between group">
            <div className="flex items-center gap-4">
              {b.url_foto ? (
                <img
                  src={b.url_foto}
                  alt={b.nome}
                  className={cn("h-12 w-12 rounded-full object-cover border-2", b.ativo ? "border-emerald-500" : "border-red-500 grayscale opacity-50")}
                />
              ) : (
                <div
                  className={cn(
                    "h-12 w-12 rounded-full flex items-center justify-center text-lg font-black",
                    b.ativo ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/50" : "bg-red-500/20 text-red-500 border border-red-500/50"
                  )}
                >
                  {b.nome.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className={cn("text-base font-black uppercase italic tracking-tight", !b.ativo && "opacity-50 line-through")}>{b.nome}</p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                  Comissão: <span className="text-white">{b.comissao_pct}%</span>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-12 w-12 text-zinc-500 hover:text-white hover:bg-white/10 rounded-xl"
                onClick={() => onToggleBarbeiroStatus(b.id, !b.ativo)}
                aria-label={b.ativo ? "Desativar barbeiro" : "Ativar barbeiro"}
              >
                {b.ativo ? <PowerOff className="h-6 w-6" /> : <Power className="h-6 w-6" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-12 w-12 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl"
                disabled={b.ativo}
                onClick={() => onRemoveBarbeiro(b.id)}
                aria-label="Remover barbeiro"
              >
                <Trash2 className="h-6 w-6" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ServicosSection({
  servicos,
  nServico,
  imagemServico,
  isUploadingServico,
  brand,
  ctaFg,
  glass,
  onNServicoChange,
  onImagemServicoChange,
  onAddServico,
  onRemoveServico,
}: {
  servicos: DonoTabConfigProps["servicos"];
  nServico: DonoTabConfigProps["nServico"];
  imagemServico: DonoTabConfigProps["imagemServico"];
  isUploadingServico: boolean;
  brand: string;
  ctaFg: string;
  glass: React.CSSProperties;
  onNServicoChange: (form: DonoTabConfigProps["nServico"]) => void;
  onImagemServicoChange: (file: File | null) => void;
  onAddServico: () => void;
  onRemoveServico: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Scissors className="h-5 w-5" style={{ color: brand }} />
        <h3 className="font-black text-white uppercase text-lg tracking-tight italic">Serviços e Tabela de Preços</h3>
      </div>
      <Card className="p-5 sm:p-6 rounded-[22px] border border-white/[0.08] space-y-4" style={glass}>
        <Input
          placeholder="Nome do serviço (ex: Corte Degradê)"
          className="bg-black/30 border-white/10 h-14 rounded-xl text-base px-4"
          value={nServico.nome}
          onChange={(e) => onNServicoChange({ ...nServico, nome: e.target.value })}
          aria-label="Nome do serviço"
        />
        <label className="flex items-center justify-center gap-2 h-14 rounded-xl border border-dashed border-white/20 bg-black/20 text-xs uppercase font-black cursor-pointer hover:bg-white/5 transition-colors">
          {imagemServico ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <ImagePlus className="h-5 w-5 opacity-50" />}
          <span className="opacity-80">{imagemServico ? "Foto: " + imagemServico.name.substring(0, 15) : "Anexar Foto Ilustrativa"}</span>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onImagemServicoChange(e.target.files?.[0] || null)} />
        </label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-4 top-4 text-zinc-500 font-bold">R$</span>
            <Input
              placeholder="0,00"
              type="number"
              className="bg-black/30 border-white/10 h-14 pl-12 rounded-xl text-base"
              value={nServico.preco}
              onChange={(e) => onNServicoChange({ ...nServico, preco: e.target.value })}
              aria-label="Preço do serviço"
            />
          </div>
          <div className="relative w-32 shrink-0">
            <span className="absolute right-4 top-4 text-zinc-500 font-bold text-xs uppercase">Min</span>
            <Input
              placeholder="30"
              type="number"
              className="bg-black/30 border-white/10 h-14 pr-12 pl-4 rounded-xl text-base"
              value={nServico.duracao_minutos}
              onChange={(e) => onNServicoChange({ ...nServico, duracao_minutos: e.target.value })}
              aria-label="Duração em minutos"
            />
          </div>
          <Button
            onClick={onAddServico}
            disabled={isUploadingServico}
            className="h-14 w-14 rounded-xl shrink-0 shadow-lg"
            style={{ backgroundColor: brand, color: ctaFg }}
            aria-label="Adicionar serviço"
          >
            {isUploadingServico ? <Loader2 className="animate-spin h-6 w-6" /> : <Plus className="h-6 w-6" />}
          </Button>
        </div>
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {servicos.map((s) => (
          <div key={s.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between group">
            <div className="flex items-center gap-4">
              {s.url_imagem ? (
                <img src={s.url_imagem} className="h-12 w-12 rounded-xl object-cover border border-white/10" alt={s.nome} />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-black/30 flex items-center justify-center border border-white/5">
                  <Scissors className="h-5 w-5 text-white/20" />
                </div>
              )}
              <div>
                <p className="text-sm font-black uppercase italic tracking-tight">{s.nome}</p>
                <p className="text-[11px] font-black mt-0.5 tracking-widest uppercase" style={{ color: brand }}>
                  R$ {formatarMoedaBR(s.preco)}{" "}
                  <span className="text-zinc-500 font-bold ml-1 opacity-70">• {s.duracao_minutos} min</span>
                </p>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-12 w-12 text-zinc-600 hover:text-red-500 rounded-xl"
              onClick={() => onRemoveServico(s.id)}
              aria-label={`Remover serviço ${s.nome}`}
            >
              <Trash2 className="h-6 w-6" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function BrandingSection({
  imagemLogo,
  imagemFundo,
  previewLogo,
  previewFundo,
  isUploadingBranding,
  brand,
  ctaFg,
  glass,
  onImagemLogoChange,
  onImagemFundoChange,
  onSaveBranding,
}: {
  imagemLogo: DonoTabConfigProps["imagemLogo"];
  imagemFundo: DonoTabConfigProps["imagemFundo"];
  previewLogo: string | null;
  previewFundo: string | null;
  isUploadingBranding: boolean;
  brand: string;
  ctaFg: string;
  glass: React.CSSProperties;
  onImagemLogoChange: (file: File | null) => void;
  onImagemFundoChange: (file: File | null) => void;
  onSaveBranding: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <ImagePlus className="h-5 w-5" style={{ color: brand }} />
        <h3 className="font-black text-white uppercase text-lg tracking-tight italic">Identidade Visual</h3>
      </div>
      <Card className="p-5 sm:p-6 rounded-[22px] border border-white/[0.08] shadow-xl space-y-5" style={glass}>
        <div className="space-y-3">
          <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Logo da Barbearia</p>

          {previewLogo && (
            <div className="h-20 w-20 rounded-2xl border border-white/20 overflow-hidden mb-2 shadow-lg">
              <img src={previewLogo} alt="Preview Logo" className="h-full w-full object-cover" />
            </div>
          )}

          <label className="flex items-center justify-center gap-2 h-14 rounded-xl border border-dashed border-white/20 bg-black/20 text-[10px] uppercase font-black cursor-pointer hover:bg-white/5 transition-colors">
            {imagemLogo ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <ImagePlus className="h-4 w-4 opacity-50" />}
            <span className="opacity-80">{imagemLogo ? "Logo Selecionada (Clique para trocar)" : "Anexar Nova Logo"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onImagemLogoChange(e.target.files?.[0] || null)} />
          </label>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Imagem de Fundo (Capa do App)</p>

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
            <input type="file" accept="image/*" className="hidden" onChange={(e) => onImagemFundoChange(e.target.files?.[0] || null)} />
          </label>
        </div>

        <Button
          onClick={onSaveBranding}
          disabled={isUploadingBranding}
          className="w-full h-14 rounded-2xl font-black uppercase tracking-wider shadow-lg shadow-black/40 mt-2"
          style={{ backgroundColor: brand, color: ctaFg }}
          aria-label="Salvar identidade visual"
        >
          {isUploadingBranding ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Save className="h-5 w-5 mr-2" />}
          {isUploadingBranding ? "Enviando imagens..." : "Salvar Identidade Visual"}
        </Button>
      </Card>
    </div>
  );
}