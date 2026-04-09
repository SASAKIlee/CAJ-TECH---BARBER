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

  // 🚀 LOADING PREMIUM (Enquanto o Firebase/Supabase checa se o cara tá logado)
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
      {/* 🌐 ROTAS PÚBLICAS (Clientes finais) */}
      <Route path="/agendar/:slug" element={<AgendamentoPublico />} />
      <Route path="/checkin/:slug/:ticket" element={<Checkin />} />

      {/* 🔒 CONTROLE DE ACESSO */}
      {!user ? (
        <>
          <Route path="/auth" element={<Auth />} />
          {/* Se não tá logado e tentou qualquer outra coisa, joga pro Login */}
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </>
      ) : (
        <>
          {/* 🚀 Se tá logado, a Index assume o controle baseada no userRole internamente */}
          <Route path="/" element={<Index />} />
          
          {/* Se tentar voltar pro Login já estando logado, joga pro Index */}
          <Route path="/auth" element={<Navigate to="/" replace />} />
          
          {/* 🚀 AGORA SIM A TELA 404 ESTÁ FUNCIONANDO! */}
          <Route path="*" element={<NotFound />} />
        </>
      )}
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />

      {/* Analytics do Vercel mantidos para rastrear os acessos */}
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