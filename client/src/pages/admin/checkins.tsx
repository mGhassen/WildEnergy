import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import QRGenerator from "@/components/qr-generator";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, Clock, Users, QrCode, Copy } from "lucide-react";
import { getInitials, formatDateTime } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function AdminCheckins() {
  const [manualQRCode, setManualQRCode] = useState("");
  const [testQRCode, setTestQRCode] = useState("QR-TEST-123456");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const today = new Date().toISOString().split('T')[0];
  
  const { data: todayCheckins = [], isLoading } = useQuery({
    queryKey: ["/api/checkins", today],
    queryFn: () => apiRequest("GET", `/api/checkins?date=${today}`),
  });

  // Map checkins to ensure member data has camelCase fields
  const mappedCheckins = Array.isArray(todayCheckins)
    ? todayCheckins.map((checkin: any) => ({
        ...checkin,
        member: checkin.member ? {
          ...checkin.member,
          firstName: checkin.member.firstName || checkin.member.first_name || '',
          lastName: checkin.member.lastName || checkin.member.last_name || '',
          email: checkin.member.email,
        } : null,
        class: checkin.class || checkin.registration?.schedule?.class,
      }))
    : [];

  const handleManualCheckin = async () => {
    if (!manualQRCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a QR code",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await apiRequest("POST", "/api/checkins", { qr_code: manualQRCode.trim() });
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Check-in successful!",
          description: `${data.data.member_name} checked in successfully.`
        });
        queryClient.invalidateQueries({ queryKey: ["/api/checkins"] });
        setManualQRCode("");
      } else {
        toast({
          title: "Check-in failed",
          description: data.message,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error("Manual check-in error:", error);
      const errorMessage = error.response?.data?.message || "Check-in failed";
      toast({
        title: "Check-in failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const copyQRUrl = (qrCode: string) => {
    const url = `${window.location.origin}/checkin/${qrCode}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "URL copied!",
      description: "QR code URL copied to clipboard"
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">QR Check-ins</h1>
        <p className="text-muted-foreground">Generate QR codes and manage check-ins</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* QR Code Generation and Manual Check-in */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                QR Code Check-in
              </CardTitle>
              <CardDescription>
                Generate QR codes for members or manually process check-ins
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Test QR Code */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="testQRCode">Test QR Code</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="testQRCode"
                      value={testQRCode}
                      onChange={(e) => setTestQRCode(e.target.value)}
                      placeholder="Enter QR code value"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyQRUrl(testQRCode)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <QRGenerator value={testQRCode} size={150} />
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Scan this QR code to test the check-in process
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    URL: {window.location.origin}/checkin/{testQRCode}
                  </p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or enter manually</span>
                </div>
              </div>

              {/* Manual Check-in */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="manualQRCode">QR Code</Label>
                  <Input
                    id="manualQRCode"
                    value={manualQRCode}
                    onChange={(e) => setManualQRCode(e.target.value)}
                    placeholder="Enter QR code to process check-in"
                  />
                </div>
                <Button 
                  onClick={handleManualCheckin} 
                  className="w-full"
                  disabled={!manualQRCode.trim()}
                >
                  Process Check-in
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>How it works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>1. Generate QR Code:</strong> Create a QR code with a unique identifier for each member's class registration.
                </p>
                <p className="text-sm">
                  <strong>2. Member Scans:</strong> Member scans the QR code with any camera app, which opens the check-in URL.
                </p>
                <p className="text-sm">
                  <strong>3. Automatic Check-in:</strong> The system validates the QR code and processes the check-in automatically.
                </p>
                <p className="text-sm">
                  <strong>4. Confirmation:</strong> Member sees a success message and can return to the main app.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Check-ins */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Today's Check-ins
              </CardTitle>
              <CardDescription>
                {formatDateTime(new Date(today))}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Loading check-ins...</p>
                </div>
              ) : mappedCheckins.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No check-ins today</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {mappedCheckins.map((checkin: any) => (
                    <div key={checkin.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {getInitials(checkin.member?.firstName || '', checkin.member?.lastName || '')}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">
                            {checkin.member?.firstName || ''} {checkin.member?.lastName || ''}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {checkin.class?.name || 'Class'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="mb-1">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Checked in
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(new Date(checkin.checkin_time))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
