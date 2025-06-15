
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationSystem } from "@/hooks/useNotificationSystem";
import { AuthForm } from "@/components/AuthForm";
import { CollapsibleSidebar } from "@/components/CollapsibleSidebar";
import { DashboardStats } from "@/components/DashboardStats";
import { ProductsView } from "@/components/ProductsView";
import { AnalyticsView } from "@/components/AnalyticsView";
import { NotificationsView } from "@/components/NotificationsView";
import { SettingsView } from "@/components/SettingsView";
import { WeightMonitor } from "@/components/WeightMonitor";
import { supabase } from "@/integrations/supabase/client";

function Index() {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState("dashboard");
  const [products, setProducts] = useState([]);

  // Initialize notification system
  useNotificationSystem();

  useEffect(() => {
    if (!user) return;

    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('grocery_items')
        .select(`
          *,
          categories (name)
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching products:', error);
      } else {
        const transformedProducts = (data || []).map(product => ({
          id: parseInt(product.id),
          name: product.name,
          category: product.categories?.name || 'Unknown',
          quantity: product.quantity,
          quantityType: product.quantity_type,
          expiryDate: product.expiry_date,
          amount: `₹${product.amount}`,
          image: product.image_url || "/placeholder.svg",
          barcode: "",
        }));
        setProducts(transformedProducts);
      }
    };

    fetchProducts();

    // Set up real-time subscription
    const channel = supabase
      .channel('products_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grocery_items',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case "dashboard":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome to your Smart Pantry</p>
            </div>
            <DashboardStats products={products} />
          </div>
        );
      case "products":
        return <ProductsView />;
      case "analytics":
        return <AnalyticsView />;
      case "notifications":
        return <NotificationsView />;
      case "settings":
        return <SettingsView />;
      case "weight-monitor":
        return <WeightMonitor />;
      default:
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome to your Smart Pantry</p>
            </div>
            <DashboardStats products={products} />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-green-50 to-blue-50">
      <CollapsibleSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        currentView={currentView}
        onViewChange={(view) => {
          setCurrentView(view);
          setSidebarOpen(false); // Close sidebar on mobile after selection
        }}
      />
      
      <main className={`flex-1 p-6 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : ''}`}>
        <div className="max-w-7xl mx-auto">
          {renderCurrentView()}
        </div>
      </main>
    </div>
  );
}

export default Index;
