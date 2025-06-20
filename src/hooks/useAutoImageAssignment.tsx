import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProductImages } from '@/hooks/useProductImages';

export function useAutoImageAssignment() {
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();
  const { generateProductImage } = useProductImages();

  const downloadAndAssignImage = async (
    productId: string, 
    productName: string, 
    category: string
  ): Promise<string | null> => {
    setDownloading(true);
    
    try {
      console.log(`Generating AI image for: ${productName} (${category})`);
      
      // Only use AI image generation - no fallback to download service
      const aiImageUrl = await generateProductImage(productName, category);
      
      if (aiImageUrl) {
        // Update the product in the database with the new AI-generated image
        const { error: updateError } = await supabase
          .from('grocery_items')
          .update({ image_url: aiImageUrl })
          .eq('id', productId);

        if (updateError) {
          console.error('Error updating product with AI image:', updateError);
          toast({
            title: "Database Update Failed",
            description: "AI image generated but couldn't save to database",
            variant: "destructive",
          });
          return null;
        } else {
          console.log(`AI image assigned to product ${productId}: ${aiImageUrl}`);
          toast({
            title: "AI Image Generated",
            description: `Professional AI image created for ${productName}`,
          });
          return aiImageUrl;
        }
      }

      // If AI generation fails, show error
      toast({
        title: "AI Generation Failed", 
        description: "Could not generate AI image for this product",
        variant: "destructive",
      });
      return null;
    } catch (error) {
      console.error('Error in image assignment:', error);
      toast({
        title: "Error",
        description: "Failed to assign image",
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