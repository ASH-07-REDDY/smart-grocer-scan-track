import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Scale, BarChart3, Smartphone, Play, Pause, RefreshCw, Zap, TrendingDown, TrendingUp } from "lucide-react";
import { BarcodeWeightDisplay } from "./BarcodeWeightDisplay";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface SimulatedProduct {
  id: string;
  name: string;
  barcode: string;
  initialWeight: number;
  currentWeight: number;
  unit: string;
  consumptionRate: number; // grams per hour simulation
}

export function WeightMonitor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedProducts, setSimulatedProducts] = useState<SimulatedProduct[]>([]);
  const [deviceStatus, setDeviceStatus] = useState({
    isOnline: true,
    deviceId: 'ESP32_SCALE_001',
    batteryLevel: 85,
    signalStrength: -45,
    lastSeen: new Date()
  });
  const [weightLogs, setWeightLogs] = useState<Array<{
    timestamp: Date;
    product: string;
    weight: number;
    change: number;
  }>>([]);

  // Generate simulated weight data
  const generateSimulatedProducts = useCallback(async () => {
    if (!user) return;

    try {
      const { data: products } = await supabase
        .from('grocery_items')
        .select('*')
        .eq('user_id', user.id)
        .gt('quantity', 0)
        .limit(5);

      if (products && products.length > 0) {
        const simulated = products.map(p => ({
          id: p.id,
          name: p.name,
          barcode: p.barcode || `SIM${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
          initialWeight: Math.random() * 2000 + 100, // 100-2100 grams
          currentWeight: Math.random() * 2000 + 100,
          unit: 'grams',
          consumptionRate: Math.random() * 10 + 1 // 1-11 grams per update
        }));
        setSimulatedProducts(simulated);
      } else {
        // Create demo products if no real products exist
        setSimulatedProducts([
          { id: '1', name: 'Milk', barcode: 'DEMO001', initialWeight: 1000, currentWeight: 1000, unit: 'ml', consumptionRate: 5 },
          { id: '2', name: 'Rice', barcode: 'DEMO002', initialWeight: 2500, currentWeight: 2500, unit: 'grams', consumptionRate: 8 },
          { id: '3', name: 'Sugar', barcode: 'DEMO003', initialWeight: 500, currentWeight: 500, unit: 'grams', consumptionRate: 2 },
          { id: '4', name: 'Cooking Oil', barcode: 'DEMO004', initialWeight: 1000, currentWeight: 1000, unit: 'ml', consumptionRate: 3 },
        ]);
      }
    } catch (error) {
      console.error('Error fetching products for simulation:', error);
    }
  }, [user]);

  useEffect(() => {
    generateSimulatedProducts();
  }, [generateSimulatedProducts]);

  // Simulate weight changes when enabled
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setSimulatedProducts(prev => {
        const updated = prev.map(product => {
          // Randomly decrease weight (simulating consumption)
          const shouldDecrease = Math.random() > 0.3; // 70% chance of decrease
          const changeAmount = shouldDecrease 
            ? -(Math.random() * product.consumptionRate)
            : Math.random() * (product.consumptionRate / 2); // Small chance of increase (refill)
          
          const newWeight = Math.max(0, product.currentWeight + changeAmount);
          
          // Add to weight logs
          if (Math.abs(changeAmount) > 0.5) {
            setWeightLogs(logs => [{
              timestamp: new Date(),
              product: product.name,
              weight: newWeight,
              change: changeAmount
            }, ...logs.slice(0, 49)]); // Keep last 50 logs
          }
          
          return {
            ...product,
            currentWeight: newWeight
          };
        });
        return updated;
      });

      // Update device status
      setDeviceStatus(prev => ({
        ...prev,
        batteryLevel: Math.max(10, prev.batteryLevel - Math.random() * 0.1),
        signalStrength: -40 - Math.random() * 20,
        lastSeen: new Date()
      }));
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [isSimulating]);

  const toggleSimulation = () => {
    setIsSimulating(!isSimulating);
    toast({
      title: isSimulating ? "Simulation Paused" : "Simulation Started",
      description: isSimulating 
        ? "Weight simulation has been paused" 
        : "Simulating real-time weight changes from ESP32 sensors",
    });
  };

  const resetSimulation = () => {
    generateSimulatedProducts();
    setWeightLogs([]);
    toast({
      title: "Simulation Reset",
      description: "All weights have been reset to initial values",
    });
  };

  const formatWeight = (weight: number, unit: string) => {
    if (weight < 1000) {
      return `${weight.toFixed(1)} ${unit}`;
    }
    return `${(weight / 1000).toFixed(2)} kg`;
  };

  const getWeightPercentage = (current: number, initial: number) => {
    return Math.round((current / initial) * 100);
  };

  const getStatusColor = (percentage: number) => {
    if (percentage > 50) return 'bg-green-500';
    if (percentage > 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Weight Monitor</h1>
          <p className="text-muted-foreground">Monitor real-time weight data from your ESP32 scale</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={isSimulating ? "destructive" : "default"}
            onClick={toggleSimulation}
          >
            {isSimulating ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isSimulating ? "Pause" : "Start"} Simulation
          </Button>
          <Button variant="outline" onClick={resetSimulation}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      <Tabs defaultValue="simulation" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="simulation" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Live Simulation
          </TabsTrigger>
          <TabsTrigger value="barcode-monitor" className="flex items-center gap-2">
            <Scale className="w-4 h-4" />
            Barcode Monitor
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Weight Logs
          </TabsTrigger>
          <TabsTrigger value="device-status" className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Device Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="simulation" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {simulatedProducts.map(product => {
              const percentage = getWeightPercentage(product.currentWeight, product.initialWeight);
              return (
                <Card key={product.id} className="relative overflow-hidden">
                  <div className={`absolute top-0 left-0 right-0 h-1 ${getStatusColor(percentage)}`} />
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center justify-between">
                      {product.name}
                      <Badge variant={isSimulating ? "default" : "secondary"}>
                        {isSimulating ? "Live" : "Paused"}
                      </Badge>
                    </CardTitle>
                    <p className="text-xs text-muted-foreground font-mono">{product.barcode}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">
                        {formatWeight(product.currentWeight, product.unit)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {percentage}% remaining
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 mt-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${getStatusColor(percentage)}`}
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Initial: {formatWeight(product.initialWeight, product.unit)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {simulatedProducts.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Scale className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No products available for simulation</p>
                <p className="text-sm text-muted-foreground mt-2">Add some products to your pantry first</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="barcode-monitor" className="space-y-4">
          <BarcodeWeightDisplay />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Weight Logs</CardTitle>
            </CardHeader>
            <CardContent>
              {weightLogs.length > 0 ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {weightLogs.map((log, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {log.change < 0 ? (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        ) : (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        )}
                        <div>
                          <p className="font-medium">{log.product}</p>
                          <p className="text-xs text-muted-foreground">
                            {log.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono">{log.weight.toFixed(1)}g</p>
                        <p className={`text-xs ${log.change < 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {log.change > 0 ? '+' : ''}{log.change.toFixed(1)}g
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No weight changes recorded yet</p>
                  <p className="text-sm mt-2">Start the simulation to see weight logs</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="device-status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ESP32 Device Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${deviceStatus.isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {deviceStatus.isOnline ? 'Online' : 'Offline'}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">Connection Status</div>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-lg font-semibold text-blue-600 dark:text-blue-400 font-mono">
                    {deviceStatus.deviceId}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">Device ID</div>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                    {Math.round(deviceStatus.batteryLevel)}%
                  </div>
                  <div className="text-sm text-purple-600 dark:text-purple-400">Battery Level</div>
                  <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2 mt-2">
                    <div 
                      className="h-2 rounded-full bg-purple-500 transition-all"
                      style={{ width: `${deviceStatus.batteryLevel}%` }}
                    />
                  </div>
                </div>
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                    {Math.round(deviceStatus.signalStrength)} dBm
                  </div>
                  <div className="text-sm text-orange-600 dark:text-orange-400">Signal Strength</div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  Last seen: {deviceStatus.lastSeen.toLocaleTimeString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sensor Calibration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Load Cell Status</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm text-muted-foreground">Calibrated & Active</span>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Temperature Sensor</h4>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-sm text-muted-foreground">24.5°C - Normal</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
