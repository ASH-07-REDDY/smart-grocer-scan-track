import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  image_url?: string | null;
  source?: 'local' | 'openfoodfacts';
}

interface OpenFoodFactsProduct {
  product_name?: string;
  brands?: string;
  categories?: string;
  image_url?: string;
  nutriments?: {
    energy_kcal_100g?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
    sugars_100g?: number;
    salt_100g?: number;
  };
  quantity?: string;
}

export function useBarcodeData() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Lookup from local database first, then Open Food Facts
  const lookupBarcode = async (barcode: string): Promise<BarcodeProduct | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // First, check local database
      const { data: localData, error: localError } = await supabase
        .from('barcode_products')
        .select('*')
        .eq('barcode', barcode)
        .maybeSingle();

      if (localError) {
        console.error('Local barcode lookup error:', localError);
      }

      if (localData) {
        console.log('Product found in local database:', localData.name);
        return {
          ...localData,
          product_name: localData.product_name || localData.name,
          source: 'local'
        };
      }

      // If not found locally, search Open Food Facts
      console.log('Searching Open Food Facts for barcode:', barcode);
      const openFoodFactsResult = await lookupOpenFoodFacts(barcode);

      if (openFoodFactsResult) {
        console.log('Product found on Open Food Facts:', openFoodFactsResult.product_name);
        
        // Save to local database for future lookups
        await saveToLocalDatabase(barcode, openFoodFactsResult);
        
        return openFoodFactsResult;
      }

      console.log('Product not found in any database');
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to lookup barcode';
      setError(errorMessage);
      console.error('Barcode lookup error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Search Open Food Facts API
  const lookupOpenFoodFacts = async (barcode: string): Promise<BarcodeProduct | null> => {
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
        {
          headers: {
            'User-Agent': 'SmartPantry/1.0 (https://smart-grocer-scan-track.lovable.app)'
          }
        }
      );

      if (!response.ok) {
        console.log('Open Food Facts API returned:', response.status);
        return null;
      }

      const data = await response.json();

      if (data.status !== 1 || !data.product) {
        console.log('Product not found on Open Food Facts');
        return null;
      }

      const product: OpenFoodFactsProduct = data.product;

      // Map Open Food Facts category to our categories
      const mappedCategory = mapOpenFoodFactsCategory(product.categories || '');

      // Estimate default expiry days based on category
      const defaultExpiryDays = estimateExpiryDays(mappedCategory);

      // Build nutrition info
      const nutritionInfo = product.nutriments ? {
        energy_kcal: product.nutriments.energy_kcal_100g,
        proteins: product.nutriments.proteins_100g,
        carbohydrates: product.nutriments.carbohydrates_100g,
        fat: product.nutriments.fat_100g,
        fiber: product.nutriments.fiber_100g,
        sugars: product.nutriments.sugars_100g,
        salt: product.nutriments.salt_100g
      } : null;

      return {
        id: crypto.randomUUID(),
        barcode,
        name: product.product_name || 'Unknown Product',
        product_name: product.product_name || 'Unknown Product',
        brand: product.brands || null,
        category: mappedCategory,
        default_expiry_days: defaultExpiryDays,
        current_weight: null,
        unit: product.quantity || null,
        nutrition_info: nutritionInfo,
        image_url: product.image_url || null,
        source: 'openfoodfacts'
      };
    } catch (error) {
      console.error('Open Food Facts API error:', error);
      return null;
    }
  };

  // Save product to local database
  const saveToLocalDatabase = async (barcode: string, product: BarcodeProduct) => {
    try {
      const { error } = await supabase
        .from('barcode_products')
        .upsert({
          barcode,
          name: product.name,
          product_name: product.product_name,
          brand: product.brand,
          category: product.category,
          default_expiry_days: product.default_expiry_days,
          unit: product.unit,
          nutrition_info: product.nutrition_info,
          image_url: product.image_url
        }, {
          onConflict: 'barcode'
        });

      if (error) {
        console.error('Error saving to local database:', error);
      } else {
        console.log('Product saved to local database');
      }
    } catch (error) {
      console.error('Error saving product locally:', error);
    }
  };

  // Map Open Food Facts categories to our categories
  const mapOpenFoodFactsCategory = (categories: string): string => {
    const lowerCategories = categories.toLowerCase();
    
    if (lowerCategories.includes('dairy') || lowerCategories.includes('milk') || lowerCategories.includes('cheese') || lowerCategories.includes('yogurt')) {
      return 'Dairy';
    }
    if (lowerCategories.includes('meat') || lowerCategories.includes('poultry') || lowerCategories.includes('chicken') || lowerCategories.includes('beef')) {
      return 'Meat';
    }
    if (lowerCategories.includes('fruit') || lowerCategories.includes('vegetable') || lowerCategories.includes('produce')) {
      return 'Produce';
    }
    if (lowerCategories.includes('bread') || lowerCategories.includes('bakery') || lowerCategories.includes('pastry')) {
      return 'Bakery';
    }
    if (lowerCategories.includes('beverage') || lowerCategories.includes('drink') || lowerCategories.includes('juice') || lowerCategories.includes('soda')) {
      return 'Beverages';
    }
    if (lowerCategories.includes('frozen')) {
      return 'Frozen';
    }
    if (lowerCategories.includes('snack') || lowerCategories.includes('chip') || lowerCategories.includes('candy')) {
      return 'Snacks';
    }
    if (lowerCategories.includes('canned') || lowerCategories.includes('preserved')) {
      return 'Canned Goods';
    }
    if (lowerCategories.includes('grain') || lowerCategories.includes('rice') || lowerCategories.includes('pasta') || lowerCategories.includes('cereal')) {
      return 'Grains';
    }
    if (lowerCategories.includes('condiment') || lowerCategories.includes('sauce') || lowerCategories.includes('spice')) {
      return 'Condiments';
    }
    
    return 'Other';
  };

  // Estimate expiry days based on category
  const estimateExpiryDays = (category: string): number => {
    const expiryMap: Record<string, number> = {
      'Dairy': 14,
      'Meat': 5,
      'Produce': 7,
      'Bakery': 5,
      'Beverages': 180,
      'Frozen': 180,
      'Snacks': 90,
      'Canned Goods': 365,
      'Grains': 180,
      'Condiments': 365,
      'Other': 30
    };
    return expiryMap[category] || 30;
  };

  // Add product to local database manually
  const addBarcodeProduct = async (product: Omit<BarcodeProduct, 'id' | 'source'>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('barcode_products')
        .upsert({
          barcode: product.barcode,
          name: product.name,
          product_name: product.product_name,
          brand: product.brand,
          category: product.category,
          default_expiry_days: product.default_expiry_days,
          current_weight: product.current_weight,
          unit: product.unit,
          nutrition_info: product.nutrition_info,
          image_url: product.image_url
        }, {
          onConflict: 'barcode'
        });

      if (error) {
        throw error;
      }

      toast({
        title: 'Product Saved',
        description: `${product.name} has been added to the barcode database`,
      });
      return true;
    } catch (err) {
      console.error('Error adding barcode product:', err);
      toast({
        title: 'Error',
        description: 'Failed to save product to database',
        variant: 'destructive',
      });
      return false;
    }
  };

  return { 
    lookupBarcode, 
    lookupOpenFoodFacts,
    addBarcodeProduct,
    isLoading, 
    error 
  };
}
