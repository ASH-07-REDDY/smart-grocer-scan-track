
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Product {
  id: string;
  name: string;
  category_id: string;
  quantity: number;
  quantity_type: string;
  amount: number;
  categories?: { name: string };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

export function AnalyticsView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchProducts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('grocery_items')
        .select(`
          *,
          categories (name)
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching products:', error);
      } else {
        setProducts(data || []);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [user]);

  // Prepare data for charts
  const categoryData = products.reduce((acc, product) => {
    const categoryName = product.categories?.name || 'Unknown';
    if (!acc[categoryName]) {
      acc[categoryName] = {
        name: categoryName,
        quantity: 0,
        value: 0,
        count: 0,
      };
    }
    acc[categoryName].quantity += product.quantity;
    acc[categoryName].value += product.amount * product.quantity;
    acc[categoryName].count += 1;
    return acc;
  }, {} as Record<string, any>);

  const categoryChartData = Object.values(categoryData);

  // Top products by quantity
  const topProductsByQuantity = [...products]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10)
    .map(product => ({
      name: product.name,
      quantity: product.quantity,
      unit: product.quantity_type,
      value: product.amount * product.quantity,
    }));

  // Top products by value
  const topProductsByValue = [...products]
    .sort((a, b) => (b.amount * b.quantity) - (a.amount * a.quantity))
    .slice(0, 10)
    .map(product => ({
      name: product.name,
      quantity: product.quantity,
      unit: product.quantity_type,
      value: product.amount * product.quantity,
    }));

  // Quantity type distribution
  const quantityTypeData = products.reduce((acc, product) => {
    const type = product.quantity_type || 'pieces';
    if (!acc[type]) {
      acc[type] = {
        name: type,
        count: 0,
        totalQuantity: 0,
      };
    }
    acc[type].count += 1;
    acc[type].totalQuantity += product.quantity;
    return acc;
  }, {} as Record<string, any>);

  const quantityTypeChartData = Object.values(quantityTypeData);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600">Insights into your pantry inventory</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{products.reduce((sum, p) => sum + (p.amount * p.quantity), 0).toLocaleString('en-IN')}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(categoryData).length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {products.reduce((sum, p) => sum + p.quantity, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution by Quantity */}
        <Card>
          <CardHeader>
            <CardTitle>Products by Category (Quantity)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quantity" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution by Value */}
        <Card>
          <CardHeader>
            <CardTitle>Value Distribution by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ₹${value.toLocaleString('en-IN')}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Value']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products by Quantity */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products by Quantity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProductsByQuantity} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip formatter={(value, name) => [
                  name === 'quantity' ? `${value} units` : `₹${value.toLocaleString('en-IN')}`,
                  name === 'quantity' ? 'Quantity' : 'Value'
                ]} />
                <Bar dataKey="quantity" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Quantity Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Quantity Types Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={quantityTypeChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, count }) => `${name}: ${count} items`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {quantityTypeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Products by Value Table */}
      <Card>
        <CardHeader>
          <CardTitle>Most Valuable Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topProductsByValue.slice(0, 5).map((product, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium">{product.name}</h4>
                  <p className="text-sm text-gray-600">
                    {product.quantity} {product.unit}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-semibold">₹{product.value.toLocaleString('en-IN')}</div>
                  <div className="text-sm text-gray-600">Total Value</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
