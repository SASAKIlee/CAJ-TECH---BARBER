import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// ✅ OS DOIS PULOS DO GATO PARA MONITORAMENTO PROFISSIONAL
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import SelecionarPapel from "./pages/SelecionarPapel.tsx";
import NotFound from "./pages/NotFound.tsx";
import AgendamentoPublico from "./pages/AgendamentoPublico.tsx"; // 🚀 NOVA ROTA IMPORTADA

// Configuração do motor de Cache (React Query)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos de cache
      refetchOnWindowFocus: false, 
    },
  },
});

function AppRoutes() {
  const { user, loading, userRole } = useAuth();

  // 1. Loading inicial do Supabase Auth
  if (loading) {
    return (
      <div className="dark min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 2. Unificamos o bloco de rotas para permitir rotas públicas soltas
  return (
    <Routes>
      {/* 🌐 ROTA PÚBLICA (VITRINE DO CLIENTE) - Não precisa de login */}
      <Route path="/agendar/:slug" element={<AgendamentoPublico />} />

      {/* 🔒 PROTEÇÃO DE ROTAS (ÁREA ADMINISTRATIVA) */}
      {!user ? (
        <>
          <Route path="/auth" element={<Auth />} />
          {/* Se tentar acessar qualquer outra coisa sem login, vai pro Auth */}
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </>
      ) : (
        <>
          <Route 
            path="/" 
            element={userRole ? <Index /> : <Navigate to="/selecionar-papel" replace />} 
          />
          <Route 
            path="/selecionar-papel" 
            element={!userRole ? <SelecionarPapel /> : <Navigate to="/" replace />} 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {/* Componentes de Notificação Visual */}
      <Toaster />
      <Sonner />

      {/* ✅ MONITORAMENTO ATIVADO */}
      <Analytics />       {/* Rastreia visitantes, países e cliques */}
      <SpeedInsights />    {/* Rastreia se o site está carregando rápido no celular */}

      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;