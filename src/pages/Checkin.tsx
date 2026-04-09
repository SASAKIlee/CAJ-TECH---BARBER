import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { LockKeyhole, Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        // Se for erro de rede/conexão
        if (error.message.includes("fetch")) {
          throw new Error("Falha na conexão. Verifique sua internet.");
        }
        // Mensagem genérica para segurança em produção
        throw new Error("Credenciais inválidas ou acesso não autorizado.");
      }

      toast.success("Acesso autorizado! Bem-vindo.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Detalhes visuais de fundo (Efeito Aura) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/5 blur-[120px] rounded-full" />

      <Card className="w-full max-w-sm p-8 space-y-8 bg-zinc-900/40 border-zinc-800 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl relative z-10">
        
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.15)]">
            <LockKeyhole className="h-8 w-8 text-emerald-500" />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter">CAJ TECH</h1>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em] ml-1">Acesso Restrito</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-zinc-500 uppercase ml-1 tracking-widest">E-mail Corporativo</Label>
            <Input 
              type="email" 
              autoComplete="email"
              placeholder="seu@email.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              className="bg-black border-zinc-800 h-14 rounded-2xl text-white focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-base px-4"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-zinc-500 uppercase ml-1 tracking-widest">Sua Senha</Label>
            <div className="relative">
              <Input 
                type={showPassword ? "text" : "password"} 
                autoComplete="current-password"
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="bg-black border-zinc-800 h-14 rounded-2xl text-white focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-base px-4 pr-12"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-16 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase italic rounded-[20px] shadow-lg shadow-emerald-600/10 transition-all active:scale-95 group mt-2"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <span className="flex items-center gap-2 tracking-widest">
                Entrar no Sistema <ShieldCheck className="h-5 w-5 opacity-40 group-hover:opacity-100 transition-opacity" />
              </span>
            )}
          </Button>
        </form>

        <div className="pt-6 border-t border-zinc-800/50 text-center">
          <p className="text-[10px] text-zinc-600 font-bold uppercase mb-4 tracking-widest">Problemas com o acesso?</p>
          <button 
            type="button"
            onClick={() => window.open('https://wa.me/5517992051576?text=Olá, sou parceiro da CAJ TECH e estou com dificuldades no meu login.', '_blank')}
            className="text-zinc-400 text-[11px] font-black uppercase hover:text-emerald-500 transition-all border border-zinc-800 hover:border-emerald-500/30 px-6 py-3 rounded-full bg-zinc-900/20"
          >
            Suporte Técnico
          </button>
        </div>

      </Card>
      
      <div className="absolute bottom-8 text-center w-full">
        <p className="text-[9px] text-zinc-700 font-black uppercase tracking-[0.5em]">© 2026 CAJ TECH - Inteligência em Barbearias</p>
      </div>
    </div>
  );
}