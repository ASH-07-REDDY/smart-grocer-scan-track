
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { LoginForm } from "@/components/LoginForm";
import { ProductCard } from "@/components/ProductCard";
import { AddProductDialog } from "@/components/AddProductDialog";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { DashboardStats } from "@/components/DashboardStats";
import { EditProductDialog } from "@/components/EditProductDialog";
import { Plus, Search, ScanLine } from "lucide-react";

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<{ email: string; name: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Mock products data with rupees
  const [products, setProducts] = useState([
    {
      id: 1,
      name: "Organic Bananas",
      category: "Fruits",
      quantity: 6,
      quantityType: "pieces",
      expiryDate: "2024-06-15",
      amount: "₹299",
      image: "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=400",
      barcode: "123456789"
    },
    {
      id: 2,
      name: "Whole Milk",
      category: "Dairy",
      quantity: 2,
      quantityType: "litres",
      expiryDate: "2024-06-12",
      amount: "₹120",
      image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400",
      barcode: "987654321"
    },
    {
      id: 3,
      name: "Chicken Breast",
      category: "Meat",
      quantity: 1,
      quantityType: "kg",
      expiryDate: "2024-06-14",
      amount: "₹450",
      image: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400",
      barcode: "456789123"
    }
  ]);

  const categories = ["all", "Fruits", "Vegetables", "Dairy", "Meat", "Pantry", "Frozen"];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addProduct = (newProduct: any) => {
    setProducts([...products, { ...newProduct, id: Date.now() }]);
  };

  const updateProduct = (updatedProduct: any) => {
    setProducts(products.map(product => 
      product.id === updatedProduct.id ? updatedProduct : product
    ));
    setShowEditProduct(false);
    setEditingProduct(null);
  };

  const deleteProduct = (productId: number) => {
    setProducts(products.filter(product => product.id !== productId));
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setShowEditProduct(true);
  };

  const onBarcodeScanned = (barcode: string) => {
    console.log("Scanned barcode:", barcode);
    // Here you would typically look up the product by barcode
    setShowScanner(false);
  };

  const handleLogin = (userInfo: { email: string; name: string }) => {
    setUserData(userInfo);
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-green-50 to-blue-50">
        <AppSidebar userData={userData} />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Smart Grocery Tracker</h1>
                  <p className="text-gray-600">Track your groceries with real-time updates</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setShowScanner(true)} variant="outline" size="lg">
                  <ScanLine className="w-4 h-4 mr-2" />
                  Scan Barcode
                </Button>
                <Button onClick={() => setShowAddProduct(true)} size="lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </div>
            </div>

            {/* Dashboard Stats */}
            <DashboardStats products={products} />

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {categories.map((category) => (
                  <Badge
                    key={category}
                    variant={selectedCategory === category ? "default" : "secondary"}
                    className="cursor-pointer capitalize"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onEdit={handleEditProduct}
                  onDelete={deleteProduct}
                />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No products found</p>
                <Button onClick={() => setShowAddProduct(true)} className="mt-4">
                  Add Your First Product
                </Button>
              </div>
            )}
          </div>
        </main>

        {/* Dialogs */}
        <AddProductDialog
          open={showAddProduct}
          onOpenChange={setShowAddProduct}
          onAddProduct={addProduct}
        />
        
        <EditProductDialog
          open={showEditProduct}
          onOpenChange={setShowEditProduct}
          product={editingProduct}
          onUpdateProduct={updateProduct}
        />
        
        <BarcodeScanner
          open={showScanner}
          onOpenChange={setShowScanner}
          onBarcodeScanned={onBarcodeScanned}
        />
      </div>
    </SidebarProvider>
  );
};

export default Index;
