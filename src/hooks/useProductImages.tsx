
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useProductImages() {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const generateProductImage = async (productName: string, category?: string): Promise<string | null> => {
    setGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-product-image', {
        body: {
          productName,
          category
        }
      });

      if (error) {
        console.error('Error generating product image:', error);
        toast({
          title: "Image Generation Failed",
          description: "Could not generate product image. Using placeholder.",
          variant: "destructive",
        });
        return null;
      }

      if (data?.success && data?.imageUrl) {
        toast({
          title: "Image Generated",
          description: "AI-generated product image created successfully",
        });
        return data.imageUrl;
      }

      return null;
    } catch (error) {
      console.error('Error generating product image:', error);
      toast({
        title: "Image Generation Failed",
        description: "Could not generate product image. Using placeholder.",
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
