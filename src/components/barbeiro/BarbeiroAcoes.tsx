import { motion } from "framer-motion";
import { Plus, LayoutDashboard, Scissors, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const MotionButton = motion.create(Button);

interface BarbeiroAcoesProps {
  isDono: boolean;
  barbeiros: any[];
  barbeiroSelecionadoId: string;
  setBarbeiroSelecionadoId: (id: string) => void;
  brand: string;
  ctaFg: string;
  onOpenModal: () => void; // A peça que estava faltando!
}

export function BarbeiroAcoes({
  isDono,
  barbeiros,
  barbeiroSelecionadoId,
  setBarbeiroSelecionadoId,
  brand,
  ctaFg,
  onOpenModal,
}: BarbeiroAcoesProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Linha de Título e Botão de Novo Agendamento */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">
          Agenda <span style={{ color: brand }}>Digital</span>
        </h2>
        
        <MotionButton
          whileTap={{ scale: 0.95 }}
          onClick={onOpenModal}
          className="h-12 px-6 rounded-xl font-black uppercase text-xs tracking-widest border-0 shadow-lg"
          style={{ backgroundColor: brand, color: ctaFg }}
        >
          <Plus className="h-5 w-5 mr-1.5 stroke-[3px]" />
          Novo Horário
        </MotionButton>
      </div>

      {/* Filtro de Barbeiros */}
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-2 rounded-2xl">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-white/5 shrink-0">
          <Scissors className="h-5 w-5 text-zinc-500" />
        </div>
        
        <Select 
          value={barbeiroSelecionadoId} 
          onValueChange={setBarbeiroSelecionadoId}
        >
          <SelectTrigger className="flex-1 bg-transparent border-0 text-white font-bold h-10 focus:ring-0">
            <SelectValue placeholder="Filtrar por Profissional" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800 text-white rounded-xl">
            <SelectItem value="all">Todos os Profissionais</SelectItem>
            {barbeiros.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isDono && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5"
            onClick={() => window.location.href = '/admin'}
          >
            <LayoutDashboard className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}