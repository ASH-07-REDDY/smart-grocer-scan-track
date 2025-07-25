
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, Package, MoreVertical, Edit, Trash2, Sparkles, Check, AlertTriangle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useAutoImageAssignment } from "@/hooks/useAutoImageAssignment";

interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  quantityType?: string;
  expiryDate: string;
  amount: string;
  image: string;
  barcode: string;
}

interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
  onImageUpdate?: (productId: string, imageUrl: string) => void;
  onMarkAsWaste?: (productId: string, reason: string) => void;
}

export function ProductCard({ product, onEdit, onDelete, onImageUpdate, onMarkAsWaste }: ProductCardProps) {
  const { downloadAndAssignImage, downloading } = useAutoImageAssignment();
  const [currentImage, setCurrentImage] = useState(() => {
    // Use existing image or default fallback
    return product.image && product.image !== "/placeholder.svg" 
      ? product.image 
      : `data:image/svg+xml,${encodeURIComponent(`<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" fill="#f3f4f6"/><text x="200" y="200" font-family="Arial" font-size="24" text-anchor="middle" fill="#9ca3af">No Image</text></svg>`)}`;
  });
  const [imageError, setImageError] = useState(false);

  const handleMarkAsWaste = (reason: string) => {
    onMarkAsWaste?.(product.id, reason);
  };

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

  const handleGenerateImage = async () => {
    console.log(`Generating AI image for product: ${product.name}, category: ${product.category}`);
    const imageUrl = await downloadAndAssignImage(product.id, product.name, product.category);
    if (imageUrl) {
      setCurrentImage(imageUrl);
      setImageError(false);
      onImageUpdate?.(product.id, imageUrl);
    }
  };

  const handleImageError = () => {
    if (!imageError) {
      // Use simple SVG fallback if image fails to load
      const svgFallback = `data:image/svg+xml,${encodeURIComponent(`<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" fill="#f3f4f6"/><text x="200" y="220" font-family="Arial" font-size="48" text-anchor="middle" fill="#9ca3af">${product.name.slice(0, 2).toUpperCase()}</text><text x="200" y="260" font-family="Arial" font-size="16" text-anchor="middle" fill="#9ca3af">${product.category}</text></svg>`)}`;
      setCurrentImage(svgFallback);
      setImageError(true);
    }
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-0 shadow-md bg-white">
      <CardContent className="p-4 space-y-3">
        {/* Product Image */}
        <div className="relative">
          <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
            <img 
              src={currentImage} 
              alt={product.name}
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
          </div>
          <div className="absolute top-2 right-2 flex gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleGenerateImage}
              disabled={downloading}
              className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-2"
              title="Generate AI Product Image"
            >
              <Sparkles className={`w-4 h-4 ${downloading ? 'animate-spin text-blue-500' : 'text-purple-500'}`} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onEdit?.(product)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Product
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleMarkAsWaste("expired")}>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Mark as Waste - Expired
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMarkAsWaste("spoiled")}>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Mark as Waste - Spoiled
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMarkAsWaste("damaged")}>
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Mark as Waste - Damaged
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={() => onDelete?.(product.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
              <span>Qty: {product.quantity} {product.quantityType || 'units'}</span>
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
          
          {/* Mark as Used Button */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <Button 
              onClick={() => onDelete?.(product.id)}
              variant="outline"
              size="sm"
              className="w-full text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
            >
              <Check className="w-4 h-4 mr-2" />
              Mark as Used
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
