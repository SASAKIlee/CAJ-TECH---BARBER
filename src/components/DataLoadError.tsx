import { useState } from "react";
import { LogOut, RefreshCw, WifiOff, AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type DataLoadErrorProps = {
  title?: string;
  message: string;
  onRetry: () => void;
  onSignOut: () => void;
};

export function DataLoadError({
  title = "Erro de conexão",
  message,
  onRetry,
  onSignOut,
}: DataLoadErrorProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = () => {
    setIsRetrying(true);
    onRetry();
    // Simula um pequeno delay para o usuário ver o feedback visual
    setTimeout(() => setIsRetrying(false), 1500);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* Header consistente com o resto do App */}
      <header className="p-4 border-b border-zinc-800/50 flex justify-between items-center bg-black/80 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800">
            <img src="/safeimagekit-resized-logoempresaCAJsemfundo.png" alt="Logo" className="h-6 w-auto" />
          </div>
          <h1 className="font-black text-lg tracking-tighter italic uppercase">CAJ TECH</h1>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onSignOut} 
          className="text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full"
          aria-label="Sair"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Efeito de luz de fundo para o erro */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/10 blur-[100px] rounded-full pointer-events-none" />

        <Card className="w-full max-w-sm border-zinc-800 bg-zinc-900/50 backdrop-blur-xl shadow-2xl rounded-[28px] relative z-10">
          <CardHeader className="text-center space-y-4 pb-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/10 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
              <WifiOff className="h-10 w-10 text-red-500" aria-hidden />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black uppercase italic tracking-tighter text-white">
                {title}
              </CardTitle>
              <CardDescription className="text-zinc-400 text-sm font-medium leading-relaxed px-2">
                {message}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-3 pt-2 pb-8">
            <Button
              className={cn(
                "w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg active:scale-95",
                "bg-white text-black hover:bg-zinc-200 border-0"
              )}
              onClick={handleRetry}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar novamente
                </>
              )}
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full h-12 rounded-2xl font-bold uppercase text-[10px] tracking-widest text-zinc-500 hover:text-white hover:bg-white/5" 
              onClick={onSignOut}
            >
              Fazer logout e sair
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Footer simples para preencher o espaço mobile */}
      <footer className="p-8 text-center shrink-0">
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-700">
          Status: Offline / Connection Issue
        </p>
      </footer>
    </div>
  );
}