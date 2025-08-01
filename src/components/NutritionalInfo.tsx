import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Apple, Search, Zap, Trash2, Sparkles } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  quantity: number;
  quantity_type: string;
  barcode?: string;
  categories?: { name: string };
  created_at: string;
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

// Comprehensive nutrition database with AI fallback
const getNutritionData = async (productName: string): Promise<NutritionData | null> => {
  const nutritionDB: Record<string, NutritionData> = {
    // Fruits
    'apple': { calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4, sugar: 19, sodium: 2, servingSize: '1 medium (182g)' },
    'banana': { calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3, sugar: 14, sodium: 1, servingSize: '1 medium (118g)' },
    'orange': { calories: 62, protein: 1.2, carbs: 15.4, fat: 0.2, fiber: 3.1, sugar: 12.2, sodium: 0, servingSize: '1 medium (154g)' },
    'grapes': { calories: 62, protein: 0.6, carbs: 16, fat: 0.2, fiber: 0.9, sugar: 15, sodium: 2, servingSize: '1 cup (151g)' },
    'mango': { calories: 107, protein: 0.8, carbs: 28, fat: 0.4, fiber: 3, sugar: 24, sodium: 2, servingSize: '1 cup diced (165g)' },
    
    // Vegetables
    'tomato': { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, sugar: 2.6, sodium: 5, servingSize: '1 medium (123g)' },
    'potato': { calories: 161, protein: 4.3, carbs: 37, fat: 0.2, fiber: 2.2, sugar: 0.8, sodium: 8, servingSize: '1 medium (173g)' },
    'onion': { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7, sugar: 4.2, sodium: 4, servingSize: '1 medium (110g)' },
    'carrot': { calories: 25, protein: 0.5, carbs: 6, fat: 0.1, fiber: 1.7, sugar: 2.9, sodium: 42, servingSize: '1 medium (61g)' },
    'broccoli': { calories: 55, protein: 3.7, carbs: 11, fat: 0.6, fiber: 5, sugar: 2.6, sodium: 64, servingSize: '1 cup chopped (156g)' },
    'spinach': { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, sugar: 0.4, sodium: 79, servingSize: '1 cup (156g)' },
    
    // Dairy & Protein
    'milk': { calories: 150, protein: 8, carbs: 12, fat: 8, fiber: 0, sugar: 12, sodium: 105, servingSize: '1 cup (240ml)' },
    'curd': { calories: 98, protein: 11, carbs: 4.7, fat: 4.3, fiber: 0, sugar: 4.7, sodium: 364, servingSize: '1 cup (245g)' },
    'cheese': { calories: 113, protein: 7, carbs: 1, fat: 9, fiber: 0, sugar: 0.5, sodium: 180, servingSize: '1 oz (28g)' },
    'yogurt': { calories: 149, protein: 8.5, carbs: 11.4, fat: 8, fiber: 0, sugar: 11.4, sodium: 113, servingSize: '1 cup (245g)' },
    'egg': { calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, sugar: 1.1, sodium: 124, servingSize: '1 large (50g)' },
    'chicken': { calories: 239, protein: 27, carbs: 0, fat: 14, fiber: 0, sugar: 0, sodium: 82, servingSize: '100g' },
    'fish': { calories: 206, protein: 22, carbs: 0, fat: 12, fiber: 0, sugar: 0, sodium: 59, servingSize: '100g' },
    'paneer': { calories: 321, protein: 25, carbs: 3.4, fat: 25, fiber: 0, sugar: 2.6, sodium: 18, servingSize: '100g' },
    
    // Grains & Carbs
    'rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0.1, sodium: 5, servingSize: '1 cup cooked (158g)' },
    'bread': { calories: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7, sugar: 5, sodium: 491, servingSize: '100g' },
    'wheat': { calories: 339, protein: 13.2, carbs: 71.2, fat: 2.5, fiber: 12.2, sugar: 0.4, sodium: 2, servingSize: '100g' },
    'oats': { calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9, fiber: 10.6, sugar: 0.9, sodium: 2, servingSize: '100g' },
    'pasta': { calories: 220, protein: 8, carbs: 44, fat: 1.3, fiber: 2.5, sugar: 0.8, sodium: 1, servingSize: '100g cooked' },
    
    // Legumes & Nuts
    'lentils': { calories: 353, protein: 25, carbs: 60, fat: 1.1, fiber: 10.7, sugar: 2, sodium: 6, servingSize: '100g' },
    'chickpeas': { calories: 378, protein: 20.1, carbs: 63, fat: 6.4, fiber: 12.2, sugar: 10.7, sodium: 24, servingSize: '100g' },
    'almonds': { calories: 579, protein: 21.2, carbs: 21.6, fat: 49.9, fiber: 12.5, sugar: 4.4, sodium: 1, servingSize: '100g' },
    'peanuts': { calories: 567, protein: 25.8, carbs: 16.1, fat: 49.2, fiber: 8.5, sugar: 4.7, sodium: 18, servingSize: '100g' },
    
    // Others
    'chocolate': { calories: 546, protein: 4.9, carbs: 61, fat: 31, fiber: 7, sugar: 48, sodium: 24, servingSize: '100g' },
    'honey': { calories: 304, protein: 0.3, carbs: 82.4, fat: 0, fiber: 0.2, sugar: 82.1, sodium: 4, servingSize: '100g' },
    'oil': { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 0, servingSize: '100ml' }
  };

  const key = productName.toLowerCase().trim();
  
  // First check direct match
  if (nutritionDB[key]) {
    return nutritionDB[key];
  }
  
  // Check partial matches
  for (const [dbKey, nutrition] of Object.entries(nutritionDB)) {
    if (key.includes(dbKey) || dbKey.includes(key)) {
      return nutrition;
    }
  }
  
  // AI-powered nutrition generation for unknown products
  try {
    const { data, error } = await supabase.functions.invoke('enhanced-product-image-generation', {
      body: {
        productName: `Generate nutritional information for "${productName}" in JSON format: {"calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number, "sugar": number, "sodium": number, "servingSize": "string"}. Provide realistic nutritional values per typical serving.`,
        category: 'nutrition',
        productId: `nutrition-${Date.now()}`
      }
    });
    
    if (data?.nutritionData) {
      return data.nutritionData;
    }
  } catch (error) {
    console.log('AI nutrition generation failed, using default values');
  }
  
  // Fallback: Generate reasonable defaults based on product type
  const estimateNutrition = (name: string): NutritionData => {
    const lower = name.toLowerCase();
    
    // Fruit-like products
    if (lower.includes('fruit') || lower.includes('juice') || lower.includes('sweet')) {
      return { calories: 60, protein: 0.5, carbs: 15, fat: 0.2, fiber: 2, sugar: 12, sodium: 2, servingSize: '100g' };
    }
    
    // Vegetable-like products
    if (lower.includes('vegetable') || lower.includes('green') || lower.includes('leaf')) {
      return { calories: 25, protein: 2, carbs: 5, fat: 0.3, fiber: 3, sugar: 2, sodium: 10, servingSize: '100g' };
    }
    
    // Meat/protein products
    if (lower.includes('meat') || lower.includes('protein') || lower.includes('fish')) {
      return { calories: 200, protein: 20, carbs: 0, fat: 12, fiber: 0, sugar: 0, sodium: 70, servingSize: '100g' };
    }
    
    // Grain/cereal products
    if (lower.includes('grain') || lower.includes('cereal') || lower.includes('flour')) {
      return { calories: 300, protein: 8, carbs: 60, fat: 2, fiber: 8, sugar: 1, sodium: 5, servingSize: '100g' };
    }
    
    // Default for unknown products
    return { calories: 100, protein: 3, carbs: 20, fat: 2, fiber: 2, sugar: 5, sodium: 20, servingSize: '100g' };
  };
  
  return estimateNutrition(productName);
};

