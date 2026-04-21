import { useState, useMemo, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import { BarbeiroAcoes } from "./barbeiro/BarbeiroAcoes";
import { AgendaBarbeiro } from "./barbeiro/AgendaBarbeiro";
import { ModalNovoAgendamento } from "./barbeiro/ModalNovoAgendamento";
import { useBarbearia, useAgendamentos, useMutacoesAgendamento, useBarbeiros, useServicos } from "@/hooks/useQueries";
import { Loader2, CalendarDays } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function VisaoBarbeiro() {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  
  // Conexões
  const { data: loja } = useBarbearia();
  const { data: agendamentos = [], isLoading: loadAg } = useAgendamentos(slug);
  const { data: barbeiros = [] } = useBarbeiros(slug);
  const { data: servicos = [] } = useServicos(slug);
  const { adicionarAgendamento, atualizarStatusAgendamento } = useMutacoesAgendamento();

  // 🛡️ LÓGICA DE DATA SEM ERRO DE FUSO HORÁRIO
  const getDataLocalString = () => {
    const d = new Date();
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  const [dataSelecionada, setDataSelecionada] = useState(getDataLocalString());
  const [barbeiroSelecionadoId, setBarbeiroSelecionadoId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Forçar atualização do banco quando mudar a data no seletor
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["agendamentos", slug] });
  }, [dataSelecionada, slug]);

  // 🔍 O FILTRO DEFINITIVO
  const agendamentosFiltrados = useMemo(() => {
    return agendamentos.filter((ag) => {
      // Normaliza as datas para o formato YYYY-MM-DD para comparar texto com texto
      const dataFormatadaBanco = String(ag.data).split('T')[0];
      const dataFormatadaSeletor = String(dataSelecionada).split('T')[0];
      
      const dataBate = dataFormatadaBanco === dataFormatadaSeletor;
      const barbeiroBate = barbeiroSelecionadoId ? String(ag.barbeiro_id) === String(barbeiroSelecionadoId) : true;
      
      return dataBate && barbeiroBate;
    });
  }, [agendamentos, dataSelecionada, barbeiroSelecionadoId]);

  const handleNovoAgendamento = async (dados: any) => {
    try {
      const res = await adicionarAgendamento.mutateAsync({
        ag: [dados],
        slug: slug || "",
        idempotencyKey: crypto.randomUUID()
      });
      return res;
    } catch (err: any) {
      return { error: err.message };
    }
  };

  if (loadAg) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-zinc-800" />
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
        isScanning={false}
        onOpenScanner={() => {}}
        onScannerChange={() => {}}
        scannerRef={null as any}
        onOpenModal={() => setIsModalOpen(true)}
      />

      {/* SELETOR DE DATA PARA NAVEGAR NA AGENDA */}
      <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl shadow-xl">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-white/5">
          <CalendarDays className="h-6 w-6" style={{ color: brand }} />
        </div>
        <div className="flex flex-col flex-1">
          <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Exibindo Agenda de:</label>
          <input
            type="date"
            value={dataSelecionada}
            onChange={(e) => setDataSelecionada(e.target.value)}
            className="bg-transparent border-0 text-lg font-black text-white outline-none p-0 appearance-none"
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
        onStatusChange={(id, status) => atualizarStatusAgendamento.mutateAsync({ id, status, slug: slug || "" })}
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
        horariosOcupados={(d, b) => agendamentos.filter(a => String(a.data).split('T')[0] === d && String(a.barbeiro_id) === b).map(a => a.horario)}
        infoLoja={{ abertura: "09:00", fechamento: "21:00" }}
      />
    </div>
  );
}