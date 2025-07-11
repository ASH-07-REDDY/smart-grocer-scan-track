
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
            <div className="text-center mb-8">
              <img 
                src="/lovable-uploads/6f512ac0-96f5-409c-84c5-139ea4c60396.png" 
                alt="Smart Pantry Logo" 
                className="w-32 h-32 mx-auto mb-4 rounded-full"
              />
              <h1 className="text-3xl font-bold text-gray-900">Welcome to Smart Pantry</h1>
              <p className="text-gray-600 text-lg">Your intelligent grocery inventory management system</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">How Smart Pantry Works</h2>
              <p className="text-gray-600 mb-6">
                Smart Pantry combines ESP32 weight sensors with barcode technology to automatically track your grocery inventory. 
                Monitor product weights in real-time and get insights into your consumption patterns.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800">How to Use:</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</div>
                      <div>
                        <h4 className="font-medium">Connect ESP32 Scale</h4>
                        <p className="text-sm text-gray-600">Set up your ESP32 with load sensors and connect to WiFi</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</div>
                      <div>
                        <h4 className="font-medium">Enter Barcode</h4>
                        <p className="text-sm text-gray-600">Use the serial monitor to input the product barcode</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</div>
                      <div>
                        <h4 className="font-medium">Place Item on Scale</h4>
                        <p className="text-sm text-gray-600">Put your product on the ESP32 scale platform</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</div>
                      <div>
                        <h4 className="font-medium">Monitor Real-time</h4>
                        <p className="text-sm text-gray-600">View weight data instantly on the Weight Monitor page</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-800">Features:</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">Real-time weight sensing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">Barcode-based product tracking</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">Historical weight data</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">Analytics and insights</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">Smart notifications</span>
                    </div>
                  </div>
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
