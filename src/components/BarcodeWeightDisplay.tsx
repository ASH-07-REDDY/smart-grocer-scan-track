
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWeightData } from '@/hooks/useWeightData';
import { Scale, Clock, Wifi } from 'lucide-react';

export function BarcodeWeightDisplay() {
  const [inputBarcode, setInputBarcode] = useState('');
  const [currentBarcode, setCurrentBarcode] = useState('');
  const [productData, setProductData] = useState<any>(null);
  const [weightHistory, setWeightHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { getProductWithWeight, getWeightHistory } = useWeightData();

  const handleBarcodeSubmit = async () => {
    if (!inputBarcode.trim()) return;
    
    setLoading(true);
    setCurrentBarcode(inputBarcode.trim());
    
    try {
      // Get product data with current weight
      const product = await getProductWithWeight(inputBarcode.trim());
      setProductData(product);
      
      // Get weight history
      const history = await getWeightHistory(inputBarcode.trim(), 10);
      setWeightHistory(history);
    } catch (error) {
      console.error('Error fetching barcode data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Real-time weight updates
  useEffect(() => {
    if (!currentBarcode) return;

    const interval = setInterval(async () => {
      try {
        const product = await getProductWithWeight(currentBarcode);
        setProductData(product);
        
        const history = await getWeightHistory(currentBarcode, 10);
        setWeightHistory(history);
      } catch (error) {
        console.error('Error updating weight data:', error);
      }
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, [currentBarcode, getProductWithWeight, getWeightHistory]);

  const formatWeight = (weight: number, unit: string) => {
    if (weight < 1000) {
      return `${weight.toFixed(1)} ${unit}`;
    } else {
      return `${(weight / 1000).toFixed(2)} kg`;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Barcode Weight Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Enter barcode (8-13 digits)"
              value={inputBarcode}
              onChange={(e) => setInputBarcode(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleBarcodeSubmit()}
            />
            <Button onClick={handleBarcodeSubmit} disabled={loading}>
              {loading ? 'Loading...' : 'Monitor'}
            </Button>
          </div>

          {currentBarcode && (
            <div className="text-sm text-gray-600 mb-4">
              Monitoring barcode: <code className="bg-gray-100 px-2 py-1 rounded">{currentBarcode}</code>
            </div>
          )}
        </CardContent>
      </Card>

      {productData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div>
                {productData.product_name || 'Unknown Product'}
                {productData.brand && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    by {productData.brand}
                  </span>
                )}
              </div>
              <Badge variant="outline">
                {productData.category || 'Uncategorized'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {formatWeight(productData.current_weight || 0, productData.weight_unit || 'grams')}
                </div>
                <div className="text-sm text-blue-600">Current Weight</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-lg font-semibold text-green-600">
                  {productData.barcode}
                </div>
                <div className="text-sm text-green-600">Barcode</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-sm font-semibold text-purple-600">
                  {productData.last_weight_update ? 
                    formatTime(productData.last_weight_update) : 
                    'No data'
                  }
                </div>
                <div className="text-sm text-purple-600">Last Updated</div>
              </div>
            </div>

            {productData.user_expiry_date && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <div className="text-sm">
                  <strong>Expiry Date:</strong> {new Date(productData.user_expiry_date).toLocaleDateString()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {weightHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Weight History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {weightHistory.map((reading, index) => (
                <div 
                  key={reading.id} 
                  className={`flex justify-between items-center p-3 rounded-lg border ${
                    index === 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                  }`}
                >
                  <div>
                    <div className="font-semibold">
                      {formatWeight(reading.weight_value, reading.weight_unit)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatTime(reading.timestamp)}
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Wifi className="w-3 h-3" />
                      {reading.signal_strength ? `${reading.signal_strength} dBm` : 'N/A'}
                    </div>
                    <div>Sensor: {reading.sensor_id}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {currentBarcode && !productData && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-gray-500">
              No product found for barcode: {currentBarcode}
            </div>
            <div className="text-sm text-gray-400 mt-2">
              Make sure the barcode exists in the system or try a different one.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
