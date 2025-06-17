
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scale, BarChart3, Smartphone } from "lucide-react";
import { BarcodeWeightDisplay } from "./BarcodeWeightDisplay";

export function WeightMonitor() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Weight Monitor</h1>
        <p className="text-gray-600">Monitor real-time weight data from your ESP32 scale</p>
      </div>

      <Tabs defaultValue="barcode-monitor" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="barcode-monitor" className="flex items-center gap-2">
            <Scale className="w-4 h-4" />
            Barcode Monitor
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="device-status" className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Device Status
          </TabsTrigger>
        </TabsList>

        <TabsContent value="barcode-monitor" className="space-y-4">
          <BarcodeWeightDisplay />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weight Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Analytics dashboard coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="device-status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ESP32 Device Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-lg font-semibold text-green-600">Online</div>
                  <div className="text-sm text-green-600">Connection Status</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-lg font-semibold text-blue-600">ESP32_SCALE_001</div>
                  <div className="text-sm text-blue-600">Device ID</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-lg font-semibold text-purple-600">85%</div>
                  <div className="text-sm text-purple-600">Battery Level</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
