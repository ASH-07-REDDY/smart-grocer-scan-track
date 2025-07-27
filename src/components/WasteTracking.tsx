import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { AlertTriangle, Calendar, Package, DollarSign, TrendingDown, BarChart3, Trash2, ShoppingCart } from 'lucide-react';
import { format, subDays, isWithinInterval } from 'date-fns';

interface Product {
  id: string;
  name: string;
  quantity: number;
  quantity_type: string;
  amount: number;
  expiry_date: string;
  categories?: { name: string };
}

interface WasteEntry {
  id: string;
  product_id: string;
  product_name: string;
  quantity_wasted: number;
  waste_reason: string;
  waste_date: string;
  estimated_value: number;
  created_at: string;
}

const wasteReasons = [
  'Expired',
  'Spoiled',
  'Moldy',
  'Bad smell',
  'Overripe',
  'Accidentally damaged',
  'Cooked too much',
  'Other'
];

export function WasteTracking() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [wasteEntries, setWasteEntries] = useState<WasteEntry[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [wasteQuantity, setWasteQuantity] = useState<number>(1);
  const [wasteReason, setWasteReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expiringItems, setExpiringItems] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'quarter'>('month');

  useEffect(() => {
    fetchProducts();
    fetchWasteEntries();
    fetchExpiringItems();
  }, [user]);

  const fetchExpiringItems = async () => {
    if (!user) return;

    try {
      const today = new Date();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(today.getDate() + 7);

      const { data, error } = await supabase
        .from('grocery_items')
        .select(`
          *,
          categories (name)
        `)
        .eq('user_id', user.id)
        .gt('quantity', 0)
        .gte('expiry_date', today.toISOString().split('T')[0])
        .lte('expiry_date', sevenDaysFromNow.toISOString().split('T')[0]);

      if (error) throw error;
      setExpiringItems(data || []);
    } catch (error) {
      console.error('Error fetching expiring items:', error);
    }
  };

  const removeExpiringItem = async (itemId: string) => {
    try {
      setExpiringItems(prev => prev.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error removing expiring item:', error);
    }
  };

  const buyOnline = (productName: string) => {
    // You can customize these URLs based on your region
    const stores = [
      { name: 'Amazon Fresh', url: `https://www.amazon.com/s?k=${encodeURIComponent(productName)}&i=amazonfresh` },
      { name: 'Instacart', url: `https://www.instacart.com/store/search?k=${encodeURIComponent(productName)}` },
      { name: 'Walmart Grocery', url: `https://www.walmart.com/search?q=${encodeURIComponent(productName)}` }
    ];
    
    const randomStore = stores[Math.floor(Math.random() * stores.length)];
    window.open(randomStore.url, '_blank');
  };

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
    }
  };

  const fetchWasteEntries = async () => {
    if (!user) return;

    try {
      // Use localStorage for waste entries since table types aren't updated yet
      const stored = localStorage.getItem(`waste_items_${user.id}`);
      if (stored) {
        const wasteData = JSON.parse(stored);
        const transformedEntries = wasteData.map((item: any) => ({
          id: item.id,
          product_id: item.product_id || '',
          product_name: item.product_name,
          quantity_wasted: item.quantity || 1,
          waste_reason: item.waste_reason,
          waste_date: item.waste_date,
          estimated_value: item.amount || 0,
          created_at: item.created_at || new Date().toISOString()
        }));
        setWasteEntries(transformedEntries);
      }
    } catch (error) {
      console.error('Error fetching waste entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsWaste = async () => {
    if (!selectedProduct || !wasteReason || wasteQuantity <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    try {
      // Create waste entry
      const wasteEntry: WasteEntry = {
        id: crypto.randomUUID(),
        product_id: product.id,
        product_name: product.name,
        quantity_wasted: wasteQuantity,
        waste_reason: wasteReason,
        waste_date: new Date().toISOString().split('T')[0],
        estimated_value: (product.amount / product.quantity) * wasteQuantity,
        created_at: new Date().toISOString()
      };

      // Store in localStorage for demo (in real app, would use Supabase)
      const currentEntries = [...wasteEntries, wasteEntry];
      setWasteEntries(currentEntries);
      localStorage.setItem(`waste_entries_${user.id}`, JSON.stringify(currentEntries));

      // Update product quantity
      const newQuantity = Math.max(0, product.quantity - wasteQuantity);
      await supabase
        .from('grocery_items')
        .update({ quantity: newQuantity })
        .eq('id', product.id);

      // Reset form
      setSelectedProduct('');
      setWasteQuantity(1);
      setWasteReason('');
      setNotes('');
      setIsDialogOpen(false);

      // Refresh data
      fetchProducts();
      toast.success('Waste entry recorded successfully');
    } catch (error) {
      console.error('Error recording waste:', error);
      toast.error('Failed to record waste');
    }
  };

  const getFilteredWasteEntries = () => {
    const now = new Date();
    let startDate: Date;

    switch (timeFilter) {
      case 'week':
        startDate = subDays(now, 7);
        break;
      case 'month':
        startDate = subDays(now, 30);
        break;
      case 'quarter':
        startDate = subDays(now, 90);
        break;
    }

    return wasteEntries.filter(entry =>
      isWithinInterval(new Date(entry.waste_date), { start: startDate, end: now })
    );
  };

  const filteredEntries = getFilteredWasteEntries();
  const totalWasteValue = filteredEntries.reduce((sum, entry) => sum + entry.estimated_value, 0);
  const totalWasteItems = filteredEntries.length;

  const wasteByReason = filteredEntries.reduce((acc, entry) => {
    acc[entry.waste_reason] = (acc[entry.waste_reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const expiringSoon = products.filter(product => {
    if (!product.expiry_date) return false;
    const expiryDate = new Date(product.expiry_date);
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    return expiryDate <= threeDaysFromNow;
  });

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Trash2 className="w-8 h-8" />
            Waste Tracking
          </h1>
          <p className="text-gray-600">Track and reduce food waste in your pantry</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Trash2 className="w-4 h-4 mr-2" />
              Mark as Waste
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Food Waste</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Product</label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.quantity} {product.quantity_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Quantity Wasted</label>
                <input
                  type="number"
                  min="1"
                  value={wasteQuantity}
                  onChange={(e) => setWasteQuantity(Number(e.target.value))}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Reason</label>
                <Select value={wasteReason} onValueChange={setWasteReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {wasteReasons.map(reason => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                />
              </div>
              
              <Button onClick={handleMarkAsWaste} className="w-full">
                Record Waste
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Time Filter */}
      <div className="flex gap-2">
        {(['week', 'month', 'quarter'] as const).map(period => (
          <Button
            key={period}
            variant={timeFilter === period ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeFilter(period)}
          >
            Last {period}
          </Button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Waste Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₹{totalWasteValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Last {timeFilter}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Wasted</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalWasteItems}</div>
            <p className="text-xs text-muted-foreground">
              Last {timeFilter}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{expiringSoon.length}</div>
            <p className="text-xs text-muted-foreground">
              Next 3 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Items Expiring Soon */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expiringItems.length > 0 ? (
                expiringItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-gray-600">
                        Expires: {new Date(item.expiry_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => buyOnline(item.name)}
                        className="text-xs"
                      >
                        <ShoppingCart className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeExpiringItem(item.id)}
                        className="text-xs"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-600">No items expiring soon</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Monthly Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Items Wasted</span>
                <span className="font-semibold">{totalWasteItems}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Estimated Value Lost</span>
                <span className="font-semibold text-red-600">
                  ₹{totalWasteValue.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Waste by Reason */}
      <Card>
        <CardHeader>
          <CardTitle>Waste by Reason</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(wasteByReason).map(([reason, count]) => (
              <div key={reason} className="flex items-center justify-between">
                <span className="text-sm">{reason}</span>
                <Badge variant="secondary">{count} items</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Waste Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Waste Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEntries.slice(0, 10).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{entry.product_name}</div>
                  <div className="text-sm text-gray-600">
                    {entry.quantity_wasted} units • {entry.waste_reason}
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(new Date(entry.waste_date), 'MMM dd, yyyy')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-red-600">₹{entry.estimated_value.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {expiringSoon.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Items Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiringSoon.map((product) => (
                <div key={product.id} className="flex items-center justify-between">
                  <span className="text-sm">{product.name}</span>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      Expires: {format(new Date(product.expiry_date), 'MMM dd')}
                    </div>
                    <div className="text-xs text-gray-600">
                      {product.quantity} {product.quantity_type}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}