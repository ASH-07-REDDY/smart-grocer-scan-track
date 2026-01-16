
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { validateProductData, sanitizeInput } from "@/utils/securityValidation";
import { useNotificationSystem } from "@/hooks/useNotificationSystem";
import { useProductImages } from "@/hooks/useProductImages";

export function useProductOperations() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { checkNewProductExpiry, sendNotification } = useNotificationSystem();
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
      
      // Send product addition notifications (email + in-app)
      try {
        const categoryName = newProduct.category_name || 'Uncategorized';
        
        const { error: notificationError } = await supabase.functions.invoke('send-product-notification', {
          body: {
            productName: productData.name,
            category: categoryName,
            quantity: productData.quantity,
            quantityType: productData.quantity_type,
            expiryDate: productData.expiry_date,
            userId: user.id,
            productId: data.id
          }
        });

        if (notificationError) {
          console.error('Error sending product notifications:', notificationError);
        } else {
          console.log('Product addition notifications sent successfully');
        }
      } catch (notificationError) {
        console.error('Failed to send product notifications:', notificationError);
        // Don't fail the product addition if notification fails
      }
      
      // Check if the newly added product is expiring soon and needs notification
      if (data?.id) {
        await checkNewProductExpiry(data.id);
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
        .select(`
          *,
          categories (name)
        `)
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

      // Delete related notifications first
      console.log('Deleting related data for product:', productId);
      
      const { error: notificationDeleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('item_id', productId)
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

        // Send product removal notification
        try {
          const notificationResult = await sendNotification({
            user_id: user.id,
            product: {
              id: productToDelete.id,
              name: productToDelete.name,
              category: productToDelete.categories?.name || 'Uncategorized',
              quantity: productToDelete.quantity || 0,
              quantity_type: productToDelete.quantity_type || 'pieces',
              amount: productToDelete.amount || 0,
              expiry_date: productToDelete.expiry_date
            },
            notification_type: 'product_removed'
          });

          if (notificationResult.success) {
            console.log('Product removal notification sent successfully');
          } else {
            console.error('Failed to send removal notification:', notificationResult.error);
          }
        } catch (notificationError) {
          console.error('Error sending removal notification:', notificationError);
          // Don't fail the deletion if notification fails
        }

        toast({
          title: "Success",
          description: `${productToDelete.name} has been removed from your pantry`,
        });
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
