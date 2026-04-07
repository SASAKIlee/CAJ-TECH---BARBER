import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// ✅ MONITORAMENTO PROFISSIONAL MANTIDO
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import SelecionarPapel from "./pages/SelecionarPapel.tsx";
import NotFound from "./pages/NotFound.tsx";
import AgendamentoPublico from "./pages/AgendamentoPublico.tsx";
import Checkin from "./pages/Checkin.tsx"; // ✅ IMPORTAÇÃO DA NOVA PÁGINA DE CHECKIN

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, 
      refetchOnWindowFocus: false, 
    },
  },
});

function AppRoutes() {
  const { user, loading, userRole } = useAuth();

  if (loading) {
    return (
      <div className="dark min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      {/* 🌐 ROTAS PÚBLICAS (Acesso sem Login) */}
      <Route path="/agendar/:slug" element={<AgendamentoPublico />} />
      <Route path="/checkin/:slug/:ticket" element={<Checkin />} /> {/* 🚀 NOVA ROTA DO QR CODE AQUI */}

      {/* 🔒 ÁREA ADMINISTRATIVA / VENDAS (Acesso com Login) */}
      {!user ? (
        <>
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </>
      ) : (
        <>
          {/* 🚀 LÓGICA DE REDIRECIONAMENTO POR PAPEL:
            Se o cara tem QUALQUER role (dono, barbeiro ou VENDEDOR), ele vai para a Index.
            A Index vai ser o nosso "porteiro" que decide qual Dashboard mostrar.
          */}
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