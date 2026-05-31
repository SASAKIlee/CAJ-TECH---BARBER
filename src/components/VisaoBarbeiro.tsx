import { useState, useMemo } from "react";
import { BarbeiroAcoes } from "./barbeiro/BarbeiroAcoes";
import { AgendaBarbeiro } from "./barbeiro/AgendaBarbeiro";
import { ModalNovoAgendamento } from "./barbeiro/ModalNovoAgendamento";
import { CalendarDays } from "lucide-react";

// ==========================================
// TIPOS FORTES (substituindo any)
// ==========================================
interface Barbeiro {
  id: string;
  nome: string;
  comissao_pct: number;
  ativo: boolean;
  url_foto?: string;
}

interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao_minutos: number;
}

interface Agendamento {
  id: string;
  nome_cliente: string;
  telefone_cliente: string;
  data: string;
  horario: string;
  barbeiro_id: string;
  servico_id: string;
  status: string;
  comissao_ganha?: number;
}

export interface VisaoBarbeiroProps {
  barbeiros: Barbeiro[];
  servicos: Servico[];
  agendamentos: Agendamento[];
  barbeiroSelecionadoId: string;
  setBarbeiroSelecionadoId: (id: string) => void;
  dataFiltro: string;
  setDataFiltro: (data: string) => void;
  horariosOcupados: (data: string, bId: string) => string[];
  servicos_find: (id: string) => Servico | undefined;
  isDono: boolean;
  userId?: string;
  corPrimaria: string;
  onNovoAgendamento: (dados: Partial<Agendamento>) => Promise<{ error?: any; success?: boolean }>;
  onStatusChange: (id: string, status: string) => Promise<void>;
  horarioAbertura?: string;
  horarioFechamento?: string;
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
  horarioAbertura = "08:00",
  horarioFechamento = "22:00",
}: VisaoBarbeiroProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ✅ Objeto memoizado — não recria a cada render
  const infoLoja = useMemo(() => ({
    abertura: horarioAbertura,
    fechamento: horarioFechamento,
  }), [horarioAbertura, horarioFechamento]);

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
            <label htmlFor="data-agenda" className="text-[10px] font-black uppercase text-white/40 tracking-widest">
              Data da Agenda
            </label>
            <input
              id="data-agenda"
              type="date"
              value={dataFiltro}
              onChange={(e) => setDataFiltro(e.target.value)}
              className="bg-transparent border-0 text-lg font-black text-white outline-none p-0 cursor-pointer"
              style={{ colorScheme: 'dark' }}
              aria-label="Selecionar data da agenda"
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
        infoLoja={infoLoja}
      />
    </div>
  );
}