import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBarcodeData } from "@/hooks/useBarcodeData";
import { useWeightData } from "@/hooks/useWeightData";
import { useExpiryDates } from "@/hooks/useExpiryDates";
import { Loader2, Package, Search, Weight, Calendar as CalendarIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function BarcodeProductDisplay() {
  const [barcode, setBarcode] = useState("");
  const [productData, setProductData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const { lookupBarcode, isLoading, error } = useBarcodeData();
  const { weightData, isLoading: weightLoading, addWeightReading } = useWeightData(barcode);
  const { getExpiryDate, setExpiryDate } = useExpiryDates();

  const handleSearch = async () => {
    if (!barcode.trim()) return;
    
    const data = await lookupBarcode(barcode.trim());
    setProductData(data);
    
    // Load existing expiry date if available
    if (data) {
      const existingDate = await getExpiryDate(barcode.trim());
      if (existingDate) {
        setSelectedDate(new Date(existingDate));
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleExpiryDateSave = async () => {
    if (selectedDate && barcode && productData) {
      await setExpiryDate(barcode, format(selectedDate, 'yyyy-MM-dd'));
    }
  };

  const handleSimulateWeight = async () => {
    if (barcode && productData) {
      // Simulate ESP32 weight reading
      const simulatedWeight = Math.floor(Math.random() * 1000) + 100; // Random weight between 100-1100g
      await addWeightReading(barcode, simulatedWeight, 'ESP32_SENSOR_01', {
        temperature: Math.floor(Math.random() * 10) + 20, // 20-30°C
        battery_level: Math.floor(Math.random() * 40) + 60, // 60-100%
        signal_strength: Math.floor(Math.random() * 20) + 80 // 80-100%
      });
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

            {/* Weight Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Weight className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-purple-800">Current Weight</span>
                </div>
                {weightLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading weight data...</span>
                  </div>
                ) : weightData ? (
                  <div className="space-y-1">
                    <div className="text-lg font-semibold text-purple-800">
                      {weightData.current_weight} {weightData.weight_unit}
                    </div>
                    {weightData.last_weight_update && (
                      <div className="text-xs text-purple-600">
                        Last updated: {format(new Date(weightData.last_weight_update), 'PPp')}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No weight data available</div>
                )}
                <Button 
                  onClick={handleSimulateWeight} 
                  size="sm" 
                  variant="outline" 
                  className="mt-2 text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  Simulate ESP32 Reading
                </Button>
              </div>

              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarIcon className="w-4 h-4 text-orange-600" />
                  <span className="font-medium text-orange-800">Expiry Date</span>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal border-orange-200 hover:bg-orange-50",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Set expiry date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                    <div className="p-3 border-t">
                      <Button 
                        onClick={handleExpiryDateSave} 
                        disabled={!selectedDate}
                        className="w-full"
                        size="sm"
                      >
                        Save Expiry Date
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Recent Weight Readings */}
            {weightData?.recent_readings && weightData.recent_readings.length > 0 && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <span className="font-medium">Recent Weight Readings</span>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {weightData.recent_readings.slice(0, 5).map((reading) => (
                    <div key={reading.id} className="flex justify-between items-center text-sm">
                      <span>{reading.weight_value} {reading.weight_unit}</span>
                      <span className="text-gray-500">
                        {format(new Date(reading.timestamp), 'MMM dd, HH:mm')}
                      </span>
                    </div>
                  ))}
                </div>
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