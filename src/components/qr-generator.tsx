import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QRGeneratorProps {
  value: string;
  size?: number;
  className?: string;
  generateUrl?: boolean;
}

export default function QRGenerator({ value, size = 200, className = "", generateUrl = true }: QRGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      // Generate URL for check-in if generateUrl is true
      const qrValue = generateUrl 
        ? `${window.location.origin}/checkin/qr/${value}`
        : value;
        
      QRCode.toCanvas(canvasRef.current, qrValue, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }, (error) => {
        if (error) console.error('QR Code generation error:', error);
      });
    }
  }, [value, size, generateUrl]);

  return (
    <div className={`flex justify-center ${className}`}>
      <canvas ref={canvasRef} className="border border-border rounded-lg" />
    </div>
  );
}
