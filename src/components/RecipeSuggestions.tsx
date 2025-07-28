import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChefHat, Clock, Users, Search, Play, Sparkles, Plus, BookOpen } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [manualProduct, setManualProduct] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showRecipeDialog, setShowRecipeDialog] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

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

    // Set up real-time listener for product changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grocery_items'
        },
        (payload) => {
          console.log('Product change detected in recipes:', payload);
          fetchProducts(); // Refetch products when changes occur
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    // Match recipes with available ingredients (including manual product input)
    const availableIngredients = [
      ...products.map(p => p.name.toLowerCase()),
      ...(manualProduct ? [manualProduct.toLowerCase()] : [])
    ];
    
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
  }, [products, manualProduct]);

  const generateAIRecipe = async () => {
    if (!user) return;
    
    setGeneratingAI(true);
    try {
      const availableIngredients = products.map(p => p.name).join(', ');
      
      const { data, error } = await supabase.functions.invoke('openai-product-image-generation', {
        body: {
          prompt: `Generate a detailed recipe using these available ingredients: ${availableIngredients}. Include cooking instructions, preparation time, and serving size.`,
          type: 'recipe'
        }
      });

      if (error) throw error;

      toast({
        title: "AI Recipe Generated!",
        description: "Check the AI Suggestions dialog for your personalized recipe.",
      });
      
    } catch (error) {
      console.error('Error generating AI recipe:', error);
      toast({
        title: "AI Recipe Generation Failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setGeneratingAI(false);
    }
  };

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

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search recipes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="relative flex-1 max-w-md">
          <Plus className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Add ingredient manually..."
            value={manualProduct}
            onChange={(e) => setManualProduct(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {products.length + (manualProduct ? 1 : 0)} ingredients available
          </Badge>
          <Button 
            variant="outline" 
            onClick={generateAIRecipe}
            disabled={generatingAI}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {generatingAI ? 'Generating...' : 'AI Suggestions'}
          </Button>
        </div>
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
              
              <div className="flex gap-2">
                <Button 
                  className="flex-1" 
                  variant={recipe.matchedIngredients.length >= recipe.ingredients.length * 0.7 ? "default" : "outline"}
                  onClick={() => {
                    const searchQuery = `${recipe.title} recipe how to make`;
                    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`, '_blank');
                  }}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Watch Video
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedRecipe(recipe);
                    setShowRecipeDialog(true);
                  }}
                >
                  <BookOpen className="w-4 h-4 mr-1" />
                  View Recipe
                </Button>
              </div>
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

      {/* Recipe Details Dialog */}
      <Dialog open={showRecipeDialog} onOpenChange={setShowRecipeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="w-5 h-5" />
              {selectedRecipe?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRecipe && (
            <div className="space-y-6">
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {selectedRecipe.cookTime}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {selectedRecipe.servings} servings
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3">Ingredients:</h3>
                <div className="grid grid-cols-1 gap-2">
                  {selectedRecipe.ingredients.map((ingredient) => (
                    <div 
                      key={ingredient} 
                      className={`flex items-center gap-2 p-2 rounded ${
                        selectedRecipe.matchedIngredients.includes(ingredient)
                          ? 'bg-green-50 text-green-700'
                          : 'bg-orange-50 text-orange-700'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${
                        selectedRecipe.matchedIngredients.includes(ingredient)
                          ? 'bg-green-500'
                          : 'bg-orange-500'
                      }`} />
                      {ingredient}
                      {selectedRecipe.matchedIngredients.includes(ingredient) ? ' ✓' : ' (need to buy)'}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3">Instructions:</h3>
                <ol className="space-y-2">
                  {selectedRecipe.instructions.map((instruction, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className="text-gray-700">{instruction}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  className="flex-1" 
                  onClick={() => {
                    const searchQuery = `${selectedRecipe.title} recipe how to make`;
                    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`, '_blank');
                  }}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Watch on YouTube
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowRecipeDialog(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}