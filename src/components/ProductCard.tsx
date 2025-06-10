
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, Package, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const isExpiringSoon = () => {
    const expiryDate = new Date(product.expiryDate);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  };

  const isExpired = () => {
    const expiryDate = new Date(product.expiryDate);
    const today = new Date();
    return expiryDate < today;
  };

  const getExpiryBadgeVariant = () => {
    if (isExpired()) return "destructive";
    if (isExpiringSoon()) return "secondary";
    return "outline";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-white">
      <CardContent className="p-4 space-y-3">
        {/* Product Image */}
        <div className="relative">
          <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
            <img 
              src={product.image} 
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/placeholder.svg";
              }}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Edit Product</DropdownMenuItem>
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Product Info */}
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-gray-900 leading-tight">{product.name}</h3>
            <Badge variant="outline" className="text-xs">{product.category}</Badge>
          </div>

          {/* Stats */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Package className="w-4 h-4" />
              <span>Qty: {product.quantity}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <DollarSign className="w-4 h-4" />
              <span>{product.amount}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4" />
              <span>Expires: {formatDate(product.expiryDate)}</span>
              <Badge variant={getExpiryBadgeVariant()} className="ml-auto text-xs">
                {isExpired() ? "Expired" : isExpiringSoon() ? "Soon" : "Fresh"}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
