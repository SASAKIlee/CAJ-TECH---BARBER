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

  // 🛡️ DATA LOCAL SEM ERRO DE FUSO: Garante YYYY-MM-DD
  const getHojeFormatado = () => {
    const d = new Date();
    const z = d.getTimezoneOffset() * 60 * 1000;
    const local = new Date(d.getTime() - z);
    return local.toISOString().split('T')[0];
  };

  const [dataSelecionada, setDataSelecionada] = useState(getHojeFormatado());
  const [barbeiroSelecionadoId, setBarbeiroSelecionadoId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 🔄 REFRESH AUTOMÁTICO: Invalida o cache toda vez que mudar a data ou slug
  useEffect(() => {
    if (slug) {
      queryClient.invalidateQueries({ queryKey: ["agendamentos", slug] });
    }
  }, [dataSelecionada, slug, queryClient]);

  // 🔍 FILTRO REFORÇADO (Normalizando strings e datas)
  const agendamentosFiltrados = useMemo(() => {
    return agendamentos.filter((ag) => {
      // 1. Normaliza data (remove o T00:00:00.000Z se existir)
      const dataAgStr = String(ag.data).substring(0, 10);
      const bateData = dataAgStr === dataSelecionada;

      // 2. Normaliza ID do barbeiro para string (evita erro de comparação UUID vs String)
      const idFiltro = String(barbeiroSelecionadoId || "").trim();
      const idAg = String(ag.barbeiro_id || "").trim();
      const bateBarbeiro = idFiltro === "" || idAg === idFiltro;

      return bateData && bateBarbeiro;
    });
  }, [agendamentos, dataSelecionada, barbeiroSelecionadoId]);

  const handleNovoAgendamento = async (dados: any) => {
    try {
      const res = await adicionarAgendamento.mutateAsync({
        ag: [dados],
        slug: slug || "",
        idempotencyKey: window.crypto.randomUUID()
      });
      // Força a atualização imediata após agendar
      queryClient.invalidateQueries({ queryKey: ["agendamentos", slug] });
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

      {/* SELETOR DE DATA OBRIGATÓRIO */}
      <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-4 rounded-2xl shadow-xl">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-white/5">
          <CalendarDays className="h-6 w-6" style={{ color: brand }} />
        </div>
        <div className="flex flex-col flex-1">
          <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Navegar na Agenda:</label>
          <input
            type="date"
            value={dataSelecionada}
            onChange={(e) => setDataSelecionada(e.target.value)}
            className="bg-transparent border-0 text-lg font-black text-white outline-none p-0 appearance-none cursor-pointer"
            style={{ colorScheme: 'dark' }}
          />
        </div>
      </div>

      <AgendaBarbeiro
        agendamentos={agendamentosFiltrados}
        barbeiros={barbeiros}
        servicos_find={(id) => servicos.find(s => String(s.id) === String(id))}
        brand={brand}
        infoLojaNome={loja?.nome || "Barbearia"}
        onStatusChange={(id, status) => {
          return atualizarStatusAgendamento.mutateAsync({ id, status, slug: slug || "" })
            .then(() => queryClient.invalidateQueries({ queryKey: ["agendamentos", slug] }));
        }}
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
        horariosOcupados={(d, b) => 
          agendamentos
            .filter(a => String(a.data).substring(0, 10) === d && String(a.barbeiro_id) === String(b))
            .map(a => a.horario)
        }
        infoLoja={{ abertura: "08:00", fechamento: "22:00" }}
      />
    </div>
  );
}