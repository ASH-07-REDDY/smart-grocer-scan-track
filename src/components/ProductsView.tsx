
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductCard } from "@/components/ProductCard";
import { AddProductDialog } from "@/components/AddProductDialog";
import { EditProductDialog } from "@/components/EditProductDialog";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { Plus, Search, ScanLine, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

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
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.categories?.name.toLowerCase().includes(searchTerm.toLowerCase());
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
    if (!user) return;

    const productData = {
      ...newProduct,
      user_id: user.id,
      amount: parseFloat(newProduct.amount) || 0,
    };

    const { error } = await supabase
      .from('grocery_items')
      .insert([productData]);

    if (error) {
      console.error('Error adding product:', error);
      toast({
        title: "Error",
        description: "Failed to add product",
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
            message: `${newProduct.name} has been added to your pantry`,
            type: "product_added",
          }
        ]);
    }
  };

  const updateProduct = async (updatedProduct: any) => {
    const { error } = await supabase
      .from('grocery_items')
      .update({
        ...updatedProduct,
        amount: parseFloat(updatedProduct.amount) || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', updatedProduct.id);

    if (error) {
      console.error('Error updating product:', error);
      toast({
        title: "Error",
        description: "Failed to update product",
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
    const product = products.find(p => p.id === productId);
    
    const { error } = await supabase
      .from('grocery_items')
      .delete()
      .eq('id', productId);

    if (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });

      // Add notification
      if (product && user) {
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
  };

  const onBarcodeScanned = (barcode: string) => {
    console.log("Scanned barcode:", barcode);
    setShowScanner(false);
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "Unknown";
  };

  const transformedProducts = products.map(product => ({
    id: parseInt(product.id),
    name: product.name,
    category: getCategoryName(product.category_id),
    quantity: product.quantity,
    quantityType: product.quantity_type,
    expiryDate: product.expiry_date,
    amount: `₹${product.amount}`,
    image: product.image_url || "/placeholder.svg",
    barcode: "",
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          <Button onClick={() => setShowAddProduct(true)} size="lg">
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
          <Button onClick={() => setShowAddProduct(true)} className="mt-4">
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
