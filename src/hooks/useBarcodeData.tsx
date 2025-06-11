
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BarcodeProduct {
  id: string;
  barcode: string;
  product_name: string;
  brand: string | null;
  category: string | null;
  default_expiry_days: number | null;
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
