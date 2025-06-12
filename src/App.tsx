
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CollapsibleSidebar } from "@/components/CollapsibleSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationSystem } from "@/hooks/useNotificationSystem";
import { useState } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { ProductsView } from "@/components/ProductsView";
import { AnalyticsView } from "@/components/AnalyticsView";
import { NotificationsView } from "@/components/NotificationsView";
import { SettingsView } from "@/components/SettingsView";

const queryClient = new QueryClient();

function AppContent() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState("dashboard");
  
  // Initialize notification system
  useNotificationSystem();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Index />;
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case "products":
        return <ProductsView />;
      case "analytics":
        return <AnalyticsView />;
      case "notifications":
        return <NotificationsView />;
      case "settings":
        return <SettingsView />;
      default:
        return <Index />;
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      <CollapsibleSidebar 
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        currentView={currentView}
        onViewChange={setCurrentView}
      />
      <main className="flex-1 p-6 overflow-auto">
        <Routes>
          <Route path="/" element={renderCurrentView()} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AppContent />
          <Toaster />
          <Sonner />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
