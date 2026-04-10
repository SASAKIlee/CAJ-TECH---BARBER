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
  
  // 🛡️ PASSO 1: Identifica o caminho ANTES de carregar o resto
  const path = window.location.pathname;
  const isPublic = path.startsWith('/agendar/') || path.startsWith('/checkin/');

  // 🚀 PASSO 2: BLINDAGEM TOTAL. 
  // Se o link for público, renderiza o Agendamento e ignora o Login/User/Loading.
  if (isPublic) {
    console.log("🛡️ CAJ TECH: Rota Pública Detectada. Ignorando proteções.");
    return (
      <Routes>
        <Route path="/agendar/:slug" element={<AgendamentoPublico />} />
        <Route path="/checkin/:slug/:ticket" element={<Checkin />} />
        {/* Caso o cara erre algo no path público, ele cai no agendamento geral */}
        <Route path="*" element={<AgendamentoPublico />} />
      </Routes>
    );
  }

  // PASSO 3: Loading só para a parte Privada (Index/Auth)
  if (loading) {
    return (
      <div className="dark min-h-screen bg-black flex flex-col items-center justify-center space-y-4">
        <div className="h-12 w-12 border-4 border-zinc-900 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em]">Carregando Painel...</p>
      </div>
    );
  }

  // PASSO 4: Regras de Acesso Privado
  return (
    <Routes>
      {/* Se não está logado, vai pro Login. Se está logado e tenta ir pro Login, vai pra Home. */}
      <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" replace />} />
      
      {/* Se está logado, entra no Index. Se não está, vai pro Login. */}
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