import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GenerateImageParams {
  productName: string;
  category?: string;
  description?: string;
}

export const useOpenAIImageGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateProductImage = async ({ productName, category, description }: GenerateImageParams): Promise<string | null> => {
    setIsGenerating(true);
    try {
      console.log('Generating image for product:', productName);
      
      const { data, error } = await supabase.functions.invoke('openai-product-image-generation', {
        body: {
          productName,
          category,
          description
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message || 'Failed to generate image');
      }

      if (!data.success || !data.imageData) {
        throw new Error('Failed to generate image - no data received');
      }

      toast({
        title: "Image Generated",
        description: `Successfully created image for ${productName}`,
      });

      return data.imageData;
    } catch (error) {
      console.error('Error generating product image:', error);
      toast({
        title: "Image Generation Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateProductImage,
    isGenerating
  };
};