
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, Package, MoreVertical, Edit, Trash2, Sparkles, Check } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { generatePlaceholderImage, generateSVGPlaceholder } from "@/utils/placeholderImages";

interface Product {
  id: number;
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
  onDelete?: (productId: number) => void;
  onImageUpdate?: (productId: number, imageUrl: string) => void;
}

export function ProductCard({ product, onEdit, onDelete, onImageUpdate }: ProductCardProps) {
  const [currentImage, setCurrentImage] = useState(() => {
    // Use existing image or generate placeholder
    return product.image && product.image !== "/placeholder.svg" 
      ? product.image 
      : generatePlaceholderImage(product.name, product.category);
  });
  const [imageError, setImageError] = useState(false);

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

  const handleGenerateImage = () => {
    console.log(`Generating new placeholder for product: ${product.name}, category: ${product.category}`);
    // Generate a new placeholder image
    const newImageUrl = generatePlaceholderImage(product.name, product.category);
    setCurrentImage(newImageUrl);
    setImageError(false);
    onImageUpdate?.(product.id, newImageUrl);
  };

  const handleImageError = () => {
    if (!imageError) {
      // Use SVG fallback if image fails to load
      const svgFallback = generateSVGPlaceholder(product.name, product.category);
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
              className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm p-2"
              title="Generate New Image"
            >
              <Sparkles className="w-4 h-4 text-purple-500" />
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
