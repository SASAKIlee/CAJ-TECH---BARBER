import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Analytics } from "@vercel/analytics/react"; // ✅ O PULO DO GATO PARA O RASTREAMENTO
import { SpeedInsights } from "@vercel/speed-insights/react"; // ✅ MONITORA A VELOCIDADE DO SITE
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import SelecionarPapel from "./pages/SelecionarPapel.tsx";
import NotFound from "./pages/NotFound.tsx";

// Configuração do motor de Cache
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
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route 
        path="/" 
        element={userRole ? <Index /> : <Navigate to="/selecionar-papel" replace />} 
      />
      
      <Route 
        path="/selecionar-papel" 
        element={!userRole ? <SelecionarPapel /> : <Navigate to="/" replace />} 
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Analytics /> {/* ✅ AGORA VOCÊ VÊ QUEM ENTRA NO CAJ TECH EM TEMPO REAL! */}
      <SpeedInsights /> {/* ✅ MONITORA O DESEMPENHO E VELOCIDADE DO SITE! */}
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;