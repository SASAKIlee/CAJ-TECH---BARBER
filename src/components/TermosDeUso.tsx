import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area"; // se tiver o scroll-area da shadcn

export function TermosDeUso() {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    // Verifica se o cara já aceitou antes (salvo no navegador)
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
    <Dialog open={aberto}>
      <DialogContent className="dark bg-[#0A0A0A] border-zinc-800 text-white max-w-[90vw] sm:max-w-md pointer-events-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase italic text-primary">
            Termos e Compromisso
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs">
            Leia com atenção antes de operar o sistema CAJ TECH.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 text-[11px] leading-relaxed text-zinc-300 h-60 overflow-y-auto space-y-4">
          <p>
            <strong>1. Finalidade:</strong> Este sistema é uma ferramenta de gestão de agendamentos e finanças para barbearias. O uso é restrito a profissionais autorizados.
          </p>
          <p>
            <strong>2. Responsabilidade dos Dados:</strong> O usuário é o único responsável pela veracidade dos dados inseridos (agendamentos, preços e despesas). A CAJ TECH não se responsabiliza por erros de digitação ou cálculos derivados de inputs incorretos.
          </p>
          <p>
            <strong>3. Privacidade (LGPD):</strong> Ao utilizar este app, você concorda em coletar apenas os dados necessários dos clientes (nome/telefone) e a não compartilhar essas informações para fins externos.
          </p>
          <p>
            <strong>4. Sigilo Financeiro:</strong> As informações de faturamento são de acesso restrito ao Dono da barbearia. O Barbeiro terá acesso apenas à sua produção individual.
          </p>
          <p>
            <strong>5. Atualizações:</strong> O sistema está em fase de testes (Beta). Instabilidades podem ocorrer e devem ser reportadas ao suporte técnico.
          </p>
        </div>

        <DialogFooter className="mt-4">
          <Button 
            className="w-full bg-primary text-black font-black uppercase"
            onClick={handleAceitar}
          >
            Eu aceito e entendo as regras
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}