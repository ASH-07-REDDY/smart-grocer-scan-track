
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useProductImages() {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const generateProductImage = async (productName: string, category?: string): Promise<string | null> => {
    setGenerating(true);
    
    try {
      console.log(`Generating AI image for: ${productName} (${category})`);
      
      const { data, error } = await supabase.functions.invoke('enhanced-product-image-generation', {
        body: {
          productName,
          category,
          productId: `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }
      });

      if (error) {
        console.error('Error generating product image:', error);
        toast({
          title: "AI Image Generation Failed",
          description: "Could not generate AI image for product",
          variant: "destructive",
        });
        return null;
      }

      if (data?.success && data?.imageUrl) {
        console.log(`AI image generated successfully with ${data.provider}`);
        toast({
          title: "AI Image Generated",
          description: `Generated professional product image with ${data.provider}`,
        });
        return data.imageUrl;
      }

      console.log('No AI image generated, will use placeholder');
      return null;
    } catch (error) {
      console.error('Error in AI image generation:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI image",
        variant: "destructive",
      });
      return null;
    } finally {
      setGenerating(false);
    }
  };

  return {
    generateProductImage,
    generating
  };
}
