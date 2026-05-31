import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ✅ VERSIONAMENTO: Troque a versão quando atualizar os termos.
// Isso faz todo mundo aceitar de novo automaticamente.
const TERMOS_VERSAO = "v1_2024_06";
const STORAGE_KEY = `caj-tech-termos-${TERMOS_VERSAO}`;

interface TermosDeUsoProps {
  userId?: string;
}

export function TermosDeUso({ userId }: TermosDeUsoProps) {
  const [aberto, setAberto] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const aceitou = localStorage.getItem(STORAGE_KEY);
    if (!aceitou) {
      setAberto(true);
    }
  }, []);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      setScrolledToBottom(true);
    }
  };

  const handleAceitar = async () => {
    setIsSaving(true);
    try {
      // Salva no navegador (cache local)
      localStorage.setItem(STORAGE_KEY, "true");

      // ✅ LGPD: Salva no banco também (prova legal)
      if (userId) {
        await supabase
          .from("profiles")
          .update({ termos_aceitos_em: new Date().toISOString() })
          .eq("user_id", userId);
      }
    } catch (err) {
      console.error("Erro ao salvar aceite dos termos:", err);
    } finally {
      setIsSaving(false);
      setAberto(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={() => { }}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="dark bg-[#0A0A0A] border-zinc-800 text-white max-w-[90vw] sm:max-w-md pointer-events-auto rounded-[24px] p-6 shadow-2xl [&>button]:hidden"
      >
        <DialogHeader className="space-y-3">
          <div className="mx-auto bg-primary/10 h-16 w-16 rounded-full flex items-center justify-center border border-primary/20 mb-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-black uppercase italic text-center text-white">
            Termos e <span className="text-primary">Compromisso</span>
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs text-center font-medium px-4">
            Leia com atenção as regras de operação antes de acessar o sistema CAJ TECH.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800 text-[11px] leading-relaxed text-zinc-300 h-64 overflow-y-auto space-y-4 custom-scrollbar shadow-inner mt-2"
        >
          <p>
            <strong className="text-white">1. Finalidade:</strong> Este sistema é uma ferramenta de gestão de agendamentos e finanças para barbearias. O uso é restrito a profissionais autorizados.
          </p>
          <p>
            <strong className="text-white">2. Responsabilidade dos Dados:</strong> O usuário é o único responsável pela veracidade dos dados inseridos (agendamentos, preços e despesas). A CAJ TECH não se responsabiliza por erros de digitação ou cálculos derivados de inputs incorretos.
          </p>
          <p>
            <strong className="text-white">3. Privacidade (LGPD):</strong> Ao utilizar este app, você concorda em coletar apenas os dados necessários dos clientes (nome e telefone) e a não compartilhar essas informações para fins externos em hipótese alguma.
          </p>
          <p>
            <strong className="text-white">4. Sigilo Financeiro:</strong> As informações de faturamento total do negócio são de acesso exclusivo e restrito ao Dono da barbearia. O Barbeiro terá acesso apenas à sua produção individual diária.
          </p>
          <p>
            <strong className="text-white">5. Atualizações e Operação:</strong> O sistema está em constante evolução. Instabilidades eventuais podem ocorrer e devem ser reportadas imediatamente ao suporte técnico oficial.
          </p>
        </div>

        {!scrolledToBottom && (
          <p className="text-[10px] text-zinc-600 text-center font-bold uppercase animate-pulse">
            ↓ Role até o final para aceitar
          </p>
        )}

        <DialogFooter className="mt-4 sm:justify-center">
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-black font-black uppercase h-14 rounded-xl text-sm tracking-wide shadow-[0_0_20px_rgba(212,175,55,0.2)] transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            onClick={handleAceitar}
            disabled={!scrolledToBottom || isSaving}
          >
            <CheckCircle className="h-5 w-5 mr-2 stroke-[2.5px]" />
            {isSaving ? "Salvando..." : "Eu aceito as regras"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}