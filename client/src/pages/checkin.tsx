import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function CheckinPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid'>('loading');
  const [message, setMessage] = useState('');
  const [checkinData, setCheckinData] = useState<any>(null);
  const [qrCode, setQrCode] = useState<string>('');

  useEffect(() => {
    // Extract QR code from URL path
    const path = window.location.pathname;
    const qrCodeFromPath = path.replace('/checkin/', '');
    
    if (!qrCodeFromPath || qrCodeFromPath === 'checkin') {
      setStatus('invalid');
      setMessage('Invalid QR code');
      return;
    }

    setQrCode(qrCodeFromPath);
    processCheckin(qrCodeFromPath);
  }, []);

  const processCheckin = async (qrCodeValue: string) => {
    try {
      setStatus('loading');
      setMessage('Processing check-in...');

      // Call the check-in API
      const response = await apiFetch('/checkins', {
        method: 'POST',
        body: JSON.stringify({
          qr_code: qrCodeValue
        })
      });

      if (response.success) {
        setStatus('success');
        setMessage('Check-in successful!');
        setCheckinData(response.data);
        
        toast({
          title: "Check-in Successful",
          description: `Welcome to your class!`,
        });
      } else {
        setStatus('error');
        setMessage(response.message || 'Check-in failed');
      }
    } catch (error: any) {
      console.error('Check-in error:', error);
      setStatus('error');
      setMessage(error.message || 'Check-in failed. Please try again.');
    }
  };

  const handleRetry = () => {
    setStatus('loading');
    processCheckin(qrCode);
  };

  const handleBack = () => {
    setLocation('/admin/checkins');
  };

  if (!qrCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Invalid QR Code</CardTitle>
            <CardDescription className="text-center">
              The QR code is invalid or missing.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={handleBack} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Check-ins
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">
            {status === 'loading' && 'Processing Check-in...'}
            {status === 'success' && 'Check-in Successful!'}
            {status === 'error' && 'Check-in Failed'}
            {status === 'invalid' && 'Invalid QR Code'}
          </CardTitle>
          <CardDescription className="text-center">
            QR Code: {qrCode}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Icon */}
          <div className="flex justify-center">
            {status === 'loading' && (
              <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="w-16 h-16 text-green-500" />
            )}
            {status === 'error' && (
              <XCircle className="w-16 h-16 text-red-500" />
            )}
            {status === 'invalid' && (
              <XCircle className="w-16 h-16 text-red-500" />
            )}
          </div>

          {/* Message */}
          <div className="text-center">
            <p className="text-lg font-medium">{message}</p>
          </div>

          {/* Check-in Details */}
          {status === 'success' && checkinData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-800 mb-2">Check-in Details</h3>
              <div className="space-y-1 text-sm text-green-700">
                <p><strong>Member:</strong> {checkinData.member_name}</p>
                <p><strong>Class:</strong> {checkinData.class_name}</p>
                <p><strong>Time:</strong> {new Date(checkinData.checkin_time).toLocaleString()}</p>
              </div>
            </div>
          )}

          {/* Error Details */}
          {status === 'error' && (
            <Alert variant="destructive">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {status === 'error' && (
              <Button onClick={handleRetry} className="flex-1">
                <Loader2 className="w-4 h-4 mr-2" />
                Retry
              </Button>
            )}
            <Button 
              onClick={handleBack} 
              variant={status === 'success' ? 'default' : 'outline'}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Check-ins
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 