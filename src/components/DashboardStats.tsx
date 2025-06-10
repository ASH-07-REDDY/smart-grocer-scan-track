
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, DollarSign, Calendar } from "lucide-react";

interface Product {
  id: number;
  name: string;
  category: string;
  quantity: number;
  expiryDate: string;
  amount: string;
  image: string;
  barcode: string;
}

interface DashboardStatsProps {
  products: Product[];
}

export function DashboardStats({ products }: DashboardStatsProps) {
  const totalProducts = products.length;
  
  const totalQuantity = products.reduce((sum, product) => sum + product.quantity, 0);
  
  const expiringProducts = products.filter(product => {
    const expiryDate = new Date(product.expiryDate);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3 && diffDays >= 0;
  }).length;

  const totalValue = products.reduce((sum, product) => {
    const price = parseFloat(product.amount.replace('$', '')) || 0;
    return sum + (price * product.quantity);
  }, 0);

  const stats = [
    {
      title: "Total Products",
      value: totalProducts,
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Total Items",
      value: totalQuantity,
      icon: Package,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Expiring Soon",
      value: expiringProducts,
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Total Value",
      value: `$${totalValue.toFixed(2)}`,
      icon: DollarSign,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="border-0 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
