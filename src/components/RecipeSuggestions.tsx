import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChefHat, Clock, Users, Search, Play, Sparkles, Send, Bot, RefreshCw, Youtube } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  quantity: number;
  quantity_type: string;
  categories?: { name: string };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function RecipeSuggestions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const availableIngredients = useMemo(() => 
    products.map(p => p.name), [products]
  );

  const sendMessage = async (message: string) => {
    if (!message.trim() || !user) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsTyping(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-recipe-chat', {
        body: {
          ingredients: availableIngredients,
          userMessage: message,
          conversationHistory: chatMessages.map(m => ({ role: m.role, content: m.content }))
        }
      });

      if (error) throw error;

      if (data?.success) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data?.error || 'Failed to get response');
      }
    } catch (error: any) {
      console.error('Error getting AI response:', error);
      toast({
        title: "Error",
        description: "Failed to get recipe suggestions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(userInput);
  };

  const getQuickSuggestion = () => {
    const suggestions = [
      "Suggest a quick dinner recipe with my ingredients",
      "What's a healthy breakfast I can make?",
      "Give me a unique recipe I've never tried before",
      "Suggest a snack recipe for movie night",
      "What dessert can I make with my ingredients?",
      "Give me a recipe under 30 minutes"
    ];
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  };

  const openYouTubeRecipe = (recipeName: string) => {
    // Clean up recipe name - remove emojis, special chars, and "recipe" word to get better results
    const cleanName = recipeName
      .replace(/[🍳🥘🍲🍛🍜🥗🍝🍕🍔🌮🥪🥙🧆🌯🥞🧇🥓🥩🍗🍖🦴🌭🍟🍿🧈🧀🥚🍳🥯🥖🥨🥐🧁🍰🎂🍮🍭🍬🍫🍿🍩🍪🌰🥜🍯🥛🍼🍵☕🧃🥤🧋🍶🍺🍻🥂🍷🥃🍸🍹🧊🍴🥄🔪🧂]/g, '')
      .replace(/recipe/gi, '')
      .replace(/\*\*/g, '')
      .trim();
    
    const searchQuery = `${cleanName} recipe cooking tutorial how to make`;
    const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
    
    console.log('Opening YouTube search:', youtubeUrl);
    
    // Use window.open with proper parameters
    const newWindow = window.open(youtubeUrl, '_blank', 'noopener,noreferrer');
    if (!newWindow) {
      // Fallback for popup blockers
      window.location.href = youtubeUrl;
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const clearChat = () => {
    setChatMessages([]);
  };

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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ingredients Panel */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Your Ingredients</span>
              <Badge variant="secondary" className="bg-primary/10">
                {products.length}
              </Badge>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search ingredients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {filteredProducts.map((product) => (
                  <div 
                    key={product.id} 
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <span className="font-medium text-sm">{product.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {product.quantity} {product.quantity_type}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => openYouTubeRecipe(product.name)}
                        title="Find recipe on YouTube"
                      >
                        <Youtube className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredProducts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {products.length === 0 ? "Add products to your pantry" : "No matching ingredients"}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* AI Chat Panel */}
        <Card className="lg:col-span-2 flex flex-col h-[500px]">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                Recipe AI Chef
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearChat}
                  disabled={chatMessages.length === 0}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  New Chat
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col overflow-hidden">
            {/* Chat Messages */}
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-12">
                    <ChefHat className="mx-auto w-16 h-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Ask me for recipes!</h3>
                    <p className="text-muted-foreground mb-4">
                      I'll suggest creative recipes using your {products.length} available ingredients.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendMessage("Suggest a quick and easy dinner recipe")}
                        disabled={products.length === 0}
                      >
                        <Sparkles className="w-4 h-4 mr-1" />
                        Quick Dinner
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendMessage("What's a healthy meal I can prepare?")}
                        disabled={products.length === 0}
                      >
                        <Sparkles className="w-4 h-4 mr-1" />
                        Healthy Meal
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendMessage("Suggest something unique and creative")}
                        disabled={products.length === 0}
                      >
                        <Sparkles className="w-4 h-4 mr-1" />
                        Creative Recipe
                      </Button>
                    </div>
                  </div>
                ) : (
                  chatMessages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {message.role === 'assistant' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <div 
                              className="text-sm whitespace-pre-wrap"
                              dangerouslySetInnerHTML={{ 
                                __html: message.content
                                  .replace(/## (.*)/g, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
                                  .replace(/### (.*)/g, '<h4 class="font-semibold mt-3 mb-1">$1</h4>')
                                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                  .replace(/^\- (.*)/gm, '<li class="ml-4">$1</li>')
                                  .replace(/^\d+\. (.*)/gm, '<li class="ml-4 list-decimal">$1</li>')
                              }}
                            />
                            {/* Extract recipe name and add YouTube button */}
                            {message.content.includes('##') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-3"
                                onClick={() => {
                                  const match = message.content.match(/## 🍳?\s*(.*)/);
                                  if (match) openYouTubeRecipe(match[1]);
                                }}
                              >
                                <Youtube className="w-4 h-4 mr-1 text-red-500" />
                                Watch on YouTube
                              </Button>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm">{message.content}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="flex gap-2 mt-4 pt-4 border-t">
              <Input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={products.length === 0 ? "Add ingredients first..." : "Ask for a recipe..."}
                disabled={isTyping || products.length === 0}
                className="flex-1"
              />
              <Button 
                type="submit" 
                disabled={!userInput.trim() || isTyping || products.length === 0}
                className="bg-gradient-primary"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
