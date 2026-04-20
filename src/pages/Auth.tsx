import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { LockKeyhole, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function Auth() {
  const navigate = useNavigate();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Foco automático no campo de email
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação local
    if (!email.trim() || !password.trim()) {
      toast.error("Preencha todos os campos.");
      return;
    }
    if (!isValidEmail(email)) {
      toast.error("E-mail inválido.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Verificando credenciais...");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        // Mensagem genérica por segurança
        throw new Error("Credenciais inválidas ou acesso não autorizado.");
      }

      toast.dismiss(toastId);
      toast.success("Acesso autorizado! Bem-vindo.");
      
      // Limpar campos por segurança
      setPassword("");
      
      // Redirecionar para o dashboard
      navigate("/", { replace: true });
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSupportClick = () => {
    window.open(
      'https://wa.me/5517992051576?text=Olá, sou parceiro da CAJ TEC e estou com dificuldades no meu login.',
      '_blank'
    );
  };

  return (
    <div className="dark min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Detalhe visual de fundo (Blur) */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600/5 blur-[120px] rounded-full" />

      <Card className="w-full max-w-sm p-8 space-y-8 bg-zinc-900/50 border-zinc-800 backdrop-blur-xl rounded-[2.5rem] shadow-2xl relative z-10">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.1)]">
            <LockKeyhole className="h-8 w-8 text-emerald-500" />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">CAJ TEC</h1>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Acesso Restrito</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[10px] font-black text-zinc-400 uppercase ml-1">
              E-mail Corporativo
            </Label>
            <Input
              id="email"
              ref={emailInputRef}
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="bg-black border-zinc-800 h-12 rounded-xl text-white focus:ring-emerald-500/20 focus:border-emerald-500 transition-all disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-[10px] font-black text-zinc-400 uppercase ml-1">
              Sua Senha
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="bg-black border-zinc-800 h-12 rounded-xl text-white focus:ring-emerald-500/20 focus:border-emerald-500 transition-all disabled:opacity-50"
            />
          </div>

          <Button
            type="submit"
            className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase italic rounded-2xl shadow-lg shadow-emerald-600/20 transition-all group disabled:opacity-70"
            disabled={loading}
            aria-label="Entrar no sistema"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <span className="flex items-center gap-2">
                Entrar no Sistema <ShieldCheck className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity" />
              </span>
            )}
          </Button>
        </form>

        <div className="pt-4 border-t border-zinc-800/50 text-center">
          <p className="text-[10px] text-zinc-600 font-bold uppercase mb-3">Problemas com o acesso?</p>
          <button
            type="button"
            onClick={handleSupportClick}
            className="text-zinc-400 text-[11px] font-black uppercase hover:text-emerald-500 transition-colors border border-zinc-800 px-4 py-2 rounded-full"
            aria-label="Falar com suporte técnico via WhatsApp"
          >
            Falar com Suporte Técnico
          </button>
        </div>
      </Card>

      {/* Footer minimalista fora do card */}
      <div className="absolute bottom-6 text-center w-full">
        <p className="text-[9px] text-zinc-700 font-black uppercase tracking-[0.4em]">
          © 2026 CAJ TEC - Inteligência em Barbearias
        </p>
      </div>
    </div>
  );
}