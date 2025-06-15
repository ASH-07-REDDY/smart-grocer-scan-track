
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useProductImages() {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const generateProductImage = async (productName: string, category?: string): Promise<string | null> => {
    setGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('robust-image-generation', {
        body: {
          productName,
          category
        }
      });

      if (error) {
        console.error('Error generating product image:', error);
        // Silently fail without notification
        return null;
      }

      if (data?.success && data?.imageUrl) {
        // Only show success message for successful generations
        toast({
          title: "AI Image Generated",
          description: `Generated with ${data.provider || 'AI'}`,
        });
        return data.imageUrl;
      }

      // Graceful failure without notification
      if (data?.fallback) {
        console.log('Image generation failed gracefully, proceeding without image');
        return null;
      }

      return null;
    } catch (error) {
      console.error('Error generating product image:', error);
      // Silently fail without notification
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
