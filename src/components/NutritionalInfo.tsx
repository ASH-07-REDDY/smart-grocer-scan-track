import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Apple, Search, Zap, Heart, Wheat } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  quantity: number;
  quantity_type: string;
  barcode?: string;
  categories?: { name: string };
}

interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  servingSize: string;
}

interface ProductWithNutrition extends Product {
  nutrition?: NutritionData;
}

export function NutritionalInfo() {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductWithNutrition[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Sample nutrition database - in real app, this would come from barcode API
  const nutritionDatabase: Record<string, NutritionData> = {
    'apple': {
      calories: 95,
      protein: 0.5,
      carbs: 25,
      fat: 0.3,
      fiber: 4,
      sugar: 19,
      sodium: 2,
      servingSize: '1 medium (182g)'
    },
    'chocolate': {
      calories: 546,
      protein: 4.9,
      carbs: 61,
      fat: 31,
      fiber: 7,
      sugar: 48,
      sodium: 24,
      servingSize: '100g'
    },
    'milk': {
      calories: 150,
      protein: 8,
      carbs: 12,
      fat: 8,
      fiber: 0,
      sugar: 12,
      sodium: 105,
      servingSize: '1 cup (240ml)'
    },
    'bread': {
      calories: 265,
      protein: 9,
      carbs: 49,
      fat: 3.2,
      fiber: 2.7,
      sugar: 5,
      sodium: 491,
      servingSize: '100g'
    },
    'curd': {
      calories: 98,
      protein: 11,
      carbs: 4.7,
      fat: 4.3,
      fiber: 0,
      sugar: 4.7,
      sodium: 364,
      servingSize: '1 cup (245g)'
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('grocery_items')
          .select(`
            *,
            categories (name)
          `)
          .eq('user_id', user.id);

        if (error) throw error;

        // Add nutrition data to products
        const productsWithNutrition = (data || []).map(product => {
          const nutrition = nutritionDatabase[product.name.toLowerCase()];
          return {
            ...product,
            nutrition
          };
        });

        setProducts(productsWithNutrition);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [user]);

  const categories = ['all', ...new Set(products.map(p => p.categories?.name).filter(Boolean))];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.categories?.name === selectedCategory;
    return matchesSearch && matchesCategory && product.nutrition;
  });

  const totalNutrition = filteredProducts.reduce((total, product) => {
    if (!product.nutrition) return total;
    
    return {
      calories: total.calories + (product.nutrition.calories * product.quantity),
      protein: total.protein + (product.nutrition.protein * product.quantity),
      carbs: total.carbs + (product.nutrition.carbs * product.quantity),
      fat: total.fat + (product.nutrition.fat * product.quantity),
      fiber: total.fiber + (product.nutrition.fiber * product.quantity)
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Apple className="w-8 h-8" />
            Nutritional Information
          </h1>
          <p className="text-gray-600">View nutritional data for your pantry items</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category === 'all' ? 'All' : category}
            </Button>
          ))}
        </div>
      </div>

      {/* Nutrition Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Total Nutrition Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{Math.round(totalNutrition.calories)}</div>
              <div className="text-sm text-gray-600">Calories</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{Math.round(totalNutrition.protein)}g</div>
              <div className="text-sm text-gray-600">Protein</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{Math.round(totalNutrition.carbs)}g</div>
              <div className="text-sm text-gray-600">Carbs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{Math.round(totalNutrition.fat)}g</div>
              <div className="text-sm text-gray-600">Fat</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{Math.round(totalNutrition.fiber)}g</div>
              <div className="text-sm text-gray-600">Fiber</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{product.name}</CardTitle>
                <Badge variant="secondary">
                  {product.quantity} {product.quantity_type}
                </Badge>
              </div>
              <div className="text-sm text-gray-600">
                {product.nutrition?.servingSize}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {product.nutrition && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Calories</span>
                    <span className="font-medium">{product.nutrition.calories}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Protein</span>
                      <span>{product.nutrition.protein}g</span>
                    </div>
                    <Progress value={(product.nutrition.protein / 50) * 100} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Carbs</span>
                      <span>{product.nutrition.carbs}g</span>
                    </div>
                    <Progress value={(product.nutrition.carbs / 300) * 100} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Fat</span>
                      <span>{product.nutrition.fat}g</span>
                    </div>
                    <Progress value={(product.nutrition.fat / 65) * 100} className="h-2" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t text-xs text-gray-600">
                    <div>Fiber: {product.nutrition.fiber}g</div>
                    <div>Sugar: {product.nutrition.sugar}g</div>
                    <div>Sodium: {product.nutrition.sodium}mg</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Apple className="mx-auto w-16 h-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No nutritional data found</h3>
          <p className="text-gray-600">Add more products with nutrition information to your pantry.</p>
        </div>
      )}
    </div>
  );
}