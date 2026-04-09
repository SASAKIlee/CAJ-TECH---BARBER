import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, CheckCircle } from "lucide-react";

export function TermosDeUso() {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    // Verifica se o usuário já aceitou antes (salvo no navegador)
    const aceitou = localStorage.getItem("caj-tech-termos");
    if (!aceitou) {
      setAberto(true);
    }
  }, []);

  const handleAceitar = () => {
    localStorage.setItem("caj-tech-termos", "true");
    setAberto(false);
  };

  return (
    <Dialog 
      open={aberto} 
      onOpenChange={(isOpen) => {
        // Impede que o modal feche caso tentem clicar no "X" padrão
        if (!isOpen) return;
        setAberto(isOpen);
      }}
    >
      <DialogContent 
        // 🚀 TRAVAS DE SEGURANÇA: Impede fechar clicando fora ou no ESC
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="dark bg-[#0A0A0A] border-zinc-800 text-white max-w-[90vw] sm:max-w-md pointer-events-auto rounded-[24px] p-6 shadow-2xl [&>button]:hidden" 
        /* [&>button]:hidden esconde o "X" nativo do shadcn */
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

        <div className="bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800 text-[11px] leading-relaxed text-zinc-300 h-64 overflow-y-auto space-y-4 custom-scrollbar shadow-inner mt-2">
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

        <DialogFooter className="mt-6 sm:justify-center">
          <Button 
            className="w-full bg-primary hover:bg-primary/90 text-black font-black uppercase h-14 rounded-xl text-sm tracking-wide shadow-[0_0_20px_rgba(212,175,55,0.2)] transition-all active:scale-95"
            onClick={handleAceitar}
          >
            <CheckCircle className="h-5 w-5 mr-2 stroke-[2.5px]" /> Eu aceito as regras
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}