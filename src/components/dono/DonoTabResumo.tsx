import { useCallback } from "react";
import { Scissors, Copy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { StatCard } from "./StatCard";
import { DonoTabResumoProps } from "@/types/dono";

export function DonoTabResumo({ slug, stats, brand, ctaFg, glass }: DonoTabResumoProps) {
  const linkCompleto = slug ? `https://${window.location.host}/agendar/${slug}` : "";
  const linkDisplay = slug ? `${window.location.host}/agendar/${slug}` : "Link não disponível";

  const handleCopyLink = useCallback(() => {
    if (!linkCompleto) {
      toast.error("Slug não definido para esta barbearia.");
      return;
    }
    navigator.clipboard.writeText(linkCompleto);
    toast.success("Link copiado!");
  }, [linkCompleto]);

  return (
    <>
      <section>
        <Card className="relative overflow-hidden rounded-[22px] border border-white/[0.08] p-5 shadow-2xl" style={glass}>
          <div className="absolute -right-4 -top-4 opacity-[0.07]">
            <Scissors className="h-24 w-24 rotate-12" style={{ color: brand }} />
          </div>
          <p className="text-[10px] uppercase font-bold tracking-[0.25em] mb-3" style={{ color: brand }}>
            Link de Agendamento
          </p>
          <div className="rounded-xl border border-white/[0.08] bg-black/35 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-md">
            <code className="text-[11px] text-zinc-300 font-mono truncate">{linkDisplay}</code>
            <Button
              size="sm"
              className="h-10 px-6 rounded-xl font-black uppercase text-[10px] w-full sm:w-auto disabled:opacity-50"
              style={{ backgroundColor: brand, color: ctaFg }}
              onClick={handleCopyLink}
              aria-label="Copiar link de agendamento"
              disabled={!slug}
            >
              <Copy className="h-4 w-4 mr-2" aria-hidden="true" />
              Copiar Link
            </Button>
          </div>
        </Card>
      </section>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard label="Entradas hoje" value={stats.faturamentoHoje} brand={brand} />
        <StatCard label="Lucro real hoje" value={stats.lucroRealHoje} brand={brand} highlight />
        <StatCard label="Faturamento mês" value={stats.faturamentoMensal} brand={brand} />
        <StatCard label="Comissões hoje" value={stats.comissoesAPagarHoje} brand={brand} />
      </div>
    </>
  );
}