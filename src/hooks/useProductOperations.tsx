
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

    if (!productId) {
      console.error('No product ID provided for deletion');
      toast({
        title: "Error",
        description: "Invalid product ID",
        variant: "destructive",
      });
      return false;
    }

    try {
      console.log('Attempting to delete product with ID:', productId);
      
      // First, fetch the product to get its details for notification
      const { data: productToDelete, error: fetchError } = await supabase
        .from('grocery_items')
        .select('*')
        .eq('id', productId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching product for deletion:', fetchError);
        toast({
          title: "Error",
          description: "Product not found or access denied",
          variant: "destructive",
        });
        return false;
      }

      // Delete related data in correct order to avoid foreign key constraint violations
      console.log('Deleting related data for product:', productId);
      
      // Step 1: Get notification IDs for this product
      const { data: notificationIds, error: notificationFetchError } = await supabase
        .from('notifications')
        .select('id')
        .eq('product_id', productId)
        .eq('user_id', user.id);

      if (notificationFetchError) {
        console.error('Error fetching notification IDs:', notificationFetchError);
      }

      // Step 2: Delete notification delivery logs if there are notifications
      if (notificationIds && notificationIds.length > 0) {
        const notificationIdArray = notificationIds.map(n => n.id);
        const { error: deliveryLogDeleteError } = await supabase
          .from('notification_delivery_log')
          .delete()
          .in('notification_id', notificationIdArray);

        if (deliveryLogDeleteError) {
          console.error('Error deleting delivery logs:', deliveryLogDeleteError);
          // Continue anyway
        } else {
          console.log('Successfully deleted related delivery logs');
        }
      }

      // Step 3: Delete notifications
      const { error: notificationDeleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('product_id', productId)
        .eq('user_id', user.id);

      if (notificationDeleteError) {
        console.error('Error deleting related notifications:', notificationDeleteError);
        // Continue with product deletion even if notification deletion fails
      } else {
        console.log('Successfully deleted related notifications');
      }

      // Now delete the product
      const { error: deleteError } = await supabase
        .from('grocery_items')
        .delete()
        .eq('id', productId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Error deleting product:', deleteError);
        toast({
          title: "Error",
          description: "Failed to delete product. Please try again.",
          variant: "destructive",
        });
        return false;
      } else {
        console.log('Product deleted successfully:', productToDelete.name);
        toast({
          title: "Success",
          description: `Product "${productToDelete.name}" deleted successfully`,
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
