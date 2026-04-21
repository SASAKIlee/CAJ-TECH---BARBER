import { useState, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import { BarbeiroAcoes } from "./barbeiro/BarbeiroAcoes";
import { AgendaBarbeiro } from "./barbeiro/AgendaBarbeiro";
import { ModalNovoAgendamento } from "./barbeiro/ModalNovoAgendamento";
import { useBarbearia, useAgendamentos, useMutacoesAgendamento, useBarbeiros, useServicos } from "@/hooks/useQueries";
import { Loader2 } from "lucide-react";

export function VisaoBarbeiro() {
  const { slug } = useParams<{ slug: string }>();
  
  // Conexões com o Banco (useQueries.ts)
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

  // 🛡️ BLINDAGEM DE DATA: Usa apenas Texto (YYYY-MM-DD), nunca getFullYear()
  const hojeStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const agendamentosHoje = useMemo(() => {
    return agendamentos.filter((ag) => ag.data === hojeStr);
  }, [agendamentos, hojeStr]);

  const agendamentosFiltrados = useMemo(() => {
    if (barbeiroSelecionadoId) {
      return agendamentosHoje.filter(ag => ag.barbeiro_id === barbeiroSelecionadoId);
    }
    return agendamentosHoje;
  }, [agendamentosHoje, barbeiroSelecionadoId]);

  // Função que envia o Formato Exato que o useQueries.ts exige
  const handleNovoAgendamento = async (dados: any) => {
    try {
      await adicionarAgendamento.mutateAsync({
        ag: [dados], // O hook exige um Array
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

  return (
    <div className="flex flex-col gap-4 pb-32 pt-4 px-4 min-h-screen text-white relative bg-black">
      <BarbeiroAcoes
        isDono={loja?.isDono ?? false}
        barbeiros={barbeiros}
        barbeiroSelecionadoId={barbeiroSelecionadoId}
        setBarbeiroSelecionadoId={setBarbeiroSelecionadoId}
        brand={loja?.cor_primaria || "#D4AF37"}
        ctaFg="#000000"
        isScanning={isScanning}
        onOpenScanner={() => {}}
        onScannerChange={() => {}}
        scannerRef={scannerRef}
        onOpenModal={() => setIsModalOpen(true)}
      />

      <AgendaBarbeiro
        agendamentos={agendamentosFiltrados}
        barbeiros={barbeiros}
        servicos_find={(id) => servicos.find(s => s.id === id)}
        brand={loja?.cor_primaria || "#D4AF37"}
        infoLojaNome={loja?.nome || "Barbearia"}
        onStatusChange={handleStatusChange}
      />

      <ModalNovoAgendamento
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        brand={loja?.cor_primaria || "#D4AF37"}
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