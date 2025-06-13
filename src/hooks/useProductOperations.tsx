
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { validateProductData, sanitizeInput } from "@/utils/securityValidation";
import { useNotificationSystem } from "@/hooks/useNotificationSystem";
import { useProductImages } from "@/hooks/useProductImages";

export function useProductOperations() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { sendProductNotification } = useNotificationSystem();
  const { generateProductImage } = useProductImages();

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

    // Generate AI image automatically
    let aiImageUrl = null;
    try {
      console.log('Generating AI image for product:', newProduct.name);
      aiImageUrl = await generateProductImage(newProduct.name, newProduct.category_name);
      console.log('AI image generated:', aiImageUrl);
    } catch (error) {
      console.error('Failed to generate AI image:', error);
      // Continue without image if generation fails
    }

    const productData = {
      name: sanitizeInput(newProduct.name),
      category_id: newProduct.category_id,
      quantity: Math.max(0, Math.min(9999, parseInt(newProduct.quantity) || 0)),
      quantity_type: sanitizeInput(newProduct.quantity_type || 'pieces'),
      expiry_date: newProduct.expiry_date,
      amount: Math.max(0, Math.min(999999, parseFloat(newProduct.amount) || 0)),
      image_url: aiImageUrl || newProduct.image_url || null,
      barcode: newProduct.barcode || null,
      user_id: user.id,
    };

    const { data, error } = await supabase
      .from('grocery_items')
      .insert([productData])
      .select()
      .single();

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
        description: "Product added successfully with AI-generated image",
      });
      
      // Send notification for the added product
      if (data?.id) {
        await sendProductNotification(data.id, 'product_added');
      }
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

  const deleteProduct = async (productId: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to delete products",
        variant: "destructive",
      });
      return false;
    }

    try {
      console.log('Attempting to delete product:', productId);
      
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
        return false;
      } else {
        toast({
          title: "Success",
          description: "Product deleted successfully",
        });

        // Send notification for the removed product
        await sendProductNotification(productId, 'product_removed');
        return true;
      }
    } catch (error) {
      console.error('Unexpected error deleting product:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the product.",
        variant: "destructive",
      });
      return false;
    }
  };

  return { addProduct, updateProduct, deleteProduct };
}
