import { Wallet, Scissors, Calendar, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Props {
  comissaoTotalMes: number;
  totalCortesMes: number;
  nomeBarbeiro: string;
}

export function CarteiraBarbeiro({ comissaoTotalMes, totalCortesMes, nomeBarbeiro }: Props) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-primary/10 p-6 rounded-2xl border border-primary/20">
        <p className="text-sm text-primary font-medium mb-1">Extrato Mensal</p>
        <h2 className="text-2xl font-bold">{nomeBarbeiro} 💸</h2>
      </div>

      <div className="grid gap-4">
        <Card className="p-5 flex items-center gap-4 bg-card border-l-4 border-l-green-500">
          <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
            <Wallet className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold">Minha Comissão</p>
            <p className="text-3xl font-black">R$ {comissaoTotalMes.toFixed(2)}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4 bg-card border-l-4 border-l-primary">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Scissors className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold">Cortes Finalizados</p>
            <p className="text-3xl font-black">{totalCortesMes}</p>
          </div>
        </Card>
      </div>

      <div className="p-4 bg-secondary/30 rounded-xl border border-border">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <Calendar className="h-4 w-4" />
          <span className="text-xs font-medium">Período: Mês Atual</span>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Estes valores são calculados automaticamente com base nos seus atendimentos finalizados.
        </p>
      </div>
    </div>
  );
}