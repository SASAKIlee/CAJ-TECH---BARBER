import { Lock, QrCode, Timer, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DonoBloqueioProps } from "@/types/dono";

const formatarMoedaBR = (valor: number) => {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor || 0);
};

const formatarTempo = (segundos: number) => {
  const m = Math.floor(segundos / 60).toString().padStart(2, "0");
  const s = (segundos % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

export function DonoBloqueio({
  motivo,
  planoAtual,
  pixGerado,
  tempoPix,
  isGerandoPix,
  onGerarPix,
  onCopiarPix,
  onRenovacaoClick,
  getValorPlano,
}: DonoBloqueioProps) {
  if (motivo === "manual") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
        <div className="h-28 w-28 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-6 shadow-2xl">
          <Lock className="h-12 w-12 text-red-500" />
        </div>
        <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-3">Acesso Suspenso</h2>
        <p className="text-zinc-400 max-w-md text-sm leading-relaxed mb-6">
          Sua barbearia encontra-se pendente de regularização. Fale com nosso suporte.
        </p>
        <Button onClick={() => window.open("https://wa.me/5517992051576")} className="bg-zinc-800 h-14 px-8 rounded-2xl font-black uppercase tracking-widest">
          Suporte CAJ TECH
        </Button>
      </div>
    );
  }

  // Bloqueio por inadimplência
  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] px-4 py-10">
      <div className="bg-zinc-900 border border-red-500/40 p-8 rounded-[40px] max-w-md w-full text-center space-y-6 shadow-[0_0_80px_rgba(239,68,68,0.15)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
        <Lock className="w-16 h-16 text-red-500 mx-auto opacity-20 absolute -top-4 -right-4 rotate-12" />
        <div className="space-y-2 relative z-10">
          <h2 className="text-3xl font-black text-white uppercase italic leading-none">
            Sistema
            <br />
            Bloqueado
          </h2>
          <p className="text-zinc-400 text-sm font-medium">Renove sua assinatura para religar sua agenda online imediatamente.</p>
        </div>
        <div className="bg-black/50 border border-zinc-800 p-5 rounded-3xl relative z-10">
          <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Plano Atual: {planoAtual}</p>
          <p className="text-4xl font-black text-white italic">R$ {formatarMoedaBR(getValorPlano(planoAtual))}</p>
        </div>
        {!pixGerado ? (
          <Button
            onClick={onRenovacaoClick}
            disabled={isGerandoPix}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black h-16 rounded-2xl shadow-xl uppercase italic tracking-widest text-base relative z-10"
          >
            <span className="flex items-center justify-center gap-2">
              <QrCode className="h-5 w-5" /> Pagar via PIX Agora
            </span>
          </Button>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 relative z-10">
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center justify-center gap-2 mb-2">
                <Timer className="h-4 w-4 animate-pulse" /> Expira em {formatarTempo(tempoPix)}
              </p>
              <Button
                onClick={onCopiarPix}
                className="w-full mt-3 bg-emerald-500 text-black hover:bg-emerald-400 font-black h-12 rounded-xl flex items-center justify-center gap-2"
              >
                <Copy className="h-4 w-4" /> Copiar Código PIX
              </Button>
            </div>
            <p className="text-[9px] text-zinc-500 font-medium italic">
              O sistema será desbloqueado automaticamente até 1 minuto após o pagamento.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
