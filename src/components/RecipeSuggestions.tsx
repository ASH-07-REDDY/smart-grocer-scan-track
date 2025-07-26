import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChefHat, Clock, Users, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Product {
  id: string;
  name: string;
  quantity: number;
  quantity_type: string;
  categories?: { name: string };
}

interface Recipe {
  id: string;
  title: string;
  ingredients: string[];
  instructions: string[];
  cookTime: string;
  servings: number;
  matchedIngredients: string[];
  missingIngredients: string[];
}

export function RecipeSuggestions() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Sample recipes database - in real app, this would come from an API
  const sampleRecipes: Recipe[] = [
    {
      id: '1',
      title: 'Apple Cinnamon Oatmeal',
      ingredients: ['apple', 'oats', 'cinnamon', 'milk', 'honey'],
      instructions: ['Chop apple', 'Cook oats with milk', 'Add apple and cinnamon', 'Sweeten with honey'],
      cookTime: '15 mins',
      servings: 2,
      matchedIngredients: [],
      missingIngredients: []
    },
    {
      id: '2',
      title: 'Chocolate Chip Cookies',
      ingredients: ['flour', 'chocolate', 'butter', 'sugar', 'eggs'],
      instructions: ['Mix dry ingredients', 'Cream butter and sugar', 'Combine all', 'Bake at 350°F'],
      cookTime: '25 mins',
      servings: 12,
      matchedIngredients: [],
      missingIngredients: []
    },
    {
      id: '3',
      title: 'Vegetable Curry',
      ingredients: ['onion', 'tomato', 'ginger', 'garlic', 'curry powder', 'coconut milk'],
      instructions: ['Sauté onions', 'Add spices', 'Add vegetables', 'Simmer with coconut milk'],
      cookTime: '30 mins',
      servings: 4,
      matchedIngredients: [],
      missingIngredients: []
    },
    {
      id: '4',
      title: 'Fresh Fruit Salad',
      ingredients: ['apple', 'banana', 'orange', 'grapes', 'honey', 'lemon'],
      instructions: ['Wash and chop fruits', 'Mix in bowl', 'Drizzle with honey and lemon'],
      cookTime: '10 mins',
      servings: 6,
      matchedIngredients: [],
      missingIngredients: []
    }
  ];

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
          .eq('user_id', user.id)
          .gt('quantity', 0);

        if (error) throw error;
        setProducts(data || []);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [user]);

  useEffect(() => {
    // Match recipes with available ingredients
    const availableIngredients = products.map(p => p.name.toLowerCase());
    
    const matchedRecipes = sampleRecipes.map(recipe => {
      const matchedIngredients = recipe.ingredients.filter(ingredient =>
        availableIngredients.some(available => 
          available.includes(ingredient.toLowerCase()) || 
          ingredient.toLowerCase().includes(available)
        )
      );
      
      const missingIngredients = recipe.ingredients.filter(ingredient =>
        !matchedIngredients.includes(ingredient)
      );

      return {
        ...recipe,
        matchedIngredients,
        missingIngredients
      };
    });

    // Sort by number of matched ingredients
    const sortedRecipes = matchedRecipes.sort((a, b) => 
      b.matchedIngredients.length - a.matchedIngredients.length
    );

    setRecipes(sortedRecipes);
  }, [products]);

  const filteredRecipes = recipes.filter(recipe =>
    recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.ingredients.some(ingredient => 
      ingredient.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ChefHat className="w-8 h-8" />
            Recipe Suggestions
          </h1>
          <p className="text-gray-600">Discover recipes using your available ingredients</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search recipes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary">
          {products.length} ingredients available
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredRecipes.map((recipe) => (
          <Card key={recipe.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{recipe.title}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {recipe.cookTime}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {recipe.servings} servings
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-green-700 mb-2">
                  Available ({recipe.matchedIngredients.length}/{recipe.ingredients.length})
                </h4>
                <div className="flex flex-wrap gap-1">
                  {recipe.matchedIngredients.map((ingredient) => (
                    <Badge key={ingredient} variant="default" className="text-xs">
                      {ingredient}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {recipe.missingIngredients.length > 0 && (
                <div>
                  <h4 className="font-medium text-orange-700 mb-2">
                    Missing ({recipe.missingIngredients.length})
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {recipe.missingIngredients.map((ingredient) => (
                      <Badge key={ingredient} variant="outline" className="text-xs">
                        {ingredient}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <Button 
                className="w-full" 
                variant={recipe.matchedIngredients.length >= recipe.ingredients.length * 0.7 ? "default" : "outline"}
              >
                View Recipe
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRecipes.length === 0 && (
        <div className="text-center py-12">
          <ChefHat className="mx-auto w-16 h-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No recipes found</h3>
          <p className="text-gray-600">Try searching for different ingredients or add more products to your pantry.</p>
        </div>
      )}
    </div>
  );
}