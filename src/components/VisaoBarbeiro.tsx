import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { BarbeiroAcoes } from "./barbeiro/BarbeiroAcoes";
import { AgendaBarbeiro } from "./barbeiro/AgendaBarbeiro";
import { ModalNovoAgendamento } from "./barbeiro/ModalNovoAgendamento";
import { useBarbearia, useAgendamentos, useMutacoesAgendamento, useBarbeiros, useServicos } from "@/hooks/useQueries";
import { Loader2, CalendarDays, Database } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function VisaoBarbeiro() {
  const { slug } = useParams<{ slug: string }>();
  const queryClient = useQueryClient();
  const normalizedSlug = useMemo(() => slug?.toLowerCase() || "", [slug]);

  const { data: loja } = useBarbearia();
  const { data: agendamentos = [], isLoading: loadAg } = useAgendamentos(normalizedSlug);
  const { data: barbeiros = [] } = useBarbeiros(normalizedSlug);
  const { data: servicos = [] } = useServicos(normalizedSlug);
  const { adicionarAgendamento, atualizarStatusAgendamento } = useMutacoesAgendamento();

  // Função para garantir que qualquer data vire YYYY-MM-DD
  const formatarParaCompara = (dataIndefinida: any) => {
    if (!dataIndefinida) return "";
    try {
      if (typeof dataIndefinida === 'string') {
        return dataIndefinida.split('T')[0];
      }
      return new Date(dataIndefinida).toISOString().split('T')[0];
    } catch {
      return String(dataIndefinida).substring(0, 10);
    }
  };

  const hoje = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [dataSelecionada, setDataSelecionada] = useState(hoje);
  const [barbeiroSelecionadoId, setBarbeiroSelecionadoId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filtro Ultra-Resiliente
  const agendamentosFiltrados = useMemo(() => {
    return agendamentos.filter((ag) => {
      const dataFormatadaBanco = formatarParaCompara(ag.data);
      const dataFormatadaFiltro = formatarParaCompara(dataSelecionada);
      
      const bateData = dataFormatadaBanco === dataFormatadaFiltro;
      
      const idFiltro = String(barbeiroSelecionadoId || "").trim();
      const idAg = String(ag.barbeiro_id || "").trim();
      const bateBarbeiro = idFiltro === "" || idAg === idFiltro;

      return bateData && bateBarbeiro;
    });
  }, [agendamentos, dataSelecionada, barbeiroSelecionadoId]);

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
        onOpenModal={() => setIsModalOpen(true)}
      />

      {/* PAINEL DE CONTROLE DE DATA */}
      <div className="flex flex-col gap-2 bg-white/5 border border-white/10 p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6" style={{ color: brand }} />
          <div className="flex flex-col flex-1">
            <label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Data da Agenda</label>
            <input
              type="date"
              value={dataSelecionada}
              onChange={(e) => setDataSelecionada(e.target.value)}
              className="bg-transparent border-0 text-lg font-black text-white outline-none p-0"
              style={{ colorScheme: 'dark' }}
            />
          </div>
        </div>
        
        {/* DEBUG VISUAL: Mostra se os agendamentos chegaram do Supabase */}
        <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center text-[9px] font-bold uppercase tracking-tighter opacity-60">
          <span className="flex items-center gap-1"><Database className="h-3 w-3" /> Recebidos do Banco: {agendamentos.length}</span>
          <span style={{ color: brand }}>Na tela agora: {agendamentosFiltrados.length}</span>
        </div>
      </div>

      <AgendaBarbeiro
        agendamentos={agendamentosFiltrados}
        barbeiros={barbeiros}
        servicos_find={(id) => servicos.find(s => String(s.id) === String(id))}
        brand={brand}
        infoLojaNome={loja?.nome || "Barbearia"}
        onStatusChange={async (id, status) => {
          await atualizarStatusAgendamento.mutateAsync({ id, status, slug: normalizedSlug });
          queryClient.invalidateQueries({ queryKey: ["agendamentos", normalizedSlug] });
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
        onNovoAgendamento={async (dados) => {
          const res = await adicionarAgendamento.mutateAsync({
            ag: [dados],
            slug: normalizedSlug,
            idempotencyKey: window.crypto.randomUUID()
          });
          queryClient.invalidateQueries({ queryKey: ["agendamentos", normalizedSlug] });
          return res;
        }}
        horariosOcupados={(d, b) => 
          agendamentos
            .filter(a => formatarParaCompara(a.data) === d && String(a.barbeiro_id) === String(b))
            .map(a => a.horario)
        }
        infoLoja={{ abertura: "08:00", fechamento: "22:00" }}
      />
    </div>
  );
}