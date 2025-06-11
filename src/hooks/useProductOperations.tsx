
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { validateProductData, sanitizeInput } from "@/utils/securityValidation";

export function useProductOperations() {
  const { toast } = useToast();
  const { user } = useAuth();

  const addProduct = async (newProduct: any, setValidationErrors: (errors: string[]) => void) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add products",
        variant: "destructive",
      });
      return;
    }

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
      barcode: newProduct.barcode || null,
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

  const updateProduct = async (updatedProduct: any, setValidationErrors: (errors: string[]) => void, setShowEditProduct: (show: boolean) => void, setEditingProduct: (product: any) => void) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to update products",
        variant: "destructive",
      });
      return;
    }

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
      barcode: updatedProduct.barcode || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('grocery_items')
      .update(productData)
      .eq('id', updatedProduct.id)
      .eq('user_id', user.id);

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

  const deleteProduct = async (productId: string, products: any[]) => {
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
      .eq('user_id', user.id);

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

  return { addProduct, updateProduct, deleteProduct };
}
