
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useProductImages() {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const generateProductImage = async (productName: string, category?: string): Promise<string | null> => {
    setGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('simple-image-generation', {
        body: {
          productName,
          category
        }
      });

      if (error) {
        console.error('Error generating product image:', error);
        return null;
      }

      if (data?.success && data?.imageUrl) {
        toast({
          title: "AI Image Generated",
          description: `Generated with ${data.provider}`,
        });
        return data.imageUrl;
      }

      // If no image was generated, continue silently
      console.log('No image generated, continuing without image');
      return null;
    } catch (error) {
      console.error('Error generating product image:', error);
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
