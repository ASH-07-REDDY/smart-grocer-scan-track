import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface WeightReading {
  id: string;
  barcode: string | null;
  weight: number;
  unit: string | null;
  device_id: string | null;
  recorded_at: string;
}

interface BarcodeProductWithWeight {
  id: string;
  barcode: string;
  name: string;
  product_name: string | null;
  brand: string | null;
  category: string | null;
  default_expiry_days: number | null;
  nutrition_info: any;
  current_weight: number;
  unit: string;
  updated_at: string;
  user_expiry_date?: string;
}

export function useWeightData() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const getProductWithWeight = async (barcode: string): Promise<BarcodeProductWithWeight | null> => {
    if (!user) return null;
    
    setIsLoading(true);
    setError(null);

    try {
      // Get product data with current weight - ensure barcode match is exact
      const { data: productData, error: productError } = await supabase
        .from('barcode_products')
        .select('*')
        .eq('barcode', barcode.trim())
        .maybeSingle();

      if (productError) throw productError;
      if (!productData) {
        console.log(`No product found for barcode: ${barcode}`);
        return null;
      }

      // Get user's expiry date for this specific barcode
      const { data: expiryData } = await supabase
        .from('user_expiry_dates')
        .select('expiry_date')
        .eq('user_id', user.id)
        .eq('barcode', barcode.trim())
        .maybeSingle();

      // Get the latest weight reading for this specific barcode
      const { data: latestWeight } = await supabase
        .from('weight_readings')
        .select('weight, unit, recorded_at')
        .eq('barcode', barcode.trim())
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Use the latest weight reading if available, otherwise fall back to product's current_weight
      const currentWeight = latestWeight?.weight || productData.current_weight || 0;
      const weightUnit = latestWeight?.unit || productData.unit || 'g';
      const lastUpdate = latestWeight?.recorded_at || productData.updated_at;

      return {
        ...productData,
        current_weight: currentWeight,
        unit: weightUnit,
        updated_at: lastUpdate,
        user_expiry_date: expiryData?.expiry_date || null
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get product data');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const saveExpiryDate = async (barcode: string, expiryDate: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_expiry_dates')
        .upsert({
          user_id: user.id,
          barcode,
          expiry_date: expiryDate
        });

      if (error) throw error;
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expiry date');
      return false;
    }
  };

  const getWeightHistory = async (barcode: string, limit: number = 10): Promise<WeightReading[]> => {
    try {
      const { data, error } = await supabase
        .from('weight_readings')
        .select('*')
        .eq('barcode', barcode.trim())
        .order('recorded_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      console.log(`Found ${data?.length || 0} weight readings for barcode ${barcode}`);
      return data || [];
    } catch (err) {
      console.error('Error fetching weight history:', err);
      return [];
    }
  };

  const simulateWeightReading = async (barcode: string, weight: number): Promise<boolean> => {
    try {
      // Validate that the barcode exists in barcode_products
      const { data: productExists } = await supabase
        .from('barcode_products')
        .select('barcode')
        .eq('barcode', barcode.trim())
        .maybeSingle();

      if (!productExists) {
        setError(`Product with barcode ${barcode} not found. Please add the product first.`);
        return false;
      }

      // Insert weight reading with exact barcode match
      const { error } = await supabase
        .from('weight_readings')
        .insert({
          barcode: barcode.trim(),
          weight: weight,
          unit: 'g',
          device_id: 'ESP32_SIMULATOR'
        });

      if (error) throw error;

      console.log(`Weight reading saved: ${weight}g for barcode ${barcode}`);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to simulate weight reading');
      return false;
    }
  };

  return {
    getProductWithWeight,
    saveExpiryDate,
    getWeightHistory,
    simulateWeightReading,
    isLoading,
    error
  };
}
