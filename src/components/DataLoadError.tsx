import { LogOut, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  return (
    <div className="dark min-h-screen bg-background text-foreground flex flex-col">
      <header className="p-4 border-b flex justify-between items-center bg-card shrink-0">
        <div className="flex items-center gap-3">
          <img src="/safeimagekit-resized-logoempresaCAJsemfundo.png" alt="" className="h-9 w-auto" />
          <h1 className="font-bold text-lg tracking-tight italic">CAJ TECH</h1>
        </div>
        <Button variant="ghost" size="icon" onClick={onSignOut} aria-label="Sair">
          <LogOut className="h-5 w-5" />
        </Button>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-zinc-800 bg-card shadow-xl">
          <CardHeader className="text-center space-y-3 pb-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
              <WifiOff className="h-7 w-7 text-destructive" aria-hidden />
            </div>
            <CardTitle className="text-xl font-black uppercase tracking-tight">{title}</CardTitle>
            <CardDescription className="text-balance">{message}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-2">
            <Button
              className="w-full font-bold gap-2"
              onClick={onRetry}
            >
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
            <Button variant="outline" className="w-full" onClick={onSignOut}>
              Sair da conta
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
