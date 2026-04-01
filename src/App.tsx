import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import SelecionarPapel from "./pages/SelecionarPapel.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading, userRole } = useAuth();

  // 1. Enquanto estiver carregando as informações do banco
  if (loading) {
    return (
      <div className="dark min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 2. Se NÃO estiver logado: Só conhece a tela de Auth
  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  // 3. Se ESTIVER logado: Conhece a Home e a Seleção de Papel
  return (
    <Routes>
      {/* Rota Principal */}
      <Route 
        path="/" 
        element={userRole ? <Index /> : <Navigate to="/selecionar-papel" replace />} 
      />
      
      {/* Tela de escolha de função */}
      <Route 
        path="/selecionar-papel" 
        element={!userRole ? <SelecionarPapel /> : <Navigate to="/" replace />} 
      />

      {/* O PULO DO GATO: 
          Se sobrar qualquer outro endereço (tipo o /auth depois que logou),
          nós redirecionamos para a raiz (/) em vez de mostrar o 404.
      */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;