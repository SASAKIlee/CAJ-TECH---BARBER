import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { AlertCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: Rota não encontrada no sistema:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="dark min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden font-sans text-white">
      {/* Efeito de Luz no Fundo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 text-center space-y-6 max-w-md w-full p-8 bg-zinc-900/40 border border-zinc-800 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl">
        
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-800/50 border border-zinc-700/50 shadow-inner mb-2">
          <AlertCircle className="h-10 w-10 text-emerald-500" />
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-black uppercase italic tracking-tighter">Erro 404</h1>
          <p className="text-sm text-zinc-400 font-medium leading-relaxed px-2">
            Parece que você se perdeu. O endereço <span className="text-emerald-500 font-mono text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded break-all">{location.pathname}</span> não existe na CAJ TECH.
          </p>
        </div>

        {/* 🚀 CORREÇÃO: Usando <Link> em vez de <a> para não recarregar a página */}
        <Button asChild className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg transition-all active:scale-95 mt-2">
          <Link to="/">
            <Home className="h-5 w-5 mr-2" />
            Voltar para o Início
          </Link>
        </Button>
        
      </div>
    </div>
  );
};

export default NotFound;