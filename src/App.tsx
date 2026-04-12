import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useLogoUpload } from "@/hooks/useLogoUpload";

const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NovaRequisicao = lazy(() => import("./pages/NovaRequisicao"));
const FilaRequisicoes = lazy(() => import("./pages/FilaRequisicoes"));
const Rastreio = lazy(() => import("./pages/Rastreio"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  useLogoUpload(); // Auto-upload logo on app start
  
  const PageLoader = () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/nova-requisicao"
                element={
                  <ProtectedRoute>
                    <NovaRequisicao />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/fila"
                element={
                  <ProtectedRoute>
                    <FilaRequisicoes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/rastreio"
                element={
                  <ProtectedRoute>
                    <Rastreio />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </TooltipProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

export default App;
