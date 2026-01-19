
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
  Line,
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar,
  Legend
} from "recharts";
import { Package, TrendingUp, AlertTriangle, DollarSign, Calendar, Users } from "lucide-react";
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
    image?: string;
  }>;
  totalStats: {
    totalItems: number;
    totalValue: number;
    expiringSoon: number;
    averageValue: number;
    totalCategories: number;
    monthlyTrend: number;
  };
  monthlyData: Array<{
    month: string;
    items: number;
    value: number;
  }>;
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

    // Set up real-time subscription for automatic updates
    const channel = supabase
      .channel('analytics_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'grocery_items',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('Analytics data changed, refreshing...');
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const processAnalyticsData = (products: any[]): ProductAnalytics => {
    // Filter out expired products
    const activeProducts = products.filter(product => {
      if (!product.expiry_date) return true;
      
      const expiryDate = new Date(product.expiry_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return expiryDate >= today;
    });

    const categoryMap = new Map();
    const today = new Date();
    let expiringSoon = 0;

    // Process by category
    activeProducts.forEach(product => {
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

    // Create expiry timeline with better visualization
    const expiryData = [
      { timeRange: 'Expired', count: 0, value: 0 },
      { timeRange: '1-3 Days', count: 0, value: 0 },
      { timeRange: '4-7 Days', count: 0, value: 0 },
      { timeRange: '1-2 Weeks', count: 0, value: 0 },
      { timeRange: '2+ Weeks', count: 0, value: 0 }
    ];

    // Include all products for expiry analysis to show expired items in timeline
    products.forEach(product => {
      if (!product.expiry_date) return;
      
      const expiryDate = new Date(product.expiry_date);
      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let rangeIndex = 4;
      if (diffDays < 0) rangeIndex = 0;
      else if (diffDays <= 3) rangeIndex = 1;
      else if (diffDays <= 7) rangeIndex = 2;
      else if (diffDays <= 14) rangeIndex = 3;

      expiryData[rangeIndex].count += 1;
      expiryData[rangeIndex].value += product.amount || 0;
    });

    // Enhanced top products with better data (only active products)
    const topProducts = activeProducts
      .sort((a, b) => (b.amount || 0) - (a.amount || 0))
      .slice(0, 10)
      .map(product => ({
        name: product.name.length > 15 ? product.name.substring(0, 15) + '...' : product.name,
        category: product.categories?.name || 'Uncategorized',
        quantity: product.quantity || 0,
        amount: product.amount || 0,
        frequency: 1,
        image: product.image_url
      }));

    // Monthly trend simulation (in real app, you'd have historical data)
    const monthlyData = [
      { month: 'Jan', items: Math.floor(activeProducts.length * 0.7), value: activeProducts.reduce((sum, p) => sum + (p.amount || 0), 0) * 0.7 },
      { month: 'Feb', items: Math.floor(activeProducts.length * 0.8), value: activeProducts.reduce((sum, p) => sum + (p.amount || 0), 0) * 0.8 },
      { month: 'Mar', items: Math.floor(activeProducts.length * 0.9), value: activeProducts.reduce((sum, p) => sum + (p.amount || 0), 0) * 0.9 },
      { month: 'Apr', items: activeProducts.length, value: activeProducts.reduce((sum, p) => sum + (p.amount || 0), 0) }
    ];

    const totalStats = {
      totalItems: activeProducts.length,
      totalValue: activeProducts.reduce((sum, p) => sum + (p.amount || 0), 0),
      expiringSoon,
      averageValue: activeProducts.length > 0 ? 
        activeProducts.reduce((sum, p) => sum + (p.amount || 0), 0) / activeProducts.length : 0,
      totalCategories: categoryData.length,
      monthlyTrend: 15.2 // Simulated trend percentage
    };

    return {
      categoryData,
      expiryData,
      topProducts,
      totalStats,
      monthlyData
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2 text-lg">Loading analytics...</span>
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

  const { categoryData, expiryData, topProducts, totalStats, monthlyData } = analytics;

  return (
    <div className="space-y-6">
      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-500" />
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalStats.totalItems}</div>
            <p className="text-xs text-gray-500 mt-1">Products in inventory</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{totalStats.totalValue.toFixed(0)}</div>
            <p className="text-xs text-gray-500 mt-1">Inventory worth</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalStats.expiringSoon}</div>
            <p className="text-xs text-gray-500 mt-1">Within 7 days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              Avg. Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">₹{totalStats.averageValue.toFixed(0)}</div>
            <p className="text-xs text-gray-500 mt-1">Per item</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{totalStats.totalCategories}</div>
            <p className="text-xs text-gray-500 mt-1">Product types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-pink-500" />
              Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">+{totalStats.monthlyTrend}%</div>
            <p className="text-xs text-gray-500 mt-1">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Charts */}
      <Tabs defaultValue="top-products" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="top-products">Top Products</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="expiry">Expiry Timeline</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="top-products">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Products by Value</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={topProducts} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                    <Tooltip 
                      formatter={(value, name) => [`₹${value}`, 'Value']}
                      labelFormatter={(label) => `Product: ${label}`}
                    />
                    <Bar dataKey="amount" fill="#8884d8" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Products - Quantity Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={topProducts.slice(0, 8)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="quantity"
                      labelLine={false}
                      label={({ name, quantity, percent }) => 
                        `${name}: ${quantity} (${(percent * 100).toFixed(1)}%)`
                      }
                    >
                      {topProducts.slice(0, 8).map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [`${value} units`, 'Quantity']}
                      labelFormatter={(label) => `Product: ${label}`}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #ccc',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      iconType="circle"
                      wrapperStyle={{
                        paddingTop: '20px',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Category Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'count' ? `${value} items` : `₹${value}`,
                      name === 'count' ? 'Items' : 'Total Value'
                    ]}
                  />
                  <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="count" />
                  <Bar yAxisId="right" dataKey="totalValue" fill="#82ca9d" name="totalValue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiry">
          <Card>
            <CardHeader>
              <CardTitle>Expiry Timeline Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={expiryData}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timeRange" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'count' ? `${value} items` : `₹${value}`,
                      name === 'count' ? 'Items' : 'Total Value'
                    ]}
                  />
                  <Area type="monotone" dataKey="count" stackId="1" stroke="#8884d8" fillOpacity={1} fill="url(#colorCount)" />
                  <Area type="monotone" dataKey="value" stackId="2" stroke="#82ca9d" fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
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
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} items`, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Line yAxisId="left" type="monotone" dataKey="items" stroke="#8884d8" strokeWidth={3} dot={{ r: 6 }} />
                  <Line yAxisId="right" type="monotone" dataKey="value" stroke="#82ca9d" strokeWidth={3} dot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
