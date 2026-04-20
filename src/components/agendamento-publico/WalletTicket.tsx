import QRCode from "react-qr-code";
import { hexToRgba, contrastTextOnBrand } from "@/lib/branding";

export const WALLET_TICKET_CAPTURE_ID = "wallet-ticket-capture";

type BarbeariaConfig = {
  nome?: string | null;
  cor_primaria?: string | null;
  url_logo?: string | null;
};

type ServicoItem = {
  id: string;
  nome: string;
  preco: number;
  duracao_minutos?: number;
};

type SelecaoBase = {
  barbeiro: { nome?: string } | null;
  data: string;
  horario: string;
  nome: string;
};

type WalletTicketProps = {
  config: BarbeariaConfig | null;
  selecao: SelecaoBase;
  slug: string | undefined;
  ticketCodigo: string;
  servicos?: ServicoItem[];
  precoTotal?: number;
  duracaoTotal?: number;
  checkinHabilitado?: boolean; // 🆕 Prop opcional para controlar exibição do QR Code
};

export function WalletTicket({
  config,
  selecao,
  slug,
  ticketCodigo,
  servicos = [],
  precoTotal = 0,
  duracaoTotal = 30,
  checkinHabilitado = false, // padrão desabilitado
}: WalletTicketProps) {
  const brand = config?.cor_primaria || "#D4AF37";
  const onBrand = contrastTextOnBrand(brand);
  const logoUrl = config?.url_logo?.trim() || null;
  const nomeBarbearia = config?.nome || "Barbearia";

  const dataFmt = selecao.data.length >= 10
    ? selecao.data.split("-").reverse().join("/")
    : selecao.data;

  const dominioBase = typeof window !== "undefined" ? window.location.origin : "";
  const slugSeguro = (slug ?? "").trim();
  const linkCheckin =
    slugSeguro && ticketCodigo
      ? `${dominioBase}/checkin/${encodeURIComponent(slugSeguro)}/${encodeURIComponent(ticketCodigo)}`
      : "";

  const servicosNomes = servicos.map(s => s.nome);
  const servicosDisplay = servicosNomes.length <= 2
    ? servicosNomes.join(" + ")
    : `${servicosNomes.slice(0, 2).join(" + ")} +${servicosNomes.length - 2}`;

  return (
    <div
      id={WALLET_TICKET_CAPTURE_ID}
      className="w-full max-w-[340px] mx-auto overflow-hidden rounded-[28px] bg-[#f2f2f7] shadow-[0_25px_80px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.06]"
    >
      <div className="h-2 w-full" style={{ backgroundColor: brand }} aria-hidden />

      {/* Cabeçalho */}
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

      {/* Corpo - Detalhes do agendamento */}
      <div className="space-y-4 bg-white px-8 py-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
            {servicos.length > 1 ? "Serviços" : "Serviço Escolhido"}
          </span>
          <div className="mt-1 text-sm font-black text-zinc-800 tracking-tight">
            {servicosDisplay}
          </div>
          {servicos.length > 2 && (
            <div className="text-[9px] text-zinc-500 mt-0.5">
              {servicosNomes.slice(2).join(" • ")}
            </div>
          )}
        </div>

        <div className="flex justify-between gap-4">
          <TicketRow label="Data" value={dataFmt} />
          <TicketRow label="Horário" value={selecao.horario || "—"} />
        </div>

        <TicketRow label="Profissional" value={selecao.barbeiro?.nome ?? "—"} valueClassName="uppercase" />
        <TicketRow label="Cliente" value={selecao.nome || "—"} />

        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
          <span className="font-bold uppercase tracking-widest">Duração total:</span>
          <span className="font-black">{duracaoTotal} min</span>
        </div>

        <div className="flex justify-between items-baseline pt-3 mt-2 border-t border-dashed border-zinc-200">
          <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Valor a Pagar</span>
          <span className="text-2xl font-black tabular-nums tracking-tighter" style={{ color: brand }}>
            R$ {precoTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Rodapé: QR sempre visível (check-in na página ainda respeita checkin_habilitado na barbearia) */}
      <div className="border-t border-solid border-zinc-200 bg-[#fafafa] px-8 py-8 relative">
        <div className="absolute -top-3 -left-3 h-6 w-6 rounded-full bg-[#18181B] shadow-inner" />
        <div className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-[#18181B] shadow-inner" />

        <p className="text-center text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">
          Apresente na recepção
        </p>

        {linkCheckin ? (
          <div className="mx-auto flex justify-center rounded-2xl bg-white p-4 shadow-md ring-1 ring-black/[0.05] w-fit relative group">
            <QRCode value={linkCheckin} size={140} level="H" />
          </div>
        ) : (
          <p className="text-center text-xs font-bold text-amber-700">Não foi possível montar o link do ticket.</p>
        )}

        {!checkinHabilitado && (
          <p className="mt-3 text-center text-[9px] text-zinc-500 font-medium leading-relaxed px-2">
            O check-in por QR fica disponível quando o dono ativa &quot;Check-in digital&quot; em Ajustes. Você pode apresentar este ticket na recepção.
          </p>
        )}

        <p className="mt-4 text-center font-mono text-[9px] text-zinc-400 tracking-[0.2em] font-bold">
          ID: {ticketCodigo.split("-")[0].toUpperCase()}
        </p>
      </div>

      {/* Barra inferior */}
      <div
        className="py-4 text-center text-[11px] font-black uppercase tracking-widest"
        style={{ backgroundColor: hexToRgba(brand, 0.15), color: brand }}
      >
        Válido para entrada
      </div>
    </div>
  );
}

function TicketRow({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</span>
      <span className={`text-sm font-black leading-snug text-zinc-800 tracking-tight ${valueClassName ?? ""}`}>
        {value}
      </span>
    </div>
  );
}