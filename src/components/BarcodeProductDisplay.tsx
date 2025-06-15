import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWeightData } from "@/hooks/useWeightData";
import { Loader2, Package, Search, Scale, Calendar as CalendarIcon, History } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function BarcodeProductDisplay() {
  const [barcode, setBarcode] = useState("");
  const [productData, setProductData] = useState<any>(null);
  const [expiryDate, setExpiryDate] = useState<Date>();
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [simulatedWeight, setSimulatedWeight] = useState("");
  const { 
    getProductWithWeight, 
    saveExpiryDate, 
    getWeightHistory, 
    simulateWeightReading, 
    isLoading, 
    error 
  } = useWeightData();

  const handleSearch = async () => {
    if (!barcode.trim()) return;
    
    const data = await getProductWithWeight(barcode.trim());
    setProductData(data);
    
    if (data) {
      const history = await getWeightHistory(barcode.trim());
      setWeightHistory(history);
      
      if (data.user_expiry_date) {
        setExpiryDate(new Date(data.user_expiry_date));
      }
    }
  };

  const handleSaveExpiryDate = async () => {
    if (!barcode.trim() || !expiryDate) return;
    
    const success = await saveExpiryDate(barcode.trim(), format(expiryDate, 'yyyy-MM-dd'));
    if (success && productData) {
      setProductData({
        ...productData,
        user_expiry_date: format(expiryDate, 'yyyy-MM-dd')
      });
    }
  };

  const handleSimulateWeight = async () => {
    if (!barcode.trim() || !simulatedWeight) return;
    
    const weight = parseFloat(simulatedWeight);
    if (isNaN(weight)) return;
    
    const success = await simulateWeightReading(barcode.trim(), weight);
    if (success) {
      setSimulatedWeight("");
      // Refresh data to show updated weight
      handleSearch();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatWeight = (weight: number, unit: string) => {
    if (weight >= 1000 && unit === 'grams') {
      return `${(weight / 1000).toFixed(2)} kg`;
    }
    return `${weight} ${unit}`;
  };

  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  };

  const isExpired = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    return expiry < today;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Smart Barcode Product Lookup
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

          {/* Weight Simulator */}
          {productData && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium mb-2 text-blue-800">ESP32 Weight Simulator</h4>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Weight in grams"
                  value={simulatedWeight}
                  onChange={(e) => setSimulatedWeight(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSimulateWeight} size="sm">
                  <Scale className="w-4 h-4 mr-2" />
                  Update Weight
                </Button>
              </div>
            </div>
          )}
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
              Product Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Info */}
              <div className="space-y-4">
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

                {productData.default_expiry_days && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium">Default Expiry: </span>
                    <span>{productData.default_expiry_days} days</span>
                  </div>
                )}
              </div>

              {/* Weight & Expiry Info */}
              <div className="space-y-4">
                {/* Current Weight */}
                <div className="p-4 bg-white rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Scale className="w-5 h-5 text-blue-600" />
                    <h4 className="font-medium">Current Weight</h4>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatWeight(productData.current_weight || 0, productData.weight_unit || 'grams')}
                  </div>
                  {productData.last_weight_update && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Last updated: {new Date(productData.last_weight_update).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Expiry Date Setting */}
                <div className="p-4 bg-white rounded-lg border">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarIcon className="w-5 h-5 text-orange-600" />
                    <h4 className="font-medium">Expiry Date</h4>
                  </div>
                  
                  <div className="space-y-3">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !expiryDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {expiryDate ? format(expiryDate, "PPP") : <span>Pick expiry date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={expiryDate}
                          onSelect={setExpiryDate}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <Button 
                      onClick={handleSaveExpiryDate} 
                      disabled={!expiryDate}
                      className="w-full"
                      size="sm"
                    >
                      Save Expiry Date
                    </Button>

                    {productData.user_expiry_date && (
                      <div className="mt-2">
                        <Badge 
                          variant={
                            isExpired(productData.user_expiry_date) ? "destructive" : 
                            isExpiringSoon(productData.user_expiry_date) ? "secondary" : "outline"
                          }
                        >
                          {isExpired(productData.user_expiry_date) ? "Expired" : 
                           isExpiringSoon(productData.user_expiry_date) ? "Expires Soon" : "Fresh"}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          Expires: {new Date(productData.user_expiry_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Weight History */}
            {weightHistory.length > 0 && (
              <div className="p-4 bg-white rounded-lg border">
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-5 h-5 text-purple-600" />
                  <h4 className="font-medium">Weight History</h4>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {weightHistory.map((reading) => (
                    <div key={reading.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                      <span>{formatWeight(reading.weight_value, reading.weight_unit)}</span>
                      <span className="text-muted-foreground">
                        {new Date(reading.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
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