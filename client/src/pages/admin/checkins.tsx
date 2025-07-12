import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import QRScanner from "@/components/qr-scanner";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, AlertCircle, Clock, Users } from "lucide-react";
import { getInitials, formatDateTime } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function AdminCheckins() {
  const [scanResult, setScanResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
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

  const checkinMutation = useMutation({
    mutationFn: async (qrCode: string) => {
      console.log("Attempting check-in with QR code:", qrCode);
      const response = await apiRequest("POST", "/api/checkins/qr", { qrCode });
      return response.json();
    },
    onSuccess: (data) => {
      console.log("Check-in successful:", data);
      setScanResult({
        success: true,
        member: data.member,
        class: data.class,
        sessionsRemaining: data.sessionsRemaining,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/checkins"] });
      toast({ 
        title: "Check-in successful!",
        description: `${data.member.firstName} ${data.member.lastName} checked in. ${data.sessionsRemaining} sessions remaining.`
      });
    },
    onError: (error: any) => {
      console.error("Check-in error:", error);
      
      // Handle enhanced error responses from the API
      const errorData = error.response?.data || {};
      const errorMessage = errorData.message || error.message || "Check-in failed";
      const suggestion = errorData.suggestion;
      
      setScanResult({
        success: false,
        error: errorData.error || "Check-in failed",
        message: errorMessage,
        suggestion: suggestion,
        member: errorData.member,
      });
      
      toast({
        title: errorData.error || "Check-in failed",
        description: errorMessage + (suggestion ? ` ${suggestion}` : ""),
        variant: "destructive"
      });
    },
  });

  const handleQRScan = async (qrCode: string) => {
    setIsProcessing(true);
    setScanResult(null);
    
    try {
      await checkinMutation.mutateAsync(qrCode);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">QR Check-ins</h1>
        <p className="text-muted-foreground">Scan member QR codes and manage check-ins</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* QR Scanner */}
        <div className="space-y-6">
          <QRScanner onScan={handleQRScan} isProcessing={isProcessing} />

          {/* Scan Result */}
          {scanResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {scanResult.success ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      Check-in Successful
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      Check-in Failed
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {scanResult.success ? (
                  <div className="space-y-4">
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Session consumed from membership
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Member</label>
                        <div className="flex items-center space-x-3 mt-1">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {getInitials(scanResult.member.firstName || '', scanResult.member.lastName || '')}
                            </span>
                          </div>
                          <span className="font-medium">{scanResult.member.firstName || ''} {scanResult.member.lastName || ''}</span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Class</label>
                        <p className="mt-1 text-foreground">{scanResult.class?.name}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Sessions Remaining</label>
                        <p className="mt-1 text-lg font-semibold text-primary">{scanResult.sessionsRemaining} sessions</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Check-in Time</label>
                        <p className="mt-1 text-foreground">{formatDateTime(new Date())}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <p className="font-semibold">{scanResult.error}</p>
                          {scanResult.message && (
                            <p className="text-sm">{scanResult.message}</p>
                          )}
                          {scanResult.suggestion && (
                            <p className="text-xs bg-muted p-2 rounded border">
                              <strong>Suggestion:</strong> {scanResult.suggestion}
                            </p>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                    
                    {scanResult.member && (
                      <div className="mt-4 p-4 bg-muted rounded-lg">
                        <label className="text-sm font-medium text-muted-foreground">Member Information</label>
                        <p className="mt-1 text-foreground font-medium">
                          {scanResult.member.firstName || ''} {scanResult.member.lastName || ''}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {scanResult.member.email}
                        </p>
                        {scanResult.sessionsRemaining !== undefined && (
                          <p className="text-sm text-muted-foreground">
                            Sessions remaining: {scanResult.sessionsRemaining}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Stats Cards */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Today's Check-ins</p>
                    <p className="text-3xl font-bold text-foreground">{todayCheckins?.length || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>            
          </div>
        </div>
      </div>

      {/* Today's Check-ins Table */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Check-ins</CardTitle>
          <CardDescription>
            All check-ins for {new Date().toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4 p-4">
                  <div className="w-10 h-10 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-3 bg-muted rounded w-1/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : todayCheckins && todayCheckins.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappedCheckins.map((checkin: any) => (
                  <TableRow key={checkin.id}>
                    <TableCell>
                      {formatDateTime(checkin.checkinTime)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {checkin.member ? getInitials(checkin.member.firstName || '', checkin.member.lastName || '') : "?"}
                          </span>
                        </div>
                        <span className="font-medium text-foreground">
                          {checkin.member?.firstName || ''} {checkin.member?.lastName || ''}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {checkin.class?.name || "Unknown"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Checked In
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No check-ins today
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
