import { useState } from "react";
import { BarbeiroAcoes } from "./barbeiro/BarbeiroAcoes";
import { AgendaBarbeiro } from "./barbeiro/AgendaBarbeiro";
import { ModalNovoAgendamento } from "./barbeiro/ModalNovoAgendamento";
import { CalendarDays } from "lucide-react";

export interface VisaoBarbeiroProps {
  barbeiros: any[];
  servicos: any[];
  agendamentos: any[];
  barbeiroSelecionadoId: string;
  setBarbeiroSelecionadoId: (id: string) => void;
  dataFiltro: string;
  setDataFiltro: (data: string) => void;
  horariosOcupados: (data: string, bId: string) => string[];
  servicos_find: (id: string) => any;
  isDono: boolean;
  userId?: string;
  corPrimaria: string;
  onNovoAgendamento: (dados: any) => Promise<{ error?: any; success?: boolean }>;
  onStatusChange: (id: string, status: string) => Promise<void>;
  checkinHabilitado?: boolean;
  planoAtual?: string;
  pixGerado?: string | null;
  tempoPix?: number;
  isGerandoPix?: boolean;
  onGerarPix?: () => void;
  onCopiarPix?: () => void;
  onRenovacaoClick?: () => void;
  getValorPlano?: (plano: string) => number;
}

export function VisaoBarbeiro({
  barbeiros,
  servicos,
  agendamentos,
  barbeiroSelecionadoId,
  setBarbeiroSelecionadoId,
  dataFiltro,
  setDataFiltro,
  horariosOcupados,
  servicos_find,
  isDono,
  corPrimaria,
  onNovoAgendamento,
  onStatusChange,
}: VisaoBarbeiroProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 relative">
      <BarbeiroAcoes
        isDono={isDono}
        barbeiros={barbeiros}
        barbeiroSelecionadoId={barbeiroSelecionadoId}
        setBarbeiroSelecionadoId={setBarbeiroSelecionadoId}
        brand={corPrimaria}
        ctaFg="#000000"
        onOpenModal={() => setIsModalOpen(true)}
      />

      <div className="flex flex-col gap-2 bg-white/5 border border-white/10 p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6" style={{ color: corPrimaria }} />
          <div className="flex flex-col flex-1">
            <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Data da Agenda</label>
            <input
              type="date"
              value={dataFiltro}
              onChange={(e) => setDataFiltro(e.target.value)}
              className="bg-transparent border-0 text-lg font-black text-white outline-none p-0 cursor-pointer"
              style={{ colorScheme: 'dark' }}
            />
          </div>
        </div>
      </div>

      <AgendaBarbeiro
        agendamentos={agendamentos}
        barbeiros={barbeiros}
        servicos_find={servicos_find}
        brand={corPrimaria}
        infoLojaNome="Barbearia"
        onStatusChange={onStatusChange}
      />

      <ModalNovoAgendamento
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        brand={corPrimaria}
        ctaFg="#000000"
        barbeiros={barbeiros}
        servicos={servicos}
        barbeiroSelecionadoId={barbeiroSelecionadoId}
        onNovoAgendamento={onNovoAgendamento}
        horariosOcupados={horariosOcupados}
        infoLoja={{ abertura: "08:00", fechamento: "22:00" }}
      />
    </div>
  );
}