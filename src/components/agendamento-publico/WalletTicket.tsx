import QRCode from "react-qr-code";
import { hexToRgba, contrastTextOnBrand } from "@/lib/branding";

export const WALLET_TICKET_CAPTURE_ID = "wallet-ticket-capture";

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

export function WalletTicket({ config, selecao, slug, ticketCodigo }: WalletTicketProps) {
  const brand = config?.cor_primaria || "#D4AF37";
  const onBrand = contrastTextOnBrand(brand);
  const logoUrl = config?.url_logo?.trim() || null;
  const nomeBarbearia = config?.nome || "Barbearia";

  const dataFmt =
    selecao.data.length >= 10
      ? selecao.data.split("-").reverse().join("/")
      : selecao.data;

  const qrPayload = JSON.stringify({
    v: 1,
    slug: slug ?? "",
    ref: ticketCodigo,
    data: selecao.data,
    horario: selecao.horario,
  });

  return (
    <div
      id={WALLET_TICKET_CAPTURE_ID}
      className="w-full max-w-[340px] mx-auto overflow-hidden rounded-[28px] bg-[#f2f2f7] shadow-[0_25px_80px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.06]"
    >
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: brand }}
        aria-hidden
      />

      <div className="bg-white px-8 pt-10 pb-8 text-center">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={nomeBarbearia}
            crossOrigin="anonymous"
            className="mx-auto h-16 w-16 object-contain mb-5"
          />
        ) : (
          <div
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold tracking-tight"
            style={{
              backgroundColor: hexToRgba(brand, 0.12),
              color: brand,
            }}
          >
            {nomeBarbearia.slice(0, 1).toUpperCase()}
          </div>
        )}
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Agendamento
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">{nomeBarbearia}</h2>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-zinc-300 to-transparent mx-6" />

      <div className="space-y-5 bg-white px-8 py-7">
        <TicketRow label="Serviço" value={selecao.servico?.nome ?? "—"} />
        <TicketRow label="Data" value={dataFmt} />
        <TicketRow label="Horário" value={selecao.horario || "—"} />
        <TicketRow
          label="Profissional"
          value={selecao.barbeiro?.nome ?? "—"}
          valueClassName="uppercase"
        />
        <TicketRow label="Cliente" value={selecao.nome || "—"} />
        <div className="flex justify-between items-baseline pt-1">
          <span className="text-xs font-medium text-zinc-400">Valor</span>
          <span className="text-xl font-bold tabular-nums" style={{ color: brand }}>
            R$ {Number(selecao.servico?.preco ?? 0).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="border-t border-dashed border-zinc-200 bg-[#fafafa] px-8 py-8">
        <p className="text-center text-[10px] font-medium uppercase tracking-wider text-zinc-400 mb-4">
          Apresente na chegada
        </p>
        <div className="mx-auto flex justify-center rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04] w-fit">
          <QRCode value={qrPayload} size={132} level="M" />
        </div>
        <p className="mt-4 text-center font-mono text-[10px] text-zinc-400 tracking-wide">
          {ticketCodigo.slice(0, 8).toUpperCase()}…
        </p>
      </div>

      <div
        className="py-4 text-center text-[11px] font-semibold"
        style={{ backgroundColor: hexToRgba(brand, 0.14), color: onBrand }}
      >
        Confirmado
      </div>
    </div>
  );
}

function TicketRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-zinc-400">{label}</span>
      <span
        className={`text-[15px] font-semibold leading-snug text-zinc-950 tracking-tight ${valueClassName ?? ""}`}
      >
        {value}
      </span>
    </div>
  );
}
