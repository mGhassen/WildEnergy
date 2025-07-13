"use client";
import { useState, useMemo } from "react";
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
import { CheckCircle, Clock, Users, QrCode, Copy, Eye } from "lucide-react";
import { getInitials, formatDateTime } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

export default function AdminCheckins() {
  const [manualQRCode, setManualQRCode] = useState("");
  const [testQRCode, setTestQRCode] = useState("QR-TEST-123456");
  const [filterDate, setFilterDate] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [filterMember, setFilterMember] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all check-ins (not just today)
  const { data: allCheckins = [], isLoading } = useQuery({
    queryKey: ["/api/checkins", "all"],
    queryFn: () => apiRequest("GET", `/api/checkins`),
  });

  // Map checkins to ensure member data has camelCase fields
  const mappedCheckins = Array.isArray(allCheckins)
    ? allCheckins.map((checkin: any) => ({
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

  // Filtering logic
  const filteredCheckins = useMemo(() => {
    return mappedCheckins.filter((checkin: any) => {
      const dateMatch = filterDate ? checkin.checkin_time?.startsWith(filterDate) : true;
      const courseMatch = filterCourse ? (checkin.class?.name || '').toLowerCase().includes(filterCourse.toLowerCase()) : true;
      const memberMatch = filterMember ? (
        (checkin.member?.firstName || '').toLowerCase().includes(filterMember.toLowerCase()) ||
        (checkin.member?.lastName || '').toLowerCase().includes(filterMember.toLowerCase()) ||
        (checkin.member?.email || '').toLowerCase().includes(filterMember.toLowerCase())
      ) : true;
      const statusMatch = filterStatus ? (
        filterStatus === 'checkedin' ? !!checkin.checkin_time : !checkin.checkin_time
      ) : true;
      return dateMatch && courseMatch && memberMatch && statusMatch;
    });
  }, [mappedCheckins, filterDate, filterCourse, filterMember, filterStatus]);

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
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}/checkin/${qrCode}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "URL copied!",
      description: "QR code URL copied to clipboard"
    });
  };

  return (
    <div className="space-y-8">
      {/* Manual Check-in at the top */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Manual Check-in
          </CardTitle>
          <CardDescription>
            Enter a QR code to process a check-in manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 max-w-md">
            <Input
              id="manualQRCode"
              value={manualQRCode}
              onChange={(e) => setManualQRCode(e.target.value)}
              placeholder="Enter QR code to process check-in"
            />
            <Button 
              onClick={handleManualCheckin} 
              disabled={!manualQRCode.trim()}
            >
              Process Check-in
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <Label>Date</Label>
          <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
        </div>
        <div>
          <Label>Course/Class</Label>
          <Input placeholder="Course name" value={filterCourse} onChange={e => setFilterCourse(e.target.value)} />
        </div>
        <div>
          <Label>Member</Label>
          <Input placeholder="Name or email" value={filterMember} onChange={e => setFilterMember(e.target.value)} />
        </div>
        <div>
          <Label>Status</Label>
          <select className="border rounded px-2 py-1" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All</option>
            <option value="checkedin">Checked In</option>
            <option value="notcheckedin">Not Checked In</option>
          </select>
        </div>
      </div>

      {/* All Check-ins Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Check-ins</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading check-ins...</p>
            </div>
          ) : filteredCheckins.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No check-ins found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Course/Class</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCheckins.map((checkin: any) => {
                    const checkinDate = checkin.checkin_time ? new Date(checkin.checkin_time) : null;
                    return (
                      <TableRow key={checkin.id}>
                        <TableCell>
                          {checkin.member ? (
                            <div>
                              <div className="font-medium">{checkin.member.firstName} {checkin.member.lastName}</div>
                              <div className="text-xs text-muted-foreground">{checkin.member.email}</div>
                            </div>
                          ) : 'Unknown'}
                        </TableCell>
                        <TableCell>{checkin.class?.name || 'Class'}</TableCell>
                        <TableCell>{checkinDate ? checkinDate.toLocaleDateString() : '-'}</TableCell>
                        <TableCell>{checkinDate ? checkinDate.toLocaleTimeString() : '-'}</TableCell>
                        <TableCell>
                          {checkin.checkin_time ? (
                            <Badge variant="default">Checked In</Badge>
                          ) : (
                            <Badge variant="secondary">Not Checked In</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const qrCode = checkin.registration?.qr_code || checkin.registration?.qrCode || '';
                              if (qrCode && typeof window !== 'undefined') {
                                window.open(`/checkin/qr/${qrCode}`, '_blank');
                              } else {
                                toast({
                                  title: "Error",
                                  description: "QR code not found for this check-in",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" /> View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QR Code Generation and Instructions (collapsible/secondary) */}
      <details className="mt-8">
        <summary className="cursor-pointer font-medium text-primary">Show QR Code Generator & Instructions</summary>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                QR Code Generator
              </CardTitle>
              <CardDescription>
                Generate QR codes for members or test check-ins
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
                    URL: {typeof window !== 'undefined' ? `${window.location.origin}/checkin/${testQRCode}` : `/checkin/${testQRCode}`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
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
      </details>
    </div>
  );
}
