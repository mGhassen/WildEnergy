import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, User, Search, CheckCircle, XCircle, AlertCircle, QrCode } from "lucide-react";
import { formatTime, getDayName, formatDateTime } from "@/lib/auth";
import QRGenerator from "@/components/qr-generator";
import { formatDate } from "@/lib/date";

export default function MemberHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedQR, setSelectedQR] = useState<string | null>(null);

  const { data: registrations = [], isLoading: registrationsLoading } = useQuery({
    queryKey: ["/api/registrations"],
  });

  const { data: checkins = [], isLoading: checkinsLoading } = useQuery({
    queryKey: ["/api/member/checkins"],
  });

  // Get all registrations without search/status filters for proper categorization
  const allRegistrations = registrations || [];

  const attendedClasses = (checkins || [])
    .filter((checkin: any) => checkin?.registration?.schedule?.class)
    .map((checkin: any) => ({
      ...checkin.registration,
      checkinTime: checkin.checkinTime,
      sessionConsumed: checkin.sessionConsumed,
      status: 'attended'
    }));

  const registeredClasses = allRegistrations.filter((reg: any) => {
    if (reg.status !== 'registered') return false;
    // For upcoming classes, just check if status is registered
    // Don't filter by date here since we want to show all registered classes
    const classDateTime = new Date(reg.schedule.scheduleDate);
    const [hours, minutes] = reg.schedule.startTime.split(':');
    classDateTime.setHours(parseInt(hours), parseInt(minutes));
    return classDateTime > new Date();
  });

  const cancelledClasses = allRegistrations.filter((reg: any) => reg.status === 'cancelled');

  const absentClasses = allRegistrations.filter((reg: any) => {
    // Either explicitly marked as absent, or registered but past and not attended
    if (reg.status === 'absent') return true;
    
    if (reg.status === 'registered') {
      const classDateTime = new Date(reg.schedule.scheduleDate);
      const [hours, minutes] = reg.schedule.startTime.split(':');
      classDateTime.setHours(parseInt(hours), parseInt(minutes));
      const isPast = classDateTime < new Date();
      const didAttend = attendedClasses.some(attended => attended.id === reg.id);
      return isPast && !didAttend;
    }
    
    return false;
  });

  // Apply search and status filters to display data
  const filteredRegistrations = allRegistrations.filter((registration: any) => {
    if (!registration?.schedule?.class || !registration?.schedule?.trainer) return false;
    const matchesSearch = registration.schedule.class.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         registration.schedule.trainer.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         registration.schedule.trainer.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || statusFilter === "all" || registration.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'attended':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'registered':
        return <AlertCircle className="w-4 h-4 text-blue-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'absent':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'attended':
        return <Badge variant="default" className="bg-green-100 text-green-800">Attended</Badge>;
      case 'registered':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Registered</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'absent':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Absent</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const renderClassCard = (classData: any, showQR = false) => {
    const isAttended = classData.status === 'attended';
    const isRegistered = classData.status === 'registered';
    const isCancelled = classData.status === 'cancelled';

    return (
      <Card key={`${classData.id}-${classData.status}`} className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg text-foreground">{classData.schedule.class.name}</CardTitle>
              <CardDescription className="mt-1">
                {classData.schedule.trainer.firstName} {classData.schedule.trainer.lastName}
              </CardDescription>
            </div>
            {getStatusBadge(classData.status)}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2" />
              {getDayName(classData.schedule.dayOfWeek)}
            </div>
            <div className="flex items-center text-muted-foreground">
              <Clock className="w-4 h-4 mr-2" />
              {formatTime(classData.schedule.startTime)}
            </div>
            <div className="flex items-center text-muted-foreground">
              <User className="w-4 h-4 mr-2" />
              {classData.schedule.class.category}
            </div>
            <div className="flex items-center text-muted-foreground">
              {getStatusIcon(classData.status)}
              <span className="ml-2 capitalize">{classData.status}</span>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            {isAttended && classData.checkinTime && (
              <p>Attended: {formatDateTime(classData.checkinTime)}</p>
            )}
            {isRegistered && (
              <p>Class Date: {formatDate(classData.schedule.scheduleDate)}</p>
            )}
            {isCancelled && (
              <p>Cancelled: {formatDate(classData.registrationDate)}</p>
            )}
          </div>

          {showQR && isRegistered && classData.qrCode && (
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Your QR Code</span>
                <button
                  onClick={() => setSelectedQR(classData.qrCode)}
                  className="flex items-center text-xs text-blue-600 hover:text-blue-800"
                >
                  <QrCode className="w-3 h-3 mr-1" />
                  View Full Size
                </button>
              </div>
              <div className="flex justify-center">
                <QRGenerator value={classData.qrCode} size={100} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (registrationsLoading || checkinsLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your class history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Class History</h1>
        <p className="text-muted-foreground mt-2">
          View all your classes - attended, registered, and cancelled
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search classes or trainers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="attended">Attended</SelectItem>
            <SelectItem value="registered">Registered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="absent">Absent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Classes Attended</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{attendedClasses.length}</div>
            <p className="text-sm text-muted-foreground">Total completed classes</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Upcoming Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{registeredClasses.length}</div>
            <p className="text-sm text-muted-foreground">Classes you're registered for</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Cancelled Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{cancelledClasses.length}</div>
            <p className="text-sm text-muted-foreground">Classes you've cancelled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Absent Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{absentClasses.length}</div>
            <p className="text-sm text-muted-foreground">Classes you missed</p>
          </CardContent>
        </Card>
      </div>

      {/* Class History Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All Classes</TabsTrigger>
          <TabsTrigger value="attended">Attended</TabsTrigger>
          <TabsTrigger value="registered">Registered</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          <TabsTrigger value="absent">Absent</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...attendedClasses, ...registeredClasses, ...cancelledClasses, ...absentClasses]
              .sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime())
              .map((classData) => renderClassCard(classData, true))}
          </div>
          {[...attendedClasses, ...registeredClasses, ...cancelledClasses, ...absentClasses].length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No class history found.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="attended" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {attendedClasses
              .sort((a, b) => new Date(b.checkinTime).getTime() - new Date(a.checkinTime).getTime())
              .map((classData) => renderClassCard(classData))}
          </div>
          {attendedClasses.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No attended classes found.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="registered" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {registeredClasses
              .sort((a, b) => new Date(a.schedule.scheduleDate).getTime() - new Date(b.schedule.scheduleDate).getTime())
              .map((classData) => renderClassCard(classData, true))}
          </div>
          {registeredClasses.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No registered classes found.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cancelledClasses
              .sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime())
              .map((classData) => renderClassCard(classData))}
          </div>
          {cancelledClasses.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No cancelled classes found.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="absent" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {absentClasses
              .sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime())
              .map((classData) => renderClassCard(classData))}
          </div>
          {absentClasses.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No absent classes found.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* QR Code Modal */}
      {selectedQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedQR(null)}>
          <div className="bg-white p-6 rounded-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Your QR Code</h3>
            <QRGenerator value={selectedQR} size={300} />
            <button
              onClick={() => setSelectedQR(null)}
              className="mt-4 w-full bg-primary text-white py-2 px-4 rounded hover:bg-primary/90"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}