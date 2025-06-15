import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAutoImageAssignment() {
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();

  const downloadAndAssignImage = async (
    productId: string, 
    productName: string, 
    category: string
  ): Promise<string | null> => {
    setDownloading(true);
    
    try {
      console.log(`Auto-assigning image for: ${productName} (${category})`);
      
      const { data, error } = await supabase.functions.invoke('download-product-image', {
        body: {
          productName,
          category,
          productId
        }
      });

      if (error) {
        console.error('Error downloading product image:', error);
        toast({
          title: "Image Download Failed",
          description: "Could not download appropriate image for product",
          variant: "destructive",
        });
        return null;
      }

      if (data?.success && data?.imageUrl) {
        console.log(`Image downloaded and assigned: ${data.imageUrl}`);
        toast({
          title: "Image Downloaded",
          description: `Appropriate image found and assigned for ${productName}`,
        });
        return data.imageUrl;
      }

      return null;
    } catch (error) {
      console.error('Error in auto image assignment:', error);
      toast({
        title: "Error",
        description: "Failed to assign appropriate image",
        variant: "destructive",
      });
      return null;
    } finally {
      setDownloading(false);
    }
  };

  const bulkAssignImages = async (products: Array<{
    id: string;
    name: string;
    category: string;
    currentImage?: string;
  }>) => {
    setDownloading(true);
    const results: Array<{ id: string; success: boolean; imageUrl?: string }> = [];
    
    try {
      for (const product of products) {
        // Skip products that already have proper images (not placeholder)
        if (product.currentImage && 
            product.currentImage !== "/placeholder.svg" && 
            !product.currentImage.includes('data:image/svg+xml')) {
          results.push({ id: product.id, success: true, imageUrl: product.currentImage });
          continue;
        }

        const imageUrl = await downloadAndAssignImage(product.id, product.name, product.category);
        results.push({ 
          id: product.id, 
          success: !!imageUrl, 
          imageUrl: imageUrl || undefined 
        });

        // Small delay to avoid overwhelming the service
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const successCount = results.filter(r => r.success).length;
      toast({
        title: "Bulk Image Assignment Complete",
        description: `Successfully assigned images to ${successCount} out of ${products.length} products`,
      });

      return results;
    } catch (error) {
      console.error('Error in bulk image assignment:', error);
      toast({
        title: "Bulk Assignment Error",
        description: "Failed to complete bulk image assignment",
        variant: "destructive",
      });
      return [];
    } finally {
      setDownloading(false);
    }
  };

  return {
    downloadAndAssignImage,
    bulkAssignImages,
    downloading
  };
}