import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface WeightReading {
  id: string;
  barcode: string;
  weight_value: number;
  weight_unit: string;
  sensor_id: string;
  temperature?: number;
  battery_level?: number;
  signal_strength?: number;
  timestamp: string;
  user_id: string;
}

interface BarcodeProductWithWeight {
  id: string;
  barcode: string;
  product_name: string;
  brand: string | null;
  category: string | null;
  default_expiry_days: number | null;
  nutrition_info: any;
  current_weight: number;
  weight_unit: string;
  last_weight_update: string;
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
      // Get product data with current weight
      const { data: productData, error: productError } = await supabase
        .from('barcode_products')
        .select('*')
        .eq('barcode', barcode)
        .maybeSingle();

      if (productError) throw productError;
      if (!productData) return null;

      // Get user's expiry date for this product
      const { data: expiryData } = await supabase
        .from('user_expiry_dates')
        .select('expiry_date')
        .eq('user_id', user.id)
        .eq('barcode', barcode)
        .maybeSingle();

      return {
        ...productData,
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
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('weight_readings')
        .select('*')
        .eq('user_id', user.id)
        .eq('barcode', barcode)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error fetching weight history:', err);
      return [];
    }
  };

  const simulateWeightReading = async (barcode: string, weight: number): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('weight_readings')
        .insert({
          user_id: user.id,
          barcode,
          weight_value: weight,
          weight_unit: 'grams',
          sensor_id: 'ESP32_SIMULATOR',
          temperature: 22.5,
          battery_level: 85,
          signal_strength: -45
        });

      if (error) throw error;
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