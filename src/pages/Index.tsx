
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
import { RecipeSuggestions } from "@/components/RecipeSuggestions";
import { NutritionalInfo } from "@/components/NutritionalInfo";
import { WasteTracking } from "@/components/WasteTracking";
import { Gamification } from "@/components/Gamification";
import { OnlineShoppingView } from "@/components/OnlineShoppingView";
import { supabase } from "@/integrations/supabase/client";
import weightSensingFeature from "@/assets/weight-sensing-feature.jpg";
import barcodeTrackingFeature from "@/assets/barcode-tracking-feature.jpg";
import analyticsFeature from "@/assets/analytics-feature.jpg";
import notificationsFeature from "@/assets/notifications-feature.jpg";

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
      <div className="min-h-screen pantry-bg flex items-center justify-center">
        <div className="text-lg font-medium">Loading your smart pantry...</div>
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
          <div className="space-y-8">
            <div className="text-center">
              <img 
                src="/lovable-uploads/6f512ac0-96f5-409c-84c5-139ea4c60396.png" 
                alt="Smart Pantry Logo" 
                className="w-24 h-24 mx-auto mb-4 rounded-full shadow-elegant"
              />
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                Welcome to Smart Pantry
              </h1>
              <p className="text-muted-foreground text-lg">Your intelligent grocery inventory management system</p>
            </div>
            
            <div className="modern-card p-6">
              <h2 className="text-2xl font-bold text-foreground mb-4">Smart Features</h2>
              <p className="text-muted-foreground mb-6">
                Smart Pantry combines ESP32 weight sensors with barcode technology to automatically track your grocery inventory.
              </p>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card text-center p-6">
                  <img 
                    src={weightSensingFeature} 
                    alt="Real-time Weight Sensing" 
                    className="w-20 h-20 mx-auto mb-4 rounded-xl object-cover shadow-soft"
                  />
                  <h3 className="font-semibold text-foreground mb-2">Real-time Weight Sensing</h3>
                  <p className="text-sm text-muted-foreground">Monitor product weights instantly with ESP32 sensors</p>
                </div>
                
                <div className="glass-card text-center p-6">
                  <img 
                    src={barcodeTrackingFeature} 
                    alt="Barcode Product Tracking" 
                    className="w-20 h-20 mx-auto mb-4 rounded-xl object-cover shadow-soft"
                  />
                  <h3 className="font-semibold text-foreground mb-2">Barcode Product Tracking</h3>
                  <p className="text-sm text-muted-foreground">Identify products automatically using barcode technology</p>
                </div>
                
                <div className="glass-card text-center p-6">
                  <img 
                    src={analyticsFeature} 
                    alt="Analytics and Insights" 
                    className="w-20 h-20 mx-auto mb-4 rounded-xl object-cover shadow-soft"
                  />
                  <h3 className="font-semibold text-foreground mb-2">Analytics & Insights</h3>
                  <p className="text-sm text-muted-foreground">Get detailed analytics on consumption patterns</p>
                </div>
                
                <div className="glass-card text-center p-6">
                  <img 
                    src={notificationsFeature} 
                    alt="Smart Notifications" 
                    className="w-20 h-20 mx-auto mb-4 rounded-xl object-cover shadow-soft"
                  />
                  <h3 className="font-semibold text-foreground mb-2">Smart Notifications</h3>
                  <p className="text-sm text-muted-foreground">Receive alerts for low stock and expiry dates</p>
                </div>
              </div>
            </div>
            
            <DashboardStats products={products} />
          </div>
        );
      case "products":
        return <ProductsView />;
      case "analytics":
        return <AnalyticsView />;
      case "recipes":
        return <RecipeSuggestions />;
      case "nutrition":
        return <NutritionalInfo />;
      case "waste":
        return <WasteTracking />;
      case "gamification":
        return <Gamification />;
      case 'online-shopping':
        return <OnlineShoppingView />;
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
    <div className="min-h-screen pantry-bg flex w-full">
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