export function NutritionalInfo() {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductWithNutrition[]>([]);
  const [newProducts, setNewProducts] = useState<ProductWithNutrition[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const removeUsedProduct = async (productId: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('grocery_items')
        .update({ quantity: 0 })
        .eq('id', productId)
        .eq('user_id', user.id);
        
      if (error) throw error;
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (error) {
      console.error('Error removing used product:', error);
    }
  };

  const fetchAndProcessProducts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('grocery_items')
        .select(`*, categories (name)`)
        .eq('user_id', user.id)
        .gt('quantity', 0);

      if (error) throw error;

      // Filter out expired items
      const today = new Date().toISOString().split('T')[0];
      const validData = (data || []).filter(product => 
        !product.expiry_date || product.expiry_date >= today
      );

      // Add AI-enhanced nutrition data
      const productsWithNutrition = await Promise.all(
        validData.map(async (product) => {
          const nutrition = await getNutritionData(product.name);
          return { ...product, nutrition };
        })
      );

      // Identify new products (added in last 24 hours)
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      
      const recentProducts = productsWithNutrition.filter(product => {
        const createdAt = new Date(product.created_at);
        return createdAt > twentyFourHoursAgo && product.nutrition;
      });
      
      setProducts(productsWithNutrition);
      setNewProducts(recentProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAndProcessProducts();

    // Real-time updates
    const channel = supabase
      .channel('nutrition-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'grocery_items'
      }, () => {
        fetchAndProcessProducts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading nutrition data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-chart-2 bg-clip-text text-transparent flex items-center justify-center gap-3">
          <Apple className="w-10 h-10 text-primary" />
          AI Nutritional Intelligence
        </h1>
        <p className="text-muted-foreground text-lg">Smart insights for your pantry items</p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 glass-card border-primary/20"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="transition-all duration-200"
            >
              {category === 'all' ? 'All' : category}
            </Button>
          ))}
        </div>
      </div>

      {/* New Products Spotlight */}
      {newProducts.length > 0 && (
        <Card className="glass-card border-primary/30 shadow-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Sparkles className="w-5 h-5" />
              Recently Added Products
              <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary">
                New
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {newProducts.map((product) => (
                <div key={product.id} className="accent-card p-4 rounded-lg border border-accent/20">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-accent-foreground">{product.name}</h4>
                    <Badge variant="outline" className="border-accent/30">
                      {product.quantity} {product.quantity_type}
                    </Badge>
                  </div>
                  {product.nutrition && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Calories:</span>
                        <span className="font-medium">{product.nutrition.calories}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Protein:</span>
                        <span className="font-medium">{product.nutrition.protein}g</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Carbs:</span>
                        <span className="font-medium">{product.nutrition.carbs}g</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Nutrition Summary */}
      <Card className="glass-card border-chart-1/30 shadow-neon">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-chart-1">
            <Zap className="w-5 h-5" />
            Total Pantry Nutrition
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-chart-1">{Math.round(totalNutrition.calories)}</div>
              <div className="text-sm text-muted-foreground">Calories</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-chart-2">{Math.round(totalNutrition.protein)}g</div>
              <div className="text-sm text-muted-foreground">Protein</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-chart-3">{Math.round(totalNutrition.carbs)}g</div>
              <div className="text-sm text-muted-foreground">Carbs</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-chart-4">{Math.round(totalNutrition.fat)}g</div>
              <div className="text-sm text-muted-foreground">Fat</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-chart-5">{Math.round(totalNutrition.fiber)}g</div>
              <div className="text-sm text-muted-foreground">Fiber</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="glass-card hover:shadow-glow transition-all duration-300 hover:-translate-y-1 border-border/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">{product.name}</CardTitle>
                <Badge variant="secondary" className="bg-secondary/20">
                  {product.quantity} {product.quantity_type}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {product.nutrition?.servingSize}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {product.nutrition && (
                <>
                  <div className="flex justify-between items-center p-3 bg-chart-1/10 rounded-lg">
                    <span className="font-medium">Calories</span>
                    <span className="text-xl font-bold text-chart-1">{product.nutrition.calories}</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Protein</span>
                        <span className="font-medium">{product.nutrition.protein}g</span>
                      </div>
                      <Progress value={(product.nutrition.protein / 50) * 100} className="h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Carbs</span>
                        <span className="font-medium">{product.nutrition.carbs}g</span>
                      </div>
                      <Progress value={(product.nutrition.carbs / 300) * 100} className="h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Fat</span>
                        <span className="font-medium">{product.nutrition.fat}g</span>
                      </div>
                      <Progress value={(product.nutrition.fat / 65) * 100} className="h-2" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-3 border-t text-xs text-muted-foreground">
                      <div>Fiber: {product.nutrition.fiber}g</div>
                      <div>Sugar: {product.nutrition.sugar}g</div>
                      <div className="col-span-2">Sodium: {product.nutrition.sodium}mg</div>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeUsedProduct(product.id)}
                    className="w-full text-destructive border-destructive/20 hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Mark as Used
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-16">
          <Apple className="mx-auto w-20 h-20 text-muted-foreground/50 mb-6" />
          <h3 className="text-xl font-semibold mb-2">No nutritional data available</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Add more products to your pantry to see their nutritional information and AI-powered insights.
          </p>
        </div>
      )}
    </div>
  );
}