import { X, CheckCircle, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DonoModalRenovacaoProps } from "@/types/dono";

const formatarMoedaBR = (valor: number) => {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor || 0);
};

const VALORES_PLANO: Record<string, number> = {
  starter: 50.0,
  pro: 99.9,
  elite: 497.0,
};

const formatarTempo = (segundos: number) => {
  const m = Math.floor(segundos / 60).toString().padStart(2, "0");
  const s = (segundos % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

export function DonoModalRenovacao({
  open,
  onClose,
  planoAtual,
  pixGerado,
  tempoPix,
  isGerandoPix,
  onGerarPix,
  onCopiarPix,
}: DonoModalRenovacaoProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm rounded-[32px] p-8 space-y-6 relative shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
        <button
          onClick={() => {
            onClose();
          }}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="text-center space-y-2">
          <h2 className="text-white font-black uppercase italic text-2xl tracking-tighter">Pagamento Seguro</h2>
          <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">
            Plano {planoAtual} • R$ {formatarMoedaBR(VALORES_PLANO[planoAtual] || 0)}
          </p>
        </div>

        {!pixGerado ? (
          <Button
            onClick={onGerarPix}
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
              <Button
                onClick={onCopiarPix}
                className="w-full bg-emerald-500 text-black hover:bg-emerald-400 font-black h-14 rounded-xl flex items-center gap-2 text-sm"
              >
                <Copy className="h-5 w-5" /> Copiar Código
              </Button>
              <p className="text-[10px] font-bold text-emerald-500/70 uppercase mt-3">Expira em {formatarTempo(tempoPix)}</p>
            </div>
            <p className="text-[9px] text-zinc-500 text-center font-medium italic">
              A tela será atualizada sozinha após o pagamento.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
