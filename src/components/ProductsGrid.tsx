import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";

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

interface ProductsGridProps {
  products: Product[];
  loading: boolean;
  searchTerm: string;
  selectedCategory: string;
  getCategoryName: (categoryId: string) => string;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onAddProduct: () => void;
}

export function ProductsGrid({
  products,
  loading,
  searchTerm,
  selectedCategory,
  getCategoryName,
  onEditProduct,
  onDeleteProduct,
  onAddProduct
}: ProductsGridProps) {
  const handleImageUpdate = async (productId: number, imageUrl: string) => {
    // Update the product image in the database
    const { error } = await supabase
      .from('grocery_items')
      .update({ image_url: imageUrl })
      .eq('id', productId.toString());

    if (error) {
      console.error('Error updating product image:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading products...</div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">
          {searchTerm || selectedCategory !== "all" 
            ? "No products found matching your filters" 
            : "No products found"}
        </p>
        <Button onClick={onAddProduct} className="mt-4">
          Add Your First Product
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => (
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
            barcode: product.barcode || "",
          }}
          onEdit={() => onEditProduct(product)}
          onDelete={() => onDeleteProduct(product.id)}
          onImageUpdate={handleImageUpdate}
        />
      ))}
    </div>
  );
}
