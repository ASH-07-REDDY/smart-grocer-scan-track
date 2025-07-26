import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Search, ExternalLink, Star, Clock, Package } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  quantity: number;
  quantity_type: string;
  categories?: { name: string };
}

interface Store {
  name: string;
  logo: string;
  baseUrl: string;
  searchUrl: string;
  color: string;
}

export function OnlineShoppingView() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);

  const stores: Store[] = [
    {
      name: 'Amazon Fresh',
      logo: '🛒',
      baseUrl: 'https://www.amazon.com',
      searchUrl: 'https://www.amazon.com/s?k={query}&i=amazonfresh',
      color: 'orange'
    },
    {
      name: 'Instacart',
      logo: '🥕',
      baseUrl: 'https://www.instacart.com',
      searchUrl: 'https://www.instacart.com/store/search?k={query}',
      color: 'green'
    },
    {
      name: 'Walmart Grocery',
      logo: '🏪',
      baseUrl: 'https://www.walmart.com',
      searchUrl: 'https://www.walmart.com/search?q={query}',
      color: 'blue'
    },
    {
      name: 'Target',
      logo: '🎯',
      baseUrl: 'https://www.target.com',
      searchUrl: 'https://www.target.com/s?searchTerm={query}',
      color: 'red'
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
        
        const allProducts = data || [];
        setProducts(allProducts);
        
        // Filter low stock items (quantity <= 2)
        const lowStock = allProducts.filter(product => product.quantity <= 2);
        setLowStockItems(lowStock);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [user]);

  const openStore = (store: Store, query?: string) => {
    if (query) {
      const url = store.searchUrl.replace('{query}', encodeURIComponent(query));
      window.open(url, '_blank');
    } else {
      window.open(store.baseUrl, '_blank');
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.categories?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const suggestedItems = [
    'Fresh vegetables', 'Fruits', 'Dairy products', 'Bread', 'Eggs',
    'Chicken', 'Rice', 'Pasta', 'Cooking oil', 'Spices'
  ];

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-8 h-8" />
            Online Shopping
          </h1>
          <p className="text-gray-600">Order groceries from your favorite stores</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search for products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Store Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Choose Your Store
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stores.map((store) => (
              <Button
                key={store.name}
                variant="outline"
                className="h-auto p-4 flex flex-col items-center gap-2 hover:shadow-lg transition-shadow"
                onClick={() => openStore(store, searchTerm)}
              >
                <div className="text-2xl">{store.logo}</div>
                <div className="text-sm font-medium text-center">{store.name}</div>
                {searchTerm && (
                  <div className="text-xs text-gray-600">
                    Search: "{searchTerm}"
                  </div>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Clock className="w-5 h-5" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {lowStockItems.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-gray-600">
                      Only {product.quantity} {product.quantity_type} left
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {stores.slice(0, 2).map((store) => (
                      <Button
                        key={store.name}
                        size="sm"
                        variant="outline"
                        onClick={() => openStore(store, product.name)}
                        className="text-xs"
                      >
                        {store.logo}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Shopping Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            Quick Shopping Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-5">
            {suggestedItems.map((item) => (
              <Button
                key={item}
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => openStore(stores[0], item)}
              >
                <Package className="w-4 h-4 mr-2" />
                {item}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Your Pantry Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Reorder from Your Pantry
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProducts.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.slice(0, 9).map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-gray-600">
                      {product.quantity} {product.quantity_type}
                    </div>
                    {product.categories && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {product.categories.name}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {stores.slice(0, 2).map((store) => (
                      <Button
                        key={store.name}
                        size="sm"
                        variant="outline"
                        onClick={() => openStore(store, product.name)}
                        className="text-xs"
                        title={`Order from ${store.name}`}
                      >
                        {store.logo}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="mx-auto w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600">Add some products to your pantry or try a different search.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}