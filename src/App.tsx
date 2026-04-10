import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
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
  const location = useLocation();

  // 🛡️ TRAVA ABSOLUTA: Se for agendamento, para o mundo e mostra a tela.
  const isPublic = location.pathname.startsWith('/agendar/') || location.pathname.startsWith('/checkin/');

  if (isPublic) {
    return (
      <Routes>
        <Route path="/agendar/:slug" element={<AgendamentoPublico />} />
        <Route path="/checkin/:slug/:ticket" element={<Checkin />} />
        <Route path="*" element={<AgendamentoPublico />} />
      </Routes>
    );
  }

  // 🔒 FLUXO PRIVADO
  if (loading) return <div className="min-h-screen bg-black" />;

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
      <Toaster /><Sonner /><Analytics /><SpeedInsights />
      <BrowserRouter>
        <AuthProvider><AppRoutes /></AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;