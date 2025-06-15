import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface WeightReading {
  id: string;
  sensor_id: string;
  weight_value: number;
  unit: string;
  timestamp: string;
  battery_level: number | null;
  signal_strength: number | null;
  temperature: number | null;
  product_id: string | null;
  grocery_items?: {
    name: string;
    barcode: string;
    categories?: { name: string };
  };
}

export function WeightMonitor() {
  const [weightReadings, setWeightReadings] = useState<WeightReading[]>([]);
  const [currentWeight, setCurrentWeight] = useState<WeightReading | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    fetchLatestReadings();
    subscribeToWeightUpdates();
  }, [user]);

  const fetchLatestReadings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('weights')
      .select(`
        *,
        grocery_items (
          name,
          barcode,
          categories (name)
        )
      `)
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching weight readings:', error);
    } else {
      setWeightReadings(data || []);
      if (data && data.length > 0) {
        setCurrentWeight(data[0]);
      }
    }
    setLoading(false);
  };

  const subscribeToWeightUpdates = () => {
    if (!user) return;

    const channel = supabase
      .channel('weight_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'weights',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New weight reading:', payload);
          const newReading = payload.new as WeightReading;
          setCurrentWeight(newReading);
          setWeightReadings(prev => [newReading, ...prev.slice(0, 9)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const formatWeight = (weight: number, unit: string) => {
    if (unit === 'grams' && weight >= 1000) {
      return `${(weight / 1000).toFixed(2)} kg`;
    }
    return `${weight.toFixed(1)} ${unit}`;
  };

  const getSignalIcon = (strength: number | null) => {
    if (!strength) return "📶";
    if (strength > -50) return "📶";
    if (strength > -70) return "📶";
    return "📶";
  };

  const getBatteryIcon = (level: number | null) => {
    if (!level) return "🔋";
    if (level > 75) return "🔋";
    if (level > 50) return "🔋";
    if (level > 25) return "🪫";
    return "🪫";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading weight monitor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Weight Monitor</h2>
        <Badge variant="outline">
          {weightReadings.length} readings
        </Badge>
      </div>

      {/* Current Weight Display */}
      {currentWeight && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Current Weight</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {getSignalIcon(currentWeight.signal_strength)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {getBatteryIcon(currentWeight.battery_level)}
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">
                  {formatWeight(currentWeight.weight_value, currentWeight.unit)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Sensor: {currentWeight.sensor_id}
                </div>
              </div>
              
              {currentWeight.grocery_items && (
                <div className="text-center p-3 bg-secondary/20 rounded-lg">
                  <div className="font-semibold">
                    {currentWeight.grocery_items.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {currentWeight.grocery_items.barcode} • {currentWeight.grocery_items.categories?.name}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Battery:</span>
                  <span className="ml-2">{currentWeight.battery_level || 'N/A'}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Signal:</span>
                  <span className="ml-2">{currentWeight.signal_strength || 'N/A'} dBm</span>
                </div>
                {currentWeight.temperature && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Temperature:</span>
                    <span className="ml-2">{currentWeight.temperature}°C</span>
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground text-center">
                Last updated: {new Date(currentWeight.timestamp).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Readings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Readings</CardTitle>
        </CardHeader>
        <CardContent>
          {weightReadings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No weight readings found. Make sure your ESP32 sensor is connected and sending data.
            </div>
          ) : (
            <div className="space-y-3">
              {weightReadings.map((reading, index) => (
                <div key={reading.id}>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/10">
                    <div className="flex-1">
                      <div className="font-medium">
                        {formatWeight(reading.weight_value, reading.unit)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {reading.grocery_items?.name || 'Unknown product'} • {reading.sensor_id}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">
                        {new Date(reading.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(reading.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  {index < weightReadings.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}