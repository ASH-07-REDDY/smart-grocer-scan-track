
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductCard } from "@/components/ProductCard";
import { AddProductDialog } from "@/components/AddProductDialog";
import { EditProductDialog } from "@/components/EditProductDialog";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { Plus, Search, ScanLine, Filter, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { validateProductData, sanitizeInput } from "@/utils/securityValidation";

interface Product {
  id: string;
  name: string;
  category_id: string;
  quantity: number;
  quantity_type: string;
  expiry_date: string;
  amount: number;
  image_url: string;
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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

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
        toast({
          title: "Error",
          description: "Failed to fetch products",
          variant: "destructive",
        });
      } else {
        setProducts(data || []);
      }
      setLoading(false);
    };

    fetchProducts();

    // Set up real-time subscription
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
  }, [user, toast]);

  const filteredProducts = products.filter(product => {
    const sanitizedSearchTerm = sanitizeInput(searchTerm.toLowerCase());
    const matchesSearch = product.name.toLowerCase().includes(sanitizedSearchTerm) ||
                         product.categories?.name.toLowerCase().includes(sanitizedSearchTerm);
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

  const addProduct = async (newProduct: any) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add products",
        variant: "destructive",
      });
      return;
    }

    // Validate product data
    const validation = validateProductData(newProduct);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      toast({
        title: "Validation Error",
        description: "Please fix the validation errors",
        variant: "destructive",
      });
      return;
    }

    setValidationErrors([]);

    const productData = {
      name: sanitizeInput(newProduct.name),
      category_id: newProduct.category_id,
      quantity: Math.max(0, Math.min(9999, parseInt(newProduct.quantity) || 0)),
      quantity_type: sanitizeInput(newProduct.quantity_type || 'pieces'),
      expiry_date: newProduct.expiry_date,
      amount: Math.max(0, Math.min(999999, parseFloat(newProduct.amount) || 0)),
      image_url: newProduct.image_url || null,
      user_id: user.id,
    };

    const { error } = await supabase
      .from('grocery_items')
      .insert([productData]);

    if (error) {
      console.error('Error adding product:', error);
      toast({
        title: "Error",
        description: "Failed to add product. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Product added successfully",
      });
      
      // Add notification
      await supabase
        .from('notifications')
        .insert([
          {
            user_id: user.id,
            title: "Product Added",
            message: `${productData.name} has been added to your pantry`,
            type: "product_added",
          }
        ]);
    }
  };

  const updateProduct = async (updatedProduct: any) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to update products",
        variant: "destructive",
      });
      return;
    }

    // Validate product data
    const validation = validateProductData(updatedProduct);
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      toast({
        title: "Validation Error",
        description: "Please fix the validation errors",
        variant: "destructive",
      });
      return;
    }

    setValidationErrors([]);

    const productData = {
      name: sanitizeInput(updatedProduct.name),
      category_id: updatedProduct.category_id,
      quantity: Math.max(0, Math.min(9999, parseInt(updatedProduct.quantity) || 0)),
      quantity_type: sanitizeInput(updatedProduct.quantity_type || 'pieces'),
      expiry_date: updatedProduct.expiry_date,
      amount: Math.max(0, Math.min(999999, parseFloat(updatedProduct.amount) || 0)),
      image_url: updatedProduct.image_url || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('grocery_items')
      .update(productData)
      .eq('id', updatedProduct.id)
      .eq('user_id', user.id); // Additional security check

    if (error) {
      console.error('Error updating product:', error);
      toast({
        title: "Error",
        description: "Failed to update product. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
      setShowEditProduct(false);
      setEditingProduct(null);
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to delete products",
        variant: "destructive",
      });
      return;
    }

    const product = products.find(p => p.id === productId);
    
    const { error } = await supabase
      .from('grocery_items')
      .delete()
      .eq('id', productId)
      .eq('user_id', user.id); // Additional security check

    if (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: "Failed to delete product. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });

      // Add notification
      if (product) {
        await supabase
          .from('notifications')
          .insert([
            {
              user_id: user.id,
              title: "Product Removed",
              message: `${product.name} has been removed from your pantry`,
              type: "product_removed",
            }
          ]);
      }
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowEditProduct(true);
    setValidationErrors([]);
  };

  const onBarcodeScanned = (barcode: string) => {
    const sanitizedBarcode = sanitizeInput(barcode);
    console.log("Scanned barcode:", sanitizedBarcode);
    setShowScanner(false);
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "Unknown";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Validation Errors Display */}
      {validationErrors.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800 text-sm font-medium mb-1">
            <AlertCircle className="w-4 h-4" />
            Please fix the following errors:
          </div>
          <ul className="text-red-700 text-sm space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="ml-2">• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products in Pantry</h1>
          <p className="text-gray-600">Manage your grocery inventory</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowScanner(true)} variant="outline" size="lg">
            <ScanLine className="w-4 h-4 mr-2" />
            Scan Barcode
          </Button>
          <Button onClick={() => {
            setValidationErrors([]);
            setShowAddProduct(true);
          }} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search products by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            maxLength={100}
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort by Name</SelectItem>
              <SelectItem value="category">Sort by Category</SelectItem>
              <SelectItem value="expiry">Sort by Expiry Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <ProductCard 
            key={product.id} 
            product={{
              id: parseInt(product.id),
              name: product.name,
              category: getCategoryName(product.category_id),
              quantity: product.quantity,
              quantityType: product.quantity_type,
              expiryDate: product.expiry_date,
              amount: `₹${product.amount}`,
              image: product.image_url || "/placeholder.svg",
              barcode: "",
            }}
            onEdit={() => handleEditProduct(product)}
            onDelete={() => deleteProduct(product.id)}
          />
        ))}
      </div>

      {filteredProducts.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            {searchTerm || selectedCategory !== "all" 
              ? "No products found matching your filters" 
              : "No products found"}
          </p>
          <Button onClick={() => {
            setValidationErrors([]);
            setShowAddProduct(true);
          }} className="mt-4">
            Add Your First Product
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <AddProductDialog
        open={showAddProduct}
        onOpenChange={setShowAddProduct}
        onAddProduct={addProduct}
        categories={categories}
      />
      
      <EditProductDialog
        open={showEditProduct}
        onOpenChange={setShowEditProduct}
        product={editingProduct}
        onUpdateProduct={updateProduct}
        categories={categories}
      />
      
      <BarcodeScanner
        open={showScanner}
        onOpenChange={setShowScanner}
        onBarcodeScanned={onBarcodeScanned}
      />
    </div>
  );
}
