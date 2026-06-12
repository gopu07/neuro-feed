import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/Navigation/Sidebar";
import { BottomNav } from "./components/Navigation/BottomNav";
import { MobileDrawer } from "./components/Navigation/MobileDrawer";
import { SettingsDialog } from "./components/Settings/SettingsDialog";
import Index from "./pages/Index";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import AiLabs from "./pages/AiLabs";
import Explore from "./pages/Explore";
import Quiz from "./pages/Quiz";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import ContentDetail from "./pages/ContentDetail";
import ReviewDeck from "./pages/ReviewDeck";
import Guilds from "./pages/Guilds";
import Enterprise from "./pages/Enterprise";

import { queryClient } from "./lib/queryClient";
import { useAuthStore } from "./store/useAuthStore";
import { AuthProvider } from "./providers/AuthProvider";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuthStore();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Mobile Navigation Drawer & Fixed Header */}
        <div className="md:hidden">
          <MobileDrawer />
        </div>

        {/* Main content with responsive spacing */}
        <div className="md:ml-64 pt-16 md:pt-0 pb-20 md:pb-0">
          {children}
        </div>

        {/* Mobile Bottom Nav */}
        <div className="md:hidden">
          <BottomNav />
        </div>

        {/* Global settings modal */}
        <SettingsDialog />
      </div>
    </ProtectedRoute>
  );
};



const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <AppLayout>
                  <Index />
                </AppLayout>
              }
            />
            <Route
              path="/content/:id"
              element={
                <AppLayout>
                  <ContentDetail />
                </AppLayout>
              }
            />
            <Route
              path="/profile"
              element={
                <AppLayout>
                  <Profile />
                </AppLayout>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <AppLayout>
                  <Leaderboard />
                </AppLayout>
              }
            />
            <Route
              path="/ai-labs"
              element={
                <AppLayout>
                  <AiLabs />
                </AppLayout>
              }
            />
            <Route
              path="/explore"
              element={
                <AppLayout>
                  <Explore />
                </AppLayout>
              }
            />
            <Route
              path="/quiz"
              element={
                <AppLayout>
                  <Quiz />
                </AppLayout>
              }
            />
            <Route
              path="/reviews"
              element={
                <AppLayout>
                  <ReviewDeck />
                </AppLayout>
              }
            />
            <Route
              path="/guilds"
              element={
                <AppLayout>
                  <Guilds />
                </AppLayout>
              }
            />
            <Route
              path="/enterprise"
              element={
                <AppLayout>
                  <Enterprise />
                </AppLayout>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
