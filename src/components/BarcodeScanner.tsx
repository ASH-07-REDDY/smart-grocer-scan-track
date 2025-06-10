
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { ScanLine, Camera } from "lucide-react";

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBarcodeScanned: (barcode: string) => void;
}

export function BarcodeScanner({ open, onOpenChange, onBarcodeScanned }: BarcodeScannerProps) {
  const [manualBarcode, setManualBarcode] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      onBarcodeScanned(manualBarcode.trim());
      setManualBarcode("");
    }
  };

  const startCamera = () => {
    setIsScanning(true);
    // In a real implementation, you would use libraries like:
    // - @zxing/browser for barcode scanning
    // - react-webcam for camera access
    // - quagga2 for barcode detection
    console.log("Starting camera for barcode scanning...");
    
    // Simulate barcode detection after 3 seconds
    setTimeout(() => {
      const mockBarcode = "123456789012";
      onBarcodeScanned(mockBarcode);
      setIsScanning(false);
    }, 3000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="w-5 h-5" />
            Scan Barcode
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {/* Camera Scanner */}
          <div className="space-y-3">
            <Label>Camera Scanner</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
              {isScanning ? (
                <div className="space-y-3">
                  <div className="animate-pulse">
                    <Camera className="w-12 h-12 mx-auto text-blue-500" />
                  </div>
                  <p className="text-sm text-gray-600">Scanning for barcode...</p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: "60%" }}></div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <ScanLine className="w-12 h-12 mx-auto text-gray-400" />
                  <p className="text-sm text-gray-600">Click to start camera scanner</p>
                  <Button onClick={startCamera} variant="outline">
                    <Camera className="w-4 h-4 mr-2" />
                    Start Camera
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Manual Entry */}
          <div className="space-y-3">
            <Label>Or Enter Manually</Label>
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <Input
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                placeholder="Enter barcode number"
                disabled={isScanning}
              />
              <Button type="submit" className="w-full" disabled={isScanning || !manualBarcode.trim()}>
                Submit Barcode
              </Button>
            </form>
          </div>

          <div className="text-xs text-gray-500 text-center bg-blue-50 p-3 rounded-lg">
            📱 Note: Camera scanning requires additional libraries and permissions in production
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
