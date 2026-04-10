import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import NotFound from "./pages/NotFound.tsx";
import AgendamentoPublico from "./pages/AgendamentoPublico.tsx";
import Checkin from "./pages/Checkin.tsx"; 

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, refetchOnWindowFocus: false } },
});

function AppRoutes() {
  const { user, loading } = useAuth();
  
  // 🛡️ PASSO 1: Identifica a rota pública ANTES de qualquer outra lógica
  const path = window.location.pathname;
  const isPublic = path.startsWith('/agendar/') || path.startsWith('/checkin/');

  // 🛡️ PASSO 2: Se for público, renderiza na hora. 
  // Não espera 'loading', não olha pra 'user'. Apenas carrega.
  if (isPublic) {
    return (
      <Routes>
        <Route path="/agendar/:slug" element={<AgendamentoPublico />} />
        <Route path="/checkin/:slug/:ticket" element={<Checkin />} />
        <Route path="*" element={<AgendamentoPublico />} />
      </Routes>
    );
  }

  // PASSO 3: Lógica de loading apenas para as telas privadas (Dashboard/Login)
  if (loading) {
    return (
      <div className="dark min-h-screen bg-black flex flex-col items-center justify-center space-y-4">
        <div className="h-12 w-12 border-4 border-zinc-900 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Iniciando CAJ TECH...</p>
      </div>
    );
  }

  // PASSO 4: Rotas Protegidas
  return (
    <Routes>
      <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" replace />} />
      <Route path="/" element={user ? <Index /> : <Navigate to="/auth" replace />} />
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
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;