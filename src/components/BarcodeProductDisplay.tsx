import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBarcodeData } from "@/hooks/useBarcodeData";
import { Loader2, Package, Search } from "lucide-react";

export function BarcodeProductDisplay() {
  const [barcode, setBarcode] = useState("");
  const [productData, setProductData] = useState<any>(null);
  const { lookupBarcode, isLoading, error } = useBarcodeData();

  const handleSearch = async () => {
    if (!barcode.trim()) return;
    
    const data = await lookupBarcode(barcode.trim());
    setProductData(data);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Barcode Product Lookup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter barcode (e.g., 123456789012)"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isLoading || !barcode.trim()}>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            Try these barcodes: 123456789012 (Apple), 234567890123 (Bananas), 345678901234 (Biscuits)
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-600">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {productData && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Package className="w-5 h-5" />
              Product Found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-lg">{productData.product_name}</h3>
                <p className="text-sm text-muted-foreground">Barcode: {productData.barcode}</p>
              </div>
              <div className="space-y-2">
                {productData.brand && (
                  <div>
                    <span className="font-medium">Brand: </span>
                    <span>{productData.brand}</span>
                  </div>
                )}
                {productData.category && (
                  <Badge variant="secondary">{productData.category}</Badge>
                )}
              </div>
            </div>
            
            {productData.default_expiry_days && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <span className="font-medium">Default Expiry: </span>
                <span>{productData.default_expiry_days} days</span>
              </div>
            )}

            {productData.nutrition_info && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">Nutrition Info: </span>
                <pre className="text-sm mt-2 whitespace-pre-wrap">
                  {JSON.stringify(productData.nutrition_info, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!productData && barcode && !isLoading && !error && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-yellow-800">
              No product found for barcode: {barcode}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}