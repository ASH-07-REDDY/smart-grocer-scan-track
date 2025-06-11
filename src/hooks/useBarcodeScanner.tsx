
import { useEffect, useRef, useState } from 'react';

interface UseBarcodeScanner {
  isScanning: boolean;
  startScanning: () => Promise<void>;
  stopScanning: () => void;
  error: string | null;
}

export function useBarcodeScanner(onBarcodeDetected: (barcode: string) => void): UseBarcodeScanner {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported in this browser');
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      streamRef.current = stream;

      // Create video element if it doesn't exist
      if (!videoRef.current) {
        videoRef.current = document.createElement('video');
        videoRef.current.autoplay = true;
        videoRef.current.playsInline = true;
      }

      videoRef.current.srcObject = stream;

      // Simulate barcode detection (in production, use libraries like QuaggaJS or ZXing)
      intervalRef.current = setInterval(() => {
        // Simulate finding a barcode after a few seconds
        const mockBarcodes = [
          '123456789012', '234567890123', '345678901234', 
          '456789012345', '567890123456'
        ];
        const randomBarcode = mockBarcodes[Math.floor(Math.random() * mockBarcodes.length)];
        
        // Simulate 30% chance of finding a barcode every 2 seconds
        if (Math.random() > 0.7) {
          onBarcodeDetected(randomBarcode);
          stopScanning();
        }
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access camera');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return { isScanning, startScanning, stopScanning, error };
}
