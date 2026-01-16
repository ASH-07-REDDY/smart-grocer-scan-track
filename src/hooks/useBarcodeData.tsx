
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BarcodeProduct {
  id: string;
  barcode: string;
  name: string;
  product_name: string | null;
  brand: string | null;
  category: string | null;
  default_expiry_days: number | null;
  current_weight: number | null;
  unit: string | null;
  nutrition_info: any;
}

export function useBarcodeData() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookupBarcode = async (barcode: string): Promise<BarcodeProduct | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('barcode_products')
        .select('*')
        .eq('barcode', barcode)
        .maybeSingle();

      if (error) {
        throw error;
      }

      // Map the data to include product_name fallback
      if (data) {
        return {
          ...data,
          product_name: data.product_name || data.name
        };
      }
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to lookup barcode');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { lookupBarcode, isLoading, error };
}
