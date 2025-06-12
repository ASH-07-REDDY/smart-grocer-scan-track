
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import { Package, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ProductAnalytics {
  categoryData: Array<{
    name: string;
    count: number;
    totalValue: number;
    items: Array<{
      name: string;
      quantity: number;
      amount: number;
      expiry_date: string;
    }>;
  }>;
  expiryData: Array<{
    timeRange: string;
    count: number;
    value: number;
  }>;
  topProducts: Array<{
    name: string;
    category: string;
    quantity: number;
    amount: number;
    frequency: number;
  }>;
  totalStats: {
    totalItems: number;
    totalValue: number;
    expiringSoon: number;
    averageValue: number;
  };
}

const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
  '#d084d0', '#ffb347', '#87ceeb', '#dda0dd', '#98fb98'
];

export function EnhancedAnalytics() {
  const [analytics, setAnalytics] = useState<ProductAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      
      try {
        // Fetch products with categories
        const { data: products, error } = await supabase
          .from('grocery_items')
          .select(`
            *,
            categories (name)
          `)
          .eq('user_id', user.id);

        if (error) throw error;

        const processedAnalytics = processAnalyticsData(products || []);
        setAnalytics(processedAnalytics);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  const processAnalyticsData = (products: any[]): ProductAnalytics => {
    const categoryMap = new Map();
    const today = new Date();
    let expiringSoon = 0;

    // Process by category
    products.forEach(product => {
      const categoryName = product.categories?.name || 'Uncategorized';
      
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          name: categoryName,
          count: 0,
          totalValue: 0,
          items: []
        });
      }

      const category = categoryMap.get(categoryName);
      category.count += 1;
      category.totalValue += product.amount || 0;
      category.items.push({
        name: product.name,
        quantity: product.quantity || 0,
        amount: product.amount || 0,
        expiry_date: product.expiry_date
      });

      // Check if expiring soon (within 7 days)
      if (product.expiry_date) {
        const expiryDate = new Date(product.expiry_date);
        const diffTime = expiryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 7 && diffDays >= 0) {
          expiringSoon++;
        }
      }
    });

    const categoryData = Array.from(categoryMap.values());

    // Create expiry timeline
    const expiryData = [
      { timeRange: 'Expired', count: 0, value: 0 },
      { timeRange: '1-3 Days', count: 0, value: 0 },
      { timeRange: '4-7 Days', count: 0, value: 0 },
      { timeRange: '1-2 Weeks', count: 0, value: 0 },
      { timeRange: '2+ Weeks', count: 0, value: 0 }
    ];

    products.forEach(product => {
      if (!product.expiry_date) return;
      
      const expiryDate = new Date(product.expiry_date);
      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let rangeIndex = 4; // default to 2+ weeks
      if (diffDays < 0) rangeIndex = 0; // Expired
      else if (diffDays <= 3) rangeIndex = 1; // 1-3 days
      else if (diffDays <= 7) rangeIndex = 2; // 4-7 days
      else if (diffDays <= 14) rangeIndex = 3; // 1-2 weeks

      expiryData[rangeIndex].count += 1;
      expiryData[rangeIndex].value += product.amount || 0;
    });

    // Create top products (by value)
    const topProducts = products
      .sort((a, b) => (b.amount || 0) - (a.amount || 0))
      .slice(0, 10)
      .map(product => ({
        name: product.name,
        category: product.categories?.name || 'Uncategorized',
        quantity: product.quantity || 0,
        amount: product.amount || 0,
        frequency: 1 // Could be enhanced with historical data
      }));

    const totalStats = {
      totalItems: products.length,
      totalValue: products.reduce((sum, p) => sum + (p.amount || 0), 0),
      expiringSoon,
      averageValue: products.length > 0 ? 
        products.reduce((sum, p) => sum + (p.amount || 0), 0) / products.length : 0
    };

    return {
      categoryData,
      expiryData,
      topProducts,
      totalStats
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No data available for analytics</p>
      </div>
    );
  }

  const { categoryData, expiryData, topProducts, totalStats } = analytics;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="w-4 h-4" />
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.totalItems}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalStats.totalValue.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalStats.expiringSoon}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Avg. Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalStats.averageValue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="categories">By Category</TabsTrigger>
          <TabsTrigger value="expiry">Expiry Timeline</TabsTrigger>
          <TabsTrigger value="top-products">Top Products</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Products by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'count' ? `${value} items` : `₹${value}`,
                      name === 'count' ? 'Items' : 'Total Value'
                    ]}
                  />
                  <Bar dataKey="count" fill="#8884d8" name="count" />
                  <Bar dataKey="totalValue" fill="#82ca9d" name="totalValue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiry">
          <Card>
            <CardHeader>
              <CardTitle>Expiry Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={expiryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timeRange" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'count' ? `${value} items` : `₹${value}`,
                      name === 'count' ? 'Items' : 'Total Value'
                    ]}
                  />
                  <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
                  <Line type="monotone" dataKey="value" stroke="#82ca9d" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top-products">
          <Card>
            <CardHeader>
              <CardTitle>Top Products by Value</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducts} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip 
                    formatter={(value) => [`₹${value}`, 'Value']}
                    labelFormatter={(label) => `Product: ${label}`}
                  />
                  <Bar dataKey="amount" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          <Card>
            <CardHeader>
              <CardTitle>Category Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} items`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
