import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, Check, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";

interface ProductCameraProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageCaptured: (imageUrl: string) => void;
  onProductRecognized?: (productData: { name: string; confidence: number; imageUrl: string }) => void;
  mode: 'capture' | 'recognize';
  title?: string;
}

export function ProductCamera({ 
  open, 
  onOpenChange, 
  onImageCaptured, 
  onProductRecognized,
  mode = 'capture',
  title
}: ProductCameraProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Camera access error:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageUrl);
        stopCamera();
        
        if (mode === 'recognize') {
          recognizeProduct(imageUrl);
        }
      }
    }
  };

  const recognizeProduct = async (imageUrl: string) => {
    setIsRecognizing(true);
    try {
      // Simulate AI product recognition
      // In a real app, you would send the image to an AI service
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock recognition results
      const mockProducts = [
        { name: "Coca Cola", confidence: 0.95 },
        { name: "Apple iPhone", confidence: 0.89 },
        { name: "Banana", confidence: 0.92 },
        { name: "Bread Loaf", confidence: 0.87 },
        { name: "Milk Carton", confidence: 0.94 }
      ];
      
      const randomProduct = mockProducts[Math.floor(Math.random() * mockProducts.length)];
      
      if (onProductRecognized) {
        onProductRecognized({
          ...randomProduct,
          imageUrl
        });
      }
      
      toast({
        title: "Product Recognized!",
        description: `Detected: ${randomProduct.name} (${Math.round(randomProduct.confidence * 100)}% confidence)`,
      });
      
    } catch (error) {
      console.error('Product recognition error:', error);
      toast({
        title: "Recognition Failed",
        description: "Could not identify the product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRecognizing(false);
    }
  };

  const handleConfirm = () => {
    if (capturedImage) {
      onImageCaptured(capturedImage);
      handleClose();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setIsRecognizing(false);
    startCamera();
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setIsRecognizing(false);
    onOpenChange(false);
  };

  const getTitle = () => {
    if (title) return title;
    return mode === 'capture' ? 'Capture Product Image' : 'Recognize Product';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            {getTitle()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Camera Preview or Captured Image */}
          <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
            {capturedImage ? (
              <img 
                src={capturedImage} 
                alt="Captured product" 
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            )}
            
            {/* Recognition overlay */}
            {isRecognizing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Card className="bg-white/90 backdrop-blur-sm">
                  <CardContent className="p-4 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-sm font-medium">Recognizing product...</p>
                    <p className="text-xs text-gray-600">Using AI to identify the item</p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          
          {/* Hidden canvas for image capture */}
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Camera Controls */}
          <div className="flex justify-center gap-3">
            {!isStreaming && !capturedImage && (
              <Button onClick={startCamera} className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Start Camera
              </Button>
            )}
            
            {isStreaming && !capturedImage && (
              <>
                <Button 
                  onClick={captureImage} 
                  variant="default"
                  className="flex items-center gap-2"
                  disabled={isRecognizing}
                >
                  <Camera className="w-4 h-4" />
                  Capture
                </Button>
                <Button onClick={stopCamera} variant="outline">
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
            
            {capturedImage && !isRecognizing && (
              <>
                <Button 
                  onClick={handleConfirm} 
                  variant="default"
                  className="flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {mode === 'capture' ? 'Use This Image' : 'Confirm'}
                </Button>
                <Button 
                  onClick={handleRetake} 
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retake
                </Button>
              </>
            )}
          </div>
          
          {/* Instructions */}
          <div className="text-xs text-gray-500 text-center bg-blue-50 p-3 rounded-lg">
            {mode === 'capture' ? (
              <>📷 Position your product in the frame and tap capture to save the image.</>
            ) : (
              <>🤖 Point camera at product for AI recognition. Make sure the item is clearly visible.</>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}