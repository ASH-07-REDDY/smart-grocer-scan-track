import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Plus, Wifi, WifiOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Device {
  id: string;
  device_id: string;
  device_name: string;
  device_token: string | null;
  api_key: string | null;
  is_active: boolean;
  last_seen: string | null;
  created_at: string;
}

export function DeviceManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDevices();
    }
  }, [user]);

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('device_registry')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDevices(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateDeviceToken = (): string => {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const generateDeviceId = (): string => {
    return `scale_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  };

  const addDevice = async () => {
    if (!newDeviceName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a device name",
        variant: "destructive",
      });
      return;
    }

    try {
      const deviceId = generateDeviceId();
      const deviceToken = generateDeviceToken();

      const { error } = await supabase
        .from('device_registry')
        .insert({
          device_id: deviceId,
          device_name: newDeviceName.trim(),
          device_token: deviceToken,
          user_id: user?.id,
          is_active: true,
        });

      if (error) throw error;

      setNewDeviceName('');
      setShowAddForm(false);
      fetchDevices();

      toast({
        title: "Success",
        description: "Device added successfully. Use the device credentials to configure your ESP32.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteDevice = async (deviceId: string) => {
    try {
      const { error } = await supabase
        .from('device_registry')
        .delete()
        .eq('id', deviceId);

      if (error) throw error;

      fetchDevices();
      toast({
        title: "Success",
        description: "Device removed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const toggleDeviceStatus = async (deviceId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('device_registry')
        .update({ is_active: !currentStatus })
        .eq('id', deviceId);

      if (error) throw error;

      fetchDevices();
      toast({
        title: "Success",
        description: `Device ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return 'Never';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  };

  if (loading) {
    return <div>Loading devices...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Device Management</h2>
          <p className="text-muted-foreground">Manage your smart scale devices</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Device
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Device</CardTitle>
            <CardDescription>
              Register a new smart scale device to your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="deviceName">Device Name</Label>
              <Input
                id="deviceName"
                placeholder="e.g., Kitchen Scale"
                value={newDeviceName}
                onChange={(e) => setNewDeviceName(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={addDevice}>Add Device</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
            <Alert>
              <AlertDescription>
                After adding the device, you'll receive credentials to configure your ESP32 smart scale.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {devices.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No devices registered yet.</p>
              <Button 
                onClick={() => setShowAddForm(true)} 
                className="mt-4"
                variant="outline"
              >
                Add Your First Device
              </Button>
            </CardContent>
          </Card>
        ) : (
          devices.map((device) => (
            <Card key={device.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {device.device_name}
                      {device.is_active ? (
                        <Wifi className="h-4 w-4 text-green-500" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-gray-400" />
                      )}
                    </CardTitle>
                    <CardDescription>
                      Device ID: {device.device_id}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={device.is_active ? "default" : "secondary"}>
                      {device.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>Last Seen</Label>
                    <p className="text-muted-foreground">
                      {formatLastSeen(device.last_seen)}
                    </p>
                  </div>
                  <div>
                    <Label>Added</Label>
                    <p className="text-muted-foreground">
                      {new Date(device.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Device Token</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={device.device_token} 
                      readOnly 
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(device.device_token);
                        toast({
                          title: "Copied",
                          description: "Device token copied to clipboard",
                        });
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant={device.is_active ? "secondary" : "default"}
                    size="sm"
                    onClick={() => toggleDeviceStatus(device.id, device.is_active)}
                  >
                    {device.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteDevice(device.id)}
                    className="flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Alert>
        <AlertDescription>
          <strong>Security Note:</strong> Device tokens are used to authenticate your ESP32 devices. 
          Keep them secure and regenerate if compromised. Only share these credentials with your own devices.
        </AlertDescription>
      </Alert>
    </div>
  );
}