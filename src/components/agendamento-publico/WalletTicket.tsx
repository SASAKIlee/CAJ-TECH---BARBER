import QRCode from "react-qr-code";
import { hexToRgba, contrastTextOnBrand } from "@/lib/branding";

export const WALLET_TICKET_CAPTURE_ID = "wallet-ticket-capture";

/**
 * TIPAGENS DO INGRESSO
 */
type BarbeariaConfig = {
  nome?: string | null;
  cor_primaria?: string | null;
  url_logo?: string | null;
};

type SelecaoTicket = {
  servico: { nome?: string; preco?: number } | null;
  barbeiro: { nome?: string } | null;
  data: string;
  horario: string;
  nome: string;
};

type WalletTicketProps = {
  config: BarbeariaConfig | null;
  selecao: SelecaoTicket;
  slug: string | undefined;
  ticketCodigo: string;
};

/**
 * COMPONENTE PRINCIPAL: O Ingresso Digital do Cliente
 */
export function WalletTicket({ config, selecao, slug, ticketCodigo }: WalletTicketProps) {
  
  // --- IDENTIDADE VISUAL ---
  const brand = config?.cor_primaria || "#D4AF37";
  const onBrand = contrastTextOnBrand(brand);
  const logoUrl = config?.url_logo?.trim() || null;
  const nomeBarbearia = config?.nome || "Barbearia";

  // --- FORMATAÇÃO DE DATA ---
  const dataFmt = selecao.data.length >= 10 
    ? selecao.data.split("-").reverse().join("/") 
    : selecao.data;

  /**
   * 🚀 O SEGREDO DO QR CODE (AÇÃO INTELIGENTE)
   * Antes: Era um objeto JSON inútil para a câmera do celular.
   * Agora: É um Link Universal (URL). 
   * Quando o barbeiro escanear, vai abrir o painel da CAJ TECH na página de Check-in para dar baixa no agendamento.
   */
  const dominioBase = window.location.origin; // Ex: https://cajtech.net.br
  const linkCheckin = `${dominioBase}/checkin/${slug}/${ticketCodigo}`;

  return (
    <div
      id={WALLET_TICKET_CAPTURE_ID}
      className="w-full max-w-[340px] mx-auto overflow-hidden rounded-[28px] bg-[#f2f2f7] shadow-[0_25px_80px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.06]"
    >
      {/* Barra de cor da marca (Topo) */}
      <div className="h-2 w-full" style={{ backgroundColor: brand }} aria-hidden />

      {/* CABEÇALHO: LOGO E NOME DA BARBEARIA */}
      <div className="bg-white px-8 pt-8 pb-6 text-center">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={nomeBarbearia}
            crossOrigin="anonymous"
            className="mx-auto h-20 w-20 object-contain mb-4 rounded-xl shadow-sm"
          />
        ) : (
          <div
            className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl text-4xl font-black tracking-tight shadow-sm"
            style={{ backgroundColor: hexToRgba(brand, 0.12), color: brand }}
          >
            {nomeBarbearia.slice(0, 1).toUpperCase()}
          </div>
        )}
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
          Agendamento Confirmado
        </p>
        <h2 className="mt-1 text-2xl font-black tracking-tighter text-zinc-950 italic">
          {nomeBarbearia}
        </h2>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-zinc-300 to-transparent mx-6" />

      {/* CORPO: DADOS DO AGENDAMENTO */}
      <div className="space-y-4 bg-white px-8 py-6">
        <TicketRow label="Serviço Escolhido" value={selecao.servico?.nome ?? "—"} />
        <div className="flex justify-between gap-4">
           <TicketRow label="Data" value={dataFmt} />
           <TicketRow label="Horário" value={selecao.horario || "—"} />
        </div>
        <TicketRow label="Profissional" value={selecao.barbeiro?.nome ?? "—"} valueClassName="uppercase" />
        <TicketRow label="Cliente" value={selecao.nome || "—"} />
        
        {/* Valor em Destaque */}
        <div className="flex justify-between items-baseline pt-3 mt-2 border-t border-dashed border-zinc-200">
          <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Valor a Pagar</span>
          <span className="text-2xl font-black tabular-nums tracking-tighter" style={{ color: brand }}>
            R$ {Number(selecao.servico?.preco ?? 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* RODAPÉ: QR CODE INTELIGENTE */}
      <div className="border-t border-solid border-zinc-200 bg-[#fafafa] px-8 py-8 relative">
        {/* Efeito visual de "picote" de ingresso */}
        <div className="absolute -top-3 -left-3 h-6 w-6 rounded-full bg-[#18181B] shadow-inner" />
        <div className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-[#18181B] shadow-inner" />

        <p className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">
          Apresente na recepção
        </p>
        
        <div className="mx-auto flex justify-center rounded-2xl bg-white p-4 shadow-md ring-1 ring-black/[0.05] w-fit relative group">
          {/* QR Code agora contém o link de check-in */}
          <QRCode value={linkCheckin} size={140} level="H" />
        </div>
        
        <p className="mt-4 text-center font-mono text-[9px] text-zinc-400 tracking-[0.2em] font-bold">
          ID: {ticketCodigo.split('-')[0].toUpperCase()}
        </p>
      </div>

      {/* BARRA INFERIOR DE STATUS */}
      <div
        className="py-4 text-center text-[11px] font-black uppercase tracking-widest"
        style={{ backgroundColor: hexToRgba(brand, 0.15), color: brand }}
      >
        Válido para entrada
      </div>
    </div>
  );
}

/**
 * SUB-COMPONENTE: Linha de informação do ticket
 */
function TicketRow({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string; }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</span>
      <span className={`text-sm font-black leading-snug text-zinc-800 tracking-tight ${valueClassName ?? ""}`}>
        {value}
      </span>
    </div>
  );
}