import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ExpiryDate {
  id: string;
  user_id: string;
  barcode: string;
  expiry_date: string;
  created_at: string;
  updated_at: string;
}

export function useExpiryDates() {
  const [expiryDates, setExpiryDates] = useState<ExpiryDate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchExpiryDates = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('user_expiry_dates')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExpiryDates(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch expiry dates');
    } finally {
      setIsLoading(false);
    }
  };

  const getExpiryDate = async (barcode: string): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('user_expiry_dates')
        .select('expiry_date')
        .eq('user_id', user.id)
        .eq('barcode', barcode)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data?.expiry_date || null;
    } catch (err) {
      console.error('Error fetching expiry date:', err);
      return null;
    }
  };

  const setExpiryDate = async (barcode: string, expiryDate: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_expiry_dates')
        .upsert({
          user_id: user.id,
          barcode,
          expiry_date: expiryDate
        });

      if (error) throw error;
      await fetchExpiryDates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set expiry date');
    }
  };

  const deleteExpiryDate = async (barcode: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_expiry_dates')
        .delete()
        .eq('user_id', user.id)
        .eq('barcode', barcode);

      if (error) throw error;
      await fetchExpiryDates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete expiry date');
    }
  };

  useEffect(() => {
    fetchExpiryDates();
  }, [user]);

  return {
    expiryDates,
    isLoading,
    error,
    getExpiryDate,
    setExpiryDate,
    deleteExpiryDate,
    fetchExpiryDates
  };
}