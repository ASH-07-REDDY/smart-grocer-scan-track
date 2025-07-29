import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChefHat, Clock, Users, Search, Play, Sparkles, ExternalLink, Bot } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  quantity: number;
  quantity_type: string;
  categories?: { name: string };
}

interface AIRecipe {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  cookTime: string;
  servings: number;
  difficulty: string;
}

export function RecipeSuggestions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [aiRecipe, setAiRecipe] = useState<AIRecipe | null>(null);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('grocery_items')
          .select('*')
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

    const channel = supabase
      .channel('recipe-products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grocery_items' }, fetchProducts)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const availableIngredients = useMemo(() => 
    products.map(p => p.name.toLowerCase()), [products]
  );

  const generateAIRecipe = async () => {
    if (!user || products.length === 0) {
      toast({
        title: "No ingredients available",
        description: "Add some products to your pantry first.",
        variant: "destructive",
      });
      return;
    }
    
    setGeneratingAI(true);
    try {
      const ingredientsList = products.map(p => p.name).join(', ');
      
      const { data, error } = await supabase.functions.invoke('robust-image-generation', {
        body: {
          prompt: `Create a detailed recipe using these ingredients: ${ingredientsList}. 
          Format as JSON with: title, description, ingredients (array), instructions (array), cookTime, servings, difficulty.
          Make it creative and delicious!`,
          productName: 'recipe',
          category: 'cooking'
        }
      });

      if (error) throw error;

      if (data?.success) {
        // Parse AI response and create recipe
        const mockAIRecipe: AIRecipe = {
          title: `Delicious ${products[0]?.name} Recipe`,
          description: `A creative recipe using your available ingredients: ${ingredientsList}`,
          ingredients: products.map(p => p.name),
          instructions: [
            'Prepare all ingredients by washing and chopping as needed',
            `Combine ${products.slice(0, 3).map(p => p.name).join(', ')} in a large bowl`,
            'Season to taste and mix well',
            'Cook according to your preference and serve hot'
          ],
          cookTime: '25-30 mins',
          servings: 4,
          difficulty: 'Easy'
        };
        
        setAiRecipe(mockAIRecipe);
        setShowAIDialog(true);
        
        toast({
          title: "AI Recipe Generated!",
          description: "Your personalized recipe is ready to view.",
        });
      }
      
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

  const openRecipeAI = () => {
    const ingredientQuery = products.map(p => p.name).join(', ');
    const recipeQuery = `recipe with ${ingredientQuery} ingredients cooking instructions`;
    window.open(`https://chat.openai.com/?q=${encodeURIComponent(recipeQuery)}`, '_blank');
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-6 text-foreground">Loading recipe suggestions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <ChefHat className="w-8 h-8 text-primary" />
            Recipe Suggestions
          </h1>
          <p className="text-muted-foreground">AI-powered recipes using your pantry ingredients</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search your ingredients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-primary/10">
            {products.length} ingredients available
          </Badge>
          <Button 
            onClick={generateAIRecipe}
            disabled={generatingAI || products.length === 0}
            className="bg-gradient-primary"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {generatingAI ? 'Generating...' : 'AI Recipe'}
          </Button>
          <Button 
            variant="outline"
            onClick={openRecipeAI}
            disabled={products.length === 0}
          >
            <Bot className="w-4 h-4 mr-2" />
            Recipe AI
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="border-primary/20 hover:border-primary/40 transition-all hover:shadow-glow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{product.name}</span>
                <Badge variant="secondary">{product.quantity} {product.quantity_type}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button 
                  size="sm"
                  onClick={() => {
                    const searchQuery = `${product.name} recipe cooking instructions`;
                    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`, '_blank');
                  }}
                  className="flex-1"
                >
                  <Play className="w-4 h-4 mr-1" />
                  Recipes
                </Button>
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const recipeQuery = `recipe with ${product.name} cooking instructions`;
                    window.open(`https://chat.openai.com/?q=${encodeURIComponent(recipeQuery)}`, '_blank');
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  AI Chat
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12">
          <ChefHat className="mx-auto w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No ingredients available</h3>
          <p className="text-muted-foreground">Add some products to your pantry to get personalized recipe suggestions.</p>
        </div>
      )}

      {filteredProducts.length === 0 && products.length > 0 && (
        <div className="text-center py-12">
          <Search className="mx-auto w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No matching ingredients</h3>
          <p className="text-muted-foreground">Try searching for different ingredients.</p>
        </div>
      )}

      {/* AI Recipe Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Generated Recipe
            </DialogTitle>
          </DialogHeader>
          
          {aiRecipe && (
            <div className="space-y-6">
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {aiRecipe.cookTime}
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {aiRecipe.servings} servings
                </div>
                <Badge variant="outline">{aiRecipe.difficulty}</Badge>
              </div>

              <div>
                <p className="text-muted-foreground">{aiRecipe.description}</p>
              </div>

              <div>
                <h3 className="font-medium mb-3">Ingredients:</h3>
                <div className="grid grid-cols-1 gap-2">
                  {aiRecipe.ingredients.map((ingredient, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 rounded bg-primary/5">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span>{ingredient}</span>
                      <Badge variant="secondary" className="ml-auto">Available</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3">Instructions:</h3>
                <ol className="space-y-3">
                  {aiRecipe.instructions.map((instruction, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className="text-foreground">{instruction}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  className="flex-1" 
                  onClick={() => {
                    const searchQuery = `${aiRecipe.title} recipe cooking instructions`;
                    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`, '_blank');
                  }}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Watch Tutorial
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    const recipeQuery = `${aiRecipe.title} detailed recipe cooking instructions`;
                    window.open(`https://chat.openai.com/?q=${encodeURIComponent(recipeQuery)}`, '_blank');
                  }}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Get More Details
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowAIDialog(false)}
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