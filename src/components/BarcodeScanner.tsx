
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { ScanLine, Camera, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { useBarcodeData } from "@/hooks/useBarcodeData";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBarcodeScanned: (barcode: string, productData?: any) => void;
}

export function BarcodeScanner({ open, onOpenChange, onBarcodeScanned }: BarcodeScannerProps) {
  const [manualBarcode, setManualBarcode] = useState("");
  const [scannedProduct, setScannedProduct] = useState<any>(null);
  const { toast } = useToast();
  
  const { lookupBarcode, isLoading: isLookingUp } = useBarcodeData();

  const handleBarcodeDetected = async (barcode: string) => {
    console.log('Barcode detected:', barcode);
    
    // Look up product data
    const productData = await lookupBarcode(barcode);
    
    if (productData) {
      setScannedProduct(productData);
      toast({
        title: "Product Found!",
        description: `Found ${productData.product_name} by ${productData.brand}`,
      });
    } else {
      toast({
        title: "Product Not Found",
        description: "This barcode is not in our database. You can still add it manually.",
        variant: "default",
      });
    }
    
    // Always call the callback with barcode and optional product data
    onBarcodeScanned(barcode, productData);
  };

  const { isScanning, startScanning, stopScanning, error } = useBarcodeScanner(handleBarcodeDetected);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      await handleBarcodeDetected(manualBarcode.trim());
      setManualBarcode("");
    }
  };

  const handleStartCamera = async () => {
    try {
      await startScanning();
    } catch (err) {
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const handleDialogClose = () => {
    stopScanning();
    setScannedProduct(null);
    setManualBarcode("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="w-5 h-5" />
            Scan Barcode
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {/* Product Information Display */}
          {scannedProduct && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-green-800">{scannedProduct.product_name}</h3>
                    {scannedProduct.brand && (
                      <p className="text-sm text-green-700">Brand: {scannedProduct.brand}</p>
                    )}
                    {scannedProduct.category && (
                      <Badge variant="secondary" className="text-xs">
                        {scannedProduct.category}
                      </Badge>
                    )}
                    <p className="text-xs text-green-600">
                      Default expiry: {scannedProduct.default_expiry_days} days
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <p className="text-sm">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

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
                  <p className="text-xs text-gray-500">Point camera at barcode</p>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: "60%" }}></div>
                  </div>
                  <Button onClick={stopScanning} variant="outline" size="sm">
                    Stop Scanning
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <ScanLine className="w-12 h-12 mx-auto text-gray-400" />
                  <p className="text-sm text-gray-600">Start camera to scan barcode</p>
                  <Button onClick={handleStartCamera} variant="outline" disabled={isLookingUp}>
                    <Camera className="w-4 h-4 mr-2" />
                    {isLookingUp ? "Processing..." : "Start Camera"}
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
                placeholder="Enter barcode number (e.g., 123456789012)"
                disabled={isScanning || isLookingUp}
                pattern="[0-9]{8,13}"
                title="Enter 8-13 digit barcode"
              />
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isScanning || isLookingUp || !manualBarcode.trim()}
              >
                {isLookingUp ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Looking up product...
                  </>
                ) : (
                  "Submit Barcode"
                )}
              </Button>
            </form>
          </div>

          <div className="text-xs text-gray-500 text-center bg-blue-50 p-3 rounded-lg">
            📱 Camera access requires HTTPS and user permission. 
            {scannedProduct ? " Product found in database!" : " Try our sample barcodes: 123456789012, 234567890123"}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
