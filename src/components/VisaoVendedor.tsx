import { useState } from "react";
import { Plus, Users, DollarSign, Target, Send, UserCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { hexToRgba, contrastTextOnBrand } from "@/lib/branding";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const MotionButton = motion.create(Button);

export function VisaoVendedor({ corPrimaria = "#D4AF37", vendedorNome = "Allan" }: any) {
  const [novoLead, setNovoLead] = useState({ nome_barbearia: "", nome_dono: "", whatsapp: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const brand = corPrimaria?.trim() || "#D4AF37";
  const ctaFg = contrastTextOnBrand(brand);
  const glass = { backgroundColor: hexToRgba(brand, 0.1), backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" } as const;

  // 🚀 O ROBOZINHO DO WHATSAPP ACONTECE AQUI
  const handleCadastrarLead = async () => {
    if (!novoLead.nome_barbearia || !novoLead.nome_dono || !novoLead.whatsapp) {
      return toast.error("Preencha todos os campos da barbearia!");
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Registrando cliente...");

    try {
      // 1. Salva no Banco de Dados para Histórico
      const { error } = await supabase.from('leads_barbearias').insert({
        nome_barbearia: novoLead.nome_barbearia,
        nome_dono: novoLead.nome_dono,
        whatsapp: novoLead.whatsapp,
        status: 'novo'
      });

      if (error) throw error;

      toast.success("Barbearia registrada com sucesso!", { id: toastId });

      // 2. Dispara o WhatsApp para VOCÊ (CEO)
      // ⚠️ ATENÇÃO: COLOQUE O SEU NÚMERO DE WHATSAPP AQUI EMBAIXO NO LUGAR DOS 9 ⚠️
      const numeroCEO = "17992051576"; 
      
      const mensagem = `Fala chefe! 🚀\n\nAcabei de fechar com uma barbearia nova:\n💈 *${novoLead.nome_barbearia}*\n👤 Dono: *${novoLead.nome_dono}*\n📱 WhatsApp: ${novoLead.whatsapp}\n\nJá pode liberar o acesso lá no sistema! 🔥`;
      
      window.open(`https://api.whatsapp.com/send?phone=${numeroCEO}&text=${encodeURIComponent(mensagem)}`, "_blank");

      // Limpa os campos
      setNovoLead({ nome_barbearia: "", nome_dono: "", whatsapp: "" });

    } catch (err: any) {
      toast.error(`Erro ao salvar: ${err.message}`, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-32 w-full max-w-lg mx-auto text-white">
      
      <header className="mb-8">
        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Fala, {vendedorNome}! 🚀</h2>
        <p className="text-[12px] font-bold uppercase tracking-widest text-zinc-400 mt-1">Painel de Expansão CAJ TECH</p>
      </header>

      {/* 🚀 ÁREA DE CADASTRO DE NOVAS BARBEARIAS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Target className="h-5 w-5" style={{ color: brand }} />
          <h3 className="font-black text-white uppercase text-lg tracking-tighter italic">Novo Cliente</h3>
        </div>
        
        <Card className="p-5 rounded-[22px] border border-white/[0.08] shadow-xl space-y-4" style={glass}>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase ml-1">Nome da Barbearia</label>
              <Input 
                placeholder="Ex: Barbearia do Zé" 
                className="rounded-xl border-white/[0.08] bg-black/40 h-12 text-white placeholder:text-zinc-600 focus:border-white/20" 
                value={novoLead.nome_barbearia} 
                onChange={(e) => setNovoLead({ ...novoLead, nome_barbearia: e.target.value })} 
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase ml-1">Nome do Dono</label>
              <Input 
                placeholder="Ex: José Silva" 
                className="rounded-xl border-white/[0.08] bg-black/40 h-12 text-white placeholder:text-zinc-600 focus:border-white/20" 
                value={novoLead.nome_dono} 
                onChange={(e) => setNovoLead({ ...novoLead, nome_dono: e.target.value })} 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase ml-1">WhatsApp do Dono</label>
              <Input 
                type="tel"
                placeholder="Ex: 11999998888" 
                className="rounded-xl border-white/[0.08] bg-black/40 h-12 text-white placeholder:text-zinc-600 focus:border-white/20" 
                value={novoLead.whatsapp} 
                onChange={(e) => setNovoLead({ ...novoLead, whatsapp: e.target.value })} 
              />
            </div>
          </div>

          <MotionButton 
            className="w-full h-14 font-black uppercase tracking-widest text-[11px] rounded-xl mt-2 border-0 shadow-[0_0_20px_rgba(212,175,55,0.2)]" 
            style={{ backgroundColor: brand, color: ctaFg }} 
            whileTap={{ scale: 0.95 }} 
            onClick={handleCadastrarLead}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Registrando..." : <><Send className="h-4 w-4 mr-2" /> Enviar para o CEO</>}
          </MotionButton>
        </Card>
      </section>

      {/* ÁREA DE METAS / COMISSÕES (Exemplo para ele acompanhar) */}
      <section className="space-y-4 pt-4">
        <div className="flex items-center gap-2 px-1">
          <DollarSign className="h-5 w-5" style={{ color: brand }} />
          <h3 className="font-black text-white uppercase text-lg tracking-tighter italic">Suas Comissões</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 rounded-[20px] border border-white/[0.08] text-center" style={glass}>
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Fechamentos Mês</p>
            <p className="text-2xl font-black text-white">0</p>
          </Card>
          
          <Card className="p-4 rounded-[20px] border border-white/[0.08] text-center" style={glass}>
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Comissão Estimada</p>
            <p className="text-2xl font-black" style={{ color: brand }}>R$ 0,00</p>
          </Card>
        </div>
      </section>

    </div>
  );
}