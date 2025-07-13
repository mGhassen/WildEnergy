import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, QrCode, AlertCircle, X } from "lucide-react";
import jsQR from "jsqr";
import QRGenerator from "./qr-generator";

interface QRScannerProps {
  onScan: (qrCode: string) => void;
  isProcessing?: boolean;
}

export default function QRScanner({ onScan, isProcessing = false }: QRScannerProps) {
  const [isActive, setIsActive] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Ready");
  const [debugInfo, setDebugInfo] = useState<string>("");
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  // Clean up function
  const cleanup = () => {
    console.log("Cleaning up camera resources");
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsActive(false);
    setStatus("Ready");
    setDebugInfo("");
  };

  // QR scanning function
  const scanQRCode = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || !isActive) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    // Prevent multiple scans of the same QR code
    const now = Date.now();
    if (now - lastScanTimeRef.current < 2000) {
      return;
    }

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      try {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Update debug info
        setDebugInfo(`Scanning: ${canvas.width}x${canvas.height} | Data length: ${imageData.data.length}`);
        
        // Try different scanning approaches
        let qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth"
        });
        
        // If no QR found, try with different settings
        if (!qrCode) {
          // Try with different inversion settings
          qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert"
          });
        }
        
        if (!qrCode) {
          // Try with different inversion settings
          qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "onlyInvert"
          });
        }
        
        if (qrCode && qrCode.data) {
          console.log("✅ QR Code detected:", qrCode.data);
          console.log("QR Code location:", qrCode.location);
          console.log("QR Code format:", qrCode.format);
          setStatus("🎯 QR Code Found!");
          setDebugInfo(`Found: ${qrCode.data.substring(0, 20)}...`);
          
          // Flash the border green to indicate detection
          const videoContainer = document.querySelector('.qr-scanner-border');
          if (videoContainer) {
            videoContainer.classList.add('qr-detected');
            setTimeout(() => {
              videoContainer.classList.remove('qr-detected');
            }, 500);
          }
          
          // Prevent multiple scans
          lastScanTimeRef.current = now;
          
          // Stop scanning and process
          cleanup();
          onScan(qrCode.data);
        } else {
          // Log scanning attempt for debugging
          if (canvas.width > 0 && canvas.height > 0) {
            console.log("Scanning frame:", canvas.width + "x" + canvas.height, "No QR found");
          }
          setStatus("🔍 Scanning...");
        }
      } catch (err) {
        console.error("QR scan error:", err);
        setStatus("⚠️ Scan error");
        setDebugInfo(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } else {
      setStatus("📷 Loading camera...");
    }
  };

  // Start camera function
  const startCamera = async () => {
    try {
      setError(null);
      setStatus("Starting camera...");
      setDebugInfo("Initializing...");

      // Clean up any existing streams
      cleanup();

      // Set state first to render video element
      setIsActive(true);
      
      // Wait for React to render the video element
      await new Promise(resolve => setTimeout(resolve, 100));

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: "environment" },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30 }
        }
      });

      // Check if video element is now available
      if (!videoRef.current) {
        stream.getTracks().forEach(track => track.stop());
        setIsActive(false);
        throw new Error("Video element failed to render");
      }

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      
      // Wait for video to load
      await new Promise((resolve, reject) => {
        const video = videoRef.current!;
        
        const onLoadedData = () => {
          video.removeEventListener('loadeddata', onLoadedData);
          console.log("Video ready:", video.videoWidth, "x", video.videoHeight);
          setDebugInfo(`Camera: ${video.videoWidth}x${video.videoHeight}`);
          resolve(true);
        };
        
        const onError = () => {
          video.removeEventListener('error', onError);
          reject(new Error("Video load failed"));
        };
        
        video.addEventListener('loadeddata', onLoadedData);
        video.addEventListener('error', onError);
        
        video.play().catch(reject);
      });

      setStatus("Camera ready");
      
      // Start scanning with faster interval for better detection
      intervalRef.current = setInterval(scanQRCode, 100);
      
    } catch (err: any) {
      console.error("Camera error:", err);
      setIsActive(false);
      setDebugInfo(`Camera error: ${err.message}`);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      if (err.name === "NotAllowedError") {
        setError("Camera permission denied. Please allow camera access.");
      } else if (err.name === "NotFoundError") {
        setError("No camera found. Please connect a camera.");
      } else {
        setError(`Camera error: ${err.message}`);
      }
    }
  };

  // Manual submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onScan(manualCode.trim());
      setManualCode("");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          QR Code Scanner
        </CardTitle>
        <CardDescription>
          Scan a member's QR code to check them in to their class
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
          <style jsx>{`
            .qr-detected {
              border-color: #10b981 !important;
              box-shadow: 0 0 20px rgba(16, 185, 129, 0.5) !important;
              animation: flash 0.5s ease-in-out;
            }
            
            @keyframes flash {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.7; }
            }
          `}</style>
          {!isActive ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                <Camera className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">Camera Scanner</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Point camera at QR code to scan
                </p>
              </div>
              <Button onClick={startCamera} disabled={isProcessing}>
                <Camera className="w-4 h-4 mr-2" />
                Start Camera
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative mx-auto max-w-sm">
                <div className="bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-64 object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                
                <div className="qr-scanner-border absolute inset-0 border-2 border-green-400 rounded-lg pointer-events-none transition-all duration-300">
                  <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-green-400 animate-pulse"></div>
                  <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-green-400 animate-pulse"></div>
                  <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-green-400 animate-pulse"></div>
                  <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-green-400 animate-pulse"></div>
                  
                  {/* Center crosshair */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-green-400 opacity-50">
                      <div className="absolute inset-0 border border-green-400 animate-ping"></div>
                    </div>
                  </div>
                </div>
                
                <div className="absolute top-2 left-2 bg-green-500 text-white px-3 py-1 rounded-md text-sm font-medium shadow-lg">
                  {status}
                </div>
                
                {/* Debug info */}
                {debugInfo && (
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                    {debugInfo}
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <Button variant="outline" onClick={cleanup} size="sm">
                  <X className="w-4 h-4 mr-2" />
                  Stop Camera
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500">Or enter manually</span>
          </div>
        </div>

        {/* Test QR Code for debugging */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Test QR Code</h4>
          <p className="text-xs text-gray-600 mb-3">
            Use this QR code to test the scanner: <code className="bg-white px-1 rounded">QR-TEST-123456</code>
          </p>
          <div className="flex justify-center">
            <QRGenerator value="QR-TEST-123456" size={100} />
          </div>
        </div>

        <form onSubmit={handleManualSubmit} className="space-y-4">
          <div>
            <Label htmlFor="manualCode">QR Code or Member ID</Label>
            <Input
              id="manualCode"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Try: QR-1749148872842-1-4"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the full QR code or just the member ID number
            </p>
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={!manualCode.trim() || isProcessing}
          >
            {isProcessing ? "Processing Check-in..." : "Manual Check-in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}