import { useState, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { BarbeiroAcoes } from "./barbeiro/BarbeiroAcoes";
import { AgendaBarbeiro } from "./barbeiro/AgendaBarbeiro";
import { ModalNovoAgendamento } from "./barbeiro/ModalNovoAgendamento";
import { useBarbearia, useAgendamentos, useMutacoesAgendamento, useBarbeiros, useServicos } from "@/hooks/useQueries";
import { Loader2, CalendarDays } from "lucide-react";

export function VisaoBarbeiro() {
  const { slug } = useParams<{ slug: string }>();
  
  // Conexões com o Banco
  const { data: loja, isLoading: loadLoja } = useBarbearia();
  const { data: agendamentos = [], isLoading: loadAg } = useAgendamentos(slug);
  const { data: barbeiros = [] } = useBarbeiros(slug);
  const { data: servicos = [] } = useServicos(slug);
  const { adicionarAgendamento, atualizarStatusAgendamento } = useMutacoesAgendamento();

  // Estados da Tela
  const [barbeiroSelecionadoId, setBarbeiroSelecionadoId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<HTMLInputElement>(null);

  // 🛡️ Pegamos a data de hoje como texto puro (YYYY-MM-DD) para iniciar o calendário
  const hojeStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Novo estado: Permite ao barbeiro navegar pelos dias!
  const [dataSelecionada, setDataSelecionada] = useState(hojeStr);

  // Filtra os agendamentos pela DATA ESCOLHIDA no calendário
  const agendamentosDoDia = useMemo(() => {
    return agendamentos.filter((ag) => ag.data === dataSelecionada);
  }, [agendamentos, dataSelecionada]);

  // Filtra pelo barbeiro se algum estiver selecionado
  const agendamentosFiltrados = useMemo(() => {
    if (barbeiroSelecionadoId) {
      return agendamentosDoDia.filter(ag => ag.barbeiro_id === barbeiroSelecionadoId);
    }
    return agendamentosDoDia;
  }, [agendamentosDoDia, barbeiroSelecionadoId]);

  const handleNovoAgendamento = async (dados: any) => {
    try {
      await adicionarAgendamento.mutateAsync({
        ag: [dados],
        slug: slug || "",
        idempotencyKey: typeof crypto !== 'undefined' ? crypto.randomUUID() : Date.now().toString()
      });
      return { success: true };
    } catch (err: any) {
      return { error: err.message || "Erro ao salvar no banco." };
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    await atualizarStatusAgendamento.mutateAsync({ id, status, slug: slug || "" });
  };

  const horariosOcupados = (dataCalc: string, bId: string) => {
    return agendamentos
      .filter(ag => ag.data === dataCalc && ag.barbeiro_id === bId && ag.status !== "Cancelado")
      .map(ag => ag.horario);
  };

  if (loadLoja || loadAg) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <Loader2 className="animate-spin h-10 w-10 opacity-50" />
      </div>
    );
  }

  const brand = loja?.cor_primaria || "#D4AF37";

  return (
    <div className="flex flex-col gap-4 pb-32 pt-4 px-4 min-h-screen text-white relative bg-black">
      <BarbeiroAcoes
        isDono={loja?.isDono ?? false}
        barbeiros={barbeiros}
        barbeiroSelecionadoId={barbeiroSelecionadoId}
        setBarbeiroSelecionadoId={setBarbeiroSelecionadoId}
        brand={brand}
        ctaFg="#000000"
        isScanning={isScanning}
        onOpenScanner={() => {}}
        onScannerChange={() => {}}
        scannerRef={scannerRef}
        onOpenModal={() => setIsModalOpen(true)}
      />

      {/* NOVO: Seletor de Data para o Barbeiro navegar na Agenda */}
      <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-2 sm:p-3 rounded-2xl shadow-lg">
        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${brand}20` }}>
          <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: brand }} />
        </div>
        <div className="flex flex-col flex-1">
          <label className="text-[9px] sm:text-[10px] font-black uppercase text-white/50 tracking-widest ml-1">
            Data da Agenda
          </label>
          <input
            type="date"
            value={dataSelecionada}
            onChange={(e) => setDataSelecionada(e.target.value)}
            className="w-full bg-transparent border-0 text-sm sm:text-base font-bold text-white outline-none focus:ring-0 p-0 ml-1"
            style={{ colorScheme: 'dark' }}
          />
        </div>
      </div>

      <AgendaBarbeiro
        agendamentos={agendamentosFiltrados}
        barbeiros={barbeiros}
        servicos_find={(id) => servicos.find(s => s.id === id)}
        brand={brand}
        infoLojaNome={loja?.nome || "Barbearia"}
        onStatusChange={handleStatusChange}
      />

      <ModalNovoAgendamento
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        brand={brand}
        ctaFg="#000000"
        barbeiros={barbeiros}
        servicos={servicos}
        barbeiroSelecionadoId={barbeiroSelecionadoId}
        onNovoAgendamento={handleNovoAgendamento}
        horariosOcupados={horariosOcupados}
        infoLoja={{ abertura: "09:00", fechamento: "20:00" }}
      />
    </div>
  );
}