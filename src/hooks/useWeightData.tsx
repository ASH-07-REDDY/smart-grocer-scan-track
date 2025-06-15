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

interface WeightData {
  current_weight: number;
  weight_unit: string;
  last_weight_update: string;
  recent_readings: WeightReading[];
}

export function useWeightData(barcode: string) {
  const [weightData, setWeightData] = useState<WeightData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchWeightData = async (productBarcode: string) => {
    if (!user || !productBarcode) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get current weight from barcode_products
      const { data: productData, error: productError } = await supabase
        .from('barcode_products')
        .select('current_weight, weight_unit, last_weight_update')
        .eq('barcode', productBarcode)
        .single();

      if (productError) throw productError;

      // Get recent weight readings
      const { data: readings, error: readingsError } = await supabase
        .from('weight_readings')
        .select('*')
        .eq('barcode', productBarcode)
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (readingsError) throw readingsError;

      setWeightData({
        current_weight: productData?.current_weight || 0,
        weight_unit: productData?.weight_unit || 'grams',
        last_weight_update: productData?.last_weight_update || '',
        recent_readings: readings || []
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weight data');
    } finally {
      setIsLoading(false);
    }
  };

  const addWeightReading = async (
    productBarcode: string,
    weight: number,
    sensorId: string,
    additionalData?: {
      temperature?: number;
      battery_level?: number;
      signal_strength?: number;
    }
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('weight_readings')
        .insert({
          barcode: productBarcode,
          weight_value: weight,
          weight_unit: 'grams',
          sensor_id: sensorId,
          user_id: user.id,
          ...additionalData
        });

      if (error) throw error;

      // Refresh weight data after adding reading
      await fetchWeightData(productBarcode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add weight reading');
    }
  };

  useEffect(() => {
    if (barcode) {
      fetchWeightData(barcode);
    }
  }, [barcode, user]);

  // Set up real-time subscription for weight updates
  useEffect(() => {
    if (!user || !barcode) return;

    const channel = supabase
      .channel(`weight_readings_${barcode}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'weight_readings',
          filter: `barcode=eq.${barcode}`
        },
        () => {
          fetchWeightData(barcode);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barcode, user]);

  return {
    weightData,
    isLoading,
    error,
    fetchWeightData,
    addWeightReading
  };
}