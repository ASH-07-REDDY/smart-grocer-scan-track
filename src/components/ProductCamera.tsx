import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, Check, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface ProductCameraProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageCaptured: (imageUrl: string) => void;
  onProductRecognized?: (productData: { 
    name: string; 
    confidence: number; 
    imageUrl: string; 
    category?: string; 
    brand?: string; 
    details?: string; 
  }) => void;
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
      // Enhanced mobile camera constraints
      const constraints = {
        video: {
          facingMode: { exact: 'environment' }, // Force back camera on mobile
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          aspectRatio: { ideal: 16/9 },
          frameRate: { ideal: 30 }
        },
        audio: false
      };

      // Try with exact constraints first, fallback if needed
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        console.log('Exact constraints failed, trying fallback...');
        // Fallback constraints for compatibility
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Without 'exact' for compatibility
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
      }
      
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
      console.log('Starting AI product recognition...');
      
      // Call our AI recognition edge function
      const { data, error } = await supabase.functions.invoke('ai-product-recognition', {
        body: {
          imageData: imageUrl,
          mode: 'comprehensive' // Use comprehensive mode for best accuracy
        }
      });
      
      if (error) {
        throw error;
      }
      
      if (data && data.productName) {
        const productData = {
          name: data.productName,
          confidence: data.confidence,
          imageUrl: data.actualProductImage || imageUrl, // Use AI-generated product image if available
          category: data.category,
          brand: data.brand,
          details: data.details
        };
        
        if (onProductRecognized) {
          onProductRecognized(productData);
        }
        
        const confidencePercent = Math.round(data.confidence * 100);
        
        toast({
          title: "Product Recognized!",
          description: `${data.productName} (${confidencePercent}% confidence)${data.brand ? ` by ${data.brand}` : ''}`,
        });
        
        console.log('Recognition successful:', productData);
      } else {
        throw new Error('No product data received');
      }
      
    } catch (error) {
      console.error('Product recognition error:', error);
      toast({
        title: "Recognition Failed",
        description: "Could not identify the product. Please try again with better lighting.",
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
      <DialogContent className="sm:max-w-[700px] max-h-[95vh] overflow-hidden glass-card border-0">
        <DialogHeader className="relative">
          <div className="absolute -top-2 -right-2 w-20 h-20 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-xl"></div>
          <DialogTitle className="flex items-center gap-3 text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-sm">
              <Camera className="w-6 h-6 text-primary" />
            </div>
            {getTitle()}
          </DialogTitle>
          <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary rounded-full mt-2"></div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Camera Preview or Captured Image */}
          <div className="relative aspect-video bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl overflow-hidden depth-card">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5"></div>
            <div className="absolute top-4 left-4 flex gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse delay-100"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse delay-200"></div>
            </div>
            
            {capturedImage ? (
              <img 
                src={capturedImage} 
                alt="Captured product" 
                className="w-full h-full object-cover relative z-10"
              />
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover relative z-10"
              />
            )}
            
            {/* AI Recognition overlay with 3D effect */}
            {isRecognizing && (
              <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-purple-900/40 to-blue-900/40 flex items-center justify-center z-20 backdrop-blur-sm">
                <div className="glass-card p-8 text-center max-w-sm mx-4 floating">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-20 rounded-full blur-xl"></div>
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary relative z-10" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">AI Analysis in Progress</h3>
                  <p className="text-sm text-gray-200 mb-1">Scanning product details...</p>
                  <p className="text-xs text-gray-300">Advanced computer vision processing</p>
                  <div className="mt-4 h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Decorative grid overlay */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>
          </div>
          
          {/* Hidden canvas for image capture */}
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Professional Camera Controls */}
          <div className="flex justify-center gap-4">
            {!isStreaming && !capturedImage && (
              <Button 
                onClick={startCamera} 
                variant="gradient" 
                size="lg"
                className="flex items-center gap-3 px-8 py-3 text-lg font-semibold"
              >
                <Camera className="w-5 h-5" />
                Activate Camera
              </Button>
            )}
            
            {isStreaming && !capturedImage && (
              <div className="flex gap-4">
                <Button 
                  onClick={captureImage} 
                  variant="premium"
                  size="lg"
                  className="flex items-center gap-3 px-8 py-3"
                  disabled={isRecognizing}
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/20 rounded-full animate-ping"></div>
                    <Camera className="w-5 h-5 relative z-10" />
                  </div>
                  Capture Photo
                </Button>
                <Button 
                  onClick={stopCamera} 
                  variant="outline" 
                  size="lg"
                  className="flex items-center gap-3 px-6 py-3"
                >
                  <X className="w-5 h-5" />
                  Cancel
                </Button>
              </div>
            )}
            
            {capturedImage && !isRecognizing && (
              <div className="flex gap-4">
                <Button 
                  onClick={handleConfirm} 
                  variant="premium"
                  size="lg"
                  className="flex items-center gap-3 px-8 py-3"
                >
                  <Check className="w-5 h-5" />
                  {mode === 'capture' ? 'Use This Image' : 'Confirm Result'}
                </Button>
                <Button 
                  onClick={handleRetake} 
                  variant="outline"
                  size="lg"
                  className="flex items-center gap-3 px-6 py-3"
                >
                  <RotateCcw className="w-5 h-5" />
                  Retake Photo
                </Button>
              </div>
            )}
          </div>
          
          {/* Professional Instructions Panel */}
          <div className="glass-card p-6 rounded-2xl border border-primary/20">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
                {mode === 'capture' ? (
                  <Camera className="w-6 h-6 text-primary" />
                ) : (
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-pulse"></div>
                    <span className="text-2xl relative z-10">🤖</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground mb-2">
                  {mode === 'capture' ? 'Photo Capture Mode' : 'AI Recognition Mode'}
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  {mode === 'capture' ? (
                    <>Position your product in the center of the frame for the best photo quality. Ensure good lighting and focus.</>
                  ) : (
                    <>Our advanced AI will analyze your product using computer vision and machine learning to provide accurate identification.</>
                  )}
                </p>
                {mode === 'recognize' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      <span>Ensure clear view of product labels and branding</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span>Good lighting improves recognition accuracy</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                      <span>Multiple AI models ensure precise identification</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}