"use client";

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
import { apiRequest } from "@/lib/queryClient";

// Types for member history page
interface Trainer {
  id: number;
  firstName: string;
  lastName: string;
}

interface Class {
  id: number;
  name: string;
  category?: string;
}

interface Schedule {
  scheduleDate: string;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  class: Class;
  trainer: Trainer;
}

interface Registration {
  id: number;
  registrationDate: string;
  qrCode: string;
  schedule: Schedule;
  status: string;
}

interface Checkin {
  id: number;
  registration: Registration;
  checkinTime: string;
  sessionConsumed: boolean;
}

// Map registration object to ensure camelCase properties exist and use 'class' (not 'course')
function mapRegistration(reg: unknown): Registration {
  if (typeof reg !== 'object' || reg === null) throw new Error('Invalid registration');
  const r = reg as Record<string, any>;
  return {
    id: r.id ?? 0,
    status: r.status ?? '',
    registrationDate: r.registrationDate || r.registration_date || '',
    qrCode: r.qrCode || r.qr_code || '',
    schedule: r.course && {
      scheduleDate: r.course.course_date,
      startTime: r.course.start_time,
      endTime: r.course.end_time,
      dayOfWeek: r.course.day_of_week,
      class: r.course.class && {
        id: r.course.class.id,
        name: r.course.class.name,
        category: r.course.class.category?.name,
      },
      trainer: r.course.trainer && {
        id: r.course.trainer.id,
        firstName: r.course.trainer.user?.first_name,
        lastName: r.course.trainer.user?.last_name,
      }
    }
  };
}

export default function MemberHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedQR, setSelectedQR] = useState<string | null>(null);

  const { data: registrations = [], isLoading: registrationsLoading } = useQuery<Registration[]>({
    queryKey: ["/api/registrations"],
    queryFn: () => apiRequest("GET", "/api/registrations"),
  });

  const { data: checkins = [], isLoading: checkinsLoading } = useQuery<Checkin[]>({
    queryKey: ["/api/member/checkins"],
  });

  // Get all registrations without search/status filters for proper categorization
  const allRegistrations = (registrations || []).map(mapRegistration);

  // Fix attendedClasses to return Registration[] with checkinTime as a separate variable if needed
  const attendedClasses: Registration[] = (checkins || [])
    .filter((checkin: Checkin) => checkin?.registration?.schedule?.class)
    .map((checkin: Checkin) => checkin.registration);

  const registeredClasses = allRegistrations.filter((reg: Registration) => {
    if (reg.status !== 'registered') return false;
    if (!reg.schedule || !reg.schedule.scheduleDate || !reg.schedule.startTime) return false;
    const classDateTime = new Date(reg.schedule.scheduleDate);
    const [hours, minutes] = reg.schedule.startTime.split(':');
    classDateTime.setHours(parseInt(hours), parseInt(minutes));
    return classDateTime > new Date();
  });

  const cancelledClasses = allRegistrations.filter((reg: Registration) => reg.status === 'cancelled');

  const absentClasses = allRegistrations.filter((reg: Registration) => {
    // Either explicitly marked as absent, or registered but past and not attended
    if (reg.status === 'absent') return true;
    if (reg.status === 'registered') {
      if (!reg.schedule || !reg.schedule.scheduleDate || !reg.schedule.startTime) return false;
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
  const filteredRegistrations = allRegistrations.filter((registration: Registration) => {
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

  const renderClassCard = (classData: Registration, showQR = false) => {
    const isAttended = classData.status === 'attended';
    const isRegistered = classData.status === 'registered';
    const isCancelled = classData.status === 'cancelled';

    return (
      <Card key={`${classData.id}-${classData.status}`} className="overflow-hidden">
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-base font-semibold leading-tight">{classData.schedule.class.name}</CardTitle>
              <CardDescription className="mt-0.5 text-xs">
                {classData.schedule.trainer.firstName} {classData.schedule.trainer.lastName}
              </CardDescription>
            </div>
            {getStatusBadge(classData.status)}
          </div>
        </CardHeader>
        <CardContent className="flex flex-row items-center gap-4 px-4 pb-3 pt-1 min-h-[100px]">
          {/* Left: Info */}
          <div className="flex-1 flex flex-col gap-1 text-xs">
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-1">
              <span className="flex items-center text-muted-foreground"><Calendar className="w-4 h-4 mr-1" />{getDayName(classData.schedule.dayOfWeek)}, {formatDate(classData.schedule.scheduleDate)}</span>
              <span className="flex items-center text-muted-foreground"><Clock className="w-4 h-4 mr-1" />{formatTime(classData.schedule.startTime)}</span>
              <span className="flex items-center text-muted-foreground"><User className="w-4 h-4 mr-1" />{classData.schedule.class.category}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {isAttended && (
                <span>Attended: {formatDateTime(classData.registrationDate)}</span>
              )}
              {isRegistered && (
                <span>Class Date: {formatDate(classData.schedule.scheduleDate)}</span>
              )}
              {isCancelled && (
                <span>Cancelled: {formatDate(classData.registrationDate)}</span>
              )}
            </div>
          </div>
          {/* Right: QR code */}
          {showQR && isRegistered && classData.qrCode && (
            <div className="flex flex-col items-center justify-center min-w-[110px]">
              <span className="text-xs font-medium mb-1">QR Code</span>
              <QRGenerator value={classData.qrCode} size={70} />
              <button
                onClick={() => setSelectedQR(classData.qrCode)}
                className="mt-1 flex items-center text-xs text-blue-600 hover:text-blue-800"
              >
                <QrCode className="w-3 h-3 mr-1" />
                View
              </button>
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
            <p className="text-sm text-muted-foreground">Classes you&apos;re registered for</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Cancelled Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{cancelledClasses.length}</div>
            <p className="text-sm text-muted-foreground">Classes you&apos;ve cancelled</p>
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
              .sort((a: Registration, b: Registration) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime())
              .map((classData: Registration) => renderClassCard(classData, true))}
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
              .sort((a: Registration, b: Registration) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime())
              .map((classData: Registration) => renderClassCard(classData))}
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
              .sort((a: Registration, b: Registration) => new Date(a.schedule.scheduleDate).getTime() - new Date(b.schedule.scheduleDate).getTime())
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
              .sort((a: Registration, b: Registration) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime())
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
              .sort((a: Registration, b: Registration) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime())
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