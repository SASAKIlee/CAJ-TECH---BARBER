import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Button } from "@/components/ui/button";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import Demo from "./pages/Demo";

import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import NotFound from "./pages/NotFound.tsx";
import AgendamentoPublico from "./pages/AgendamentoPublico.tsx";
import Checkin from "./pages/Checkin.tsx";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, refetchOnWindowFocus: false } },
});

// Componente de fallback para erros
function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-black uppercase tracking-tighter text-red-500 mb-4">Ops! Algo deu errado</h1>
        <p className="text-sm text-zinc-400 mb-6 font-mono bg-zinc-900 p-4 rounded-xl border border-zinc-800">
          {error.message}
        </p>
        <div className="flex gap-3">
          <Button onClick={resetErrorBoundary} className="bg-emerald-600 hover:bg-emerald-500 text-white">
            Tentar novamente
          </Button>
          <Button variant="outline" onClick={() => window.location.href = "/"} className="border-zinc-700 text-zinc-300">
            Voltar ao início
          </Button>
        </div>
        <p className="text-[10px] text-zinc-600 mt-8 uppercase tracking-widest">
          Se o erro persistir, contate o suporte
        </p>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // 🛡️ TRAVA ABSOLUTA: Se for agendamento ou demo, para o mundo e mostra a tela.
  const isPublic = location.pathname.startsWith('/agendar/') || location.pathname.startsWith('/checkin/') || location.pathname === '/demo';

  if (isPublic) {
    return (
      <Routes>
        <Route path="/agendar/:slug" element={<AgendamentoPublico />} />
        <Route path="/checkin/:slug/:ticket" element={<Checkin />} />
        <Route path="/demo" element={<Demo />} />
        <Route path="*" element={<AgendamentoPublico />} />
      </Routes>
    );
  }

  // 🔒 FLUXO PRIVADO
  if (loading) return <div className="min-h-screen bg-black" />;

  return (
    <Routes>
      <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" replace />} />
      {/* Rota de convite do vendedor: redireciona para login */}
      <Route path="/convite/:id" element={<Navigate to="/auth" replace />} />
      <Route path="/" element={user ? <Index /> : <Navigate to="/auth" replace />} />
      {/* Política de Privacidade acessível a todos */}
      <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Analytics />
      <SpeedInsights />
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary
            FallbackComponent={ErrorFallback}
            onReset={() => {
              // Limpa cache e recarrega a página
              localStorage.clear();
              window.location.reload();
            }}
          >
            <AppRoutes />
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;