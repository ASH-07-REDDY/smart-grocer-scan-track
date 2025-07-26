import { useState, useEffect } from "react";
import { AddProductDialog } from "@/components/AddProductDialog";
import { EditProductDialog } from "@/components/EditProductDialog";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { ValidationErrors } from "@/components/ValidationErrors";
import { ProductsHeader } from "@/components/ProductsHeader";
import { SearchAndFilters } from "@/components/SearchAndFilters";
import { ProductsGrid } from "@/components/ProductsGrid";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProductOperations } from "@/hooks/useProductOperations";
import { sanitizeInput } from "@/utils/securityValidation";
import { LogoGenerator } from "@/components/LogoGenerator";
import { BarcodeProductDisplay } from "@/components/BarcodeProductDisplay";

interface Product {
  id: string;
  name: string;
  category_id: string;
  quantity: number;
  quantity_type: string;
  expiry_date: string;
  amount: number;
  image_url: string;
  barcode: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  categories?: { name: string };
}

interface Category {
  id: string;
  name: string;
}

export function ProductsView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [barcodeData, setBarcodeData] = useState<any>(null);
  const { user } = useAuth();
  const { addProduct, updateProduct, deleteProduct } = useProductOperations();
  
  // Add a state for showing logo generator  
  const [showLogoGenerator, setShowLogoGenerator] = useState(false);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching categories:', error);
      } else {
        setCategories(data || []);
      }
    };

    fetchCategories();
  }, []);

  // Fetch products
  useEffect(() => {
    if (!user) return;

    const fetchProducts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('grocery_items')
        .select(`
          *,
          categories (name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
      } else {
        setProducts(data || []);
      }
      setLoading(false);
    };

    fetchProducts();

    const channel = supabase
      .channel('grocery_items_changes')
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

  const filteredProducts = products.filter(product => {
    const sanitizedSearchTerm = sanitizeInput(searchTerm.toLowerCase());
    const matchesSearch = product.name.toLowerCase().includes(sanitizedSearchTerm) ||
                         product.categories?.name.toLowerCase().includes(sanitizedSearchTerm) ||
                         (product.barcode && product.barcode.includes(sanitizedSearchTerm));
    const matchesCategory = selectedCategory === "all" || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    } else if (sortBy === "category") {
      return (a.categories?.name || "").localeCompare(b.categories?.name || "");
    } else if (sortBy === "expiry") {
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    }
    return 0;
  });

  const handleAddProduct = async (newProduct: any) => {
    await addProduct(newProduct, setValidationErrors);
  };

  const handleUpdateProduct = async (updatedProduct: any) => {
    await updateProduct(updatedProduct, setValidationErrors, setShowEditProduct, setEditingProduct);
  };

  const handleDeleteProduct = async (productId: string) => {
    await deleteProduct(productId);
  };

  const handleMarkAsWaste = async (productId: string, reason: string) => {
    if (!user) return;
    
    try {
      // Add to waste tracking
      const product = products.find(p => p.id === productId);
      if (product) {
        const { error } = await supabase
          .from('waste_items')
          .insert({
            user_id: user.id,
            product_name: product.name,
            category: product.categories?.name || 'Unknown',
            quantity: product.quantity,
            quantity_type: product.quantity_type,
            amount: product.amount,
            waste_reason: reason,
            waste_date: new Date().toISOString().split('T')[0]
          });
          
        if (error) throw error;
        
        // Remove from grocery items
        await deleteProduct(productId);
      }
    } catch (error) {
      console.error('Error marking product as waste:', error);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowEditProduct(true);
    setValidationErrors([]);
  };

  const onBarcodeScanned = (barcode: string, productData?: any) => {
    console.log("Scanned barcode:", barcode, "Product data:", productData);
    setBarcodeData(productData);
    setShowScanner(false);
    setValidationErrors([]);
    setShowAddProduct(true);
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "Unknown";
  };

  const handleAddProductClick = () => {
    setValidationErrors([]);
    setBarcodeData(null);
    setShowAddProduct(true);
  };

  return (
    <div className="space-y-6">
      <ValidationErrors errors={validationErrors} />
      
      <ProductsHeader
        showNotificationSettings={showNotificationSettings}
        setShowNotificationSettings={setShowNotificationSettings}
        setShowScanner={setShowScanner}
        onAddProduct={handleAddProductClick}
        products={filteredProducts}
        getCategoryName={getCategoryName}
      />

      <BarcodeProductDisplay />

      <SearchAndFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        sortBy={sortBy}
        setSortBy={setSortBy}
        categories={categories}
      />

      <ProductsGrid
        products={filteredProducts}
        loading={loading}
        searchTerm={searchTerm}
        selectedCategory={selectedCategory}
        getCategoryName={getCategoryName}
        onEditProduct={handleEditProduct}
        onDeleteProduct={handleDeleteProduct}
        onMarkAsWaste={handleMarkAsWaste}
        onAddProduct={handleAddProductClick}
      />

      <AddProductDialog
        open={showAddProduct}
        onOpenChange={setShowAddProduct}
        onAddProduct={handleAddProduct}
        categories={categories}
        initialBarcodeData={barcodeData}
      />
      
      <EditProductDialog
        open={showEditProduct}
        onOpenChange={setShowEditProduct}
        product={editingProduct}
        onUpdateProduct={handleUpdateProduct}
        categories={categories}
      />
      
      <BarcodeScanner
        open={showScanner}
        onOpenChange={setShowScanner}
        onBarcodeScanned={onBarcodeScanned}
      />
      
      {/* Logo Generator - Hidden by default, can be shown via developer tools */}
      {showLogoGenerator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Logo Generator</h2>
              <button 
                onClick={() => setShowLogoGenerator(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <LogoGenerator />
          </div>
        </div>
      )}
    </div>
  );
}
