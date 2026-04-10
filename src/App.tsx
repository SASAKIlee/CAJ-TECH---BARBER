import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// ✅ MONITORAMENTO PROFISSIONAL
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

// ✅ PÁGINAS DO SISTEMA
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import NotFound from "./pages/NotFound.tsx";
import AgendamentoPublico from "./pages/AgendamentoPublico.tsx";
import Checkin from "./pages/Checkin.tsx"; 

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, 
      refetchOnWindowFocus: false, 
    },
  },
});

function AppRoutes() {
  const { user, loading } = useAuth();

  // 🚀 LOADING PREMIUM
  if (loading) {
    return (
      <div className="dark min-h-screen bg-black flex flex-col items-center justify-center space-y-4 font-sans">
        <div className="h-12 w-12 border-4 border-zinc-900 border-t-emerald-500 rounded-full animate-spin shadow-[0_0_15px_rgba(16,185,129,0.2)]" />
        <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
          Iniciando CAJ TECH...
        </p>
      </div>
    );
  }

  return (
    <Routes>
      {/* 🌐 ROTAS TOTALMENTE PÚBLICAS (Livres de qualquer redirecionamento) */}
      <Route path="/agendar/:slug" element={<AgendamentoPublico />} />
      <Route path="/checkin/:slug/:ticket" element={<Checkin />} />

      {/* 🔒 LOGIN (Se tá logado e vai tentar abrir o auth, manda pra home) */}
      <Route 
        path="/auth" 
        element={!user ? <Auth /> : <Navigate to="/" replace />} 
      />

      {/* 🔒 PAINEL DO USUÁRIO LOGADO (Com o exact /) */}
      <Route 
        path="/" 
        element={user ? <Index /> : <Navigate to="/auth" replace />} 
      />

      {/* 🚀 TELA 404 (Apenas se a rota não existir em nenhum lugar) */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />

      {/* Monitoramento Vercel */}
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