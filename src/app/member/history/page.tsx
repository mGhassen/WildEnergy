"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, User, Search, CheckCircle, XCircle, AlertCircle, QrCode, Filter, Download, TrendingUp, BarChart3, Calendar as CalendarIcon, Copy } from "lucide-react";
import { formatTime, getDayName, formatDateTime } from "@/lib/date";
import QRGenerator from "@/components/qr-generator";
import { formatDate } from "@/lib/date";
import { useRegistrations } from "@/hooks/useRegistrations";
import { useCheckins } from "@/hooks/useCheckins";
import { CardSkeleton, ListSkeleton } from "@/components/skeletons";

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
  const [selectedQR, setSelectedQR] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [trainerFilter, setTrainerFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [classTypeFilter, setClassTypeFilter] = useState("all");

  const { data: registrations = [], isLoading: registrationsLoading } = useRegistrations();
  const { data: checkins = [], isLoading: checkinsLoading } = useCheckins();

  // Get all registrations and map them properly
  const allRegistrations = (registrations || []).map(mapRegistration);

  // Create a set of registration IDs that have check-ins (attended)
  const attendedRegistrationIds = new Set(
    (checkins || []).map((checkin: any) => checkin.registration?.id || checkin.registration_id).filter(Boolean)
  );

  // Categorize registrations by status
  const attendedClasses = allRegistrations.filter((reg: Registration) => {
    return reg.status === 'attended' || attendedRegistrationIds.has(reg.id);
  });

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
    return reg.status === 'absent';
  });

  // Get unique categories and trainers for filter options
  const categories = useMemo(() => {
    const cats = new Set<string>();
    allRegistrations.forEach(reg => {
      if (reg.schedule?.class?.category) {
        cats.add(reg.schedule.class.category);
      }
    });
    return Array.from(cats).sort();
  }, [allRegistrations]);

  const trainers = useMemo(() => {
    const trainerSet = new Set<string>();
    allRegistrations.forEach(reg => {
      if (reg.schedule?.trainer?.firstName && reg.schedule?.trainer?.lastName) {
        trainerSet.add(`${reg.schedule.trainer.firstName} ${reg.schedule.trainer.lastName}`);
      }
    });
    return Array.from(trainerSet).sort();
  }, [allRegistrations]);

  // Enhanced filtering logic
  const filteredRegistrations = useMemo(() => {
    return allRegistrations.filter((registration: Registration) => {
      if (!registration?.schedule?.class || !registration?.schedule?.trainer) return false;
      
      // Search filter
      const matchesSearch = registration.schedule.class.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           registration.schedule.trainer.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           registration.schedule.trainer.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Category filter
      const matchesCategory = categoryFilter === "all" || 
                             registration.schedule.class.category === categoryFilter;
      
      // Trainer filter
      const trainerName = `${registration.schedule.trainer.firstName} ${registration.schedule.trainer.lastName}`;
      const matchesTrainer = trainerFilter === "all" || trainerName === trainerFilter;
      
      // Date filter
      let matchesDate = true;
      if (dateFilter !== "all") {
        const classDate = new Date(registration.schedule.scheduleDate);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        switch (dateFilter) {
          case "today":
            matchesDate = classDate.toDateString() === today.toDateString();
            break;
          case "week":
            matchesDate = classDate >= weekAgo;
            break;
          case "month":
            matchesDate = classDate >= monthAgo;
            break;
          case "past":
            matchesDate = classDate < today;
            break;
          case "upcoming":
            matchesDate = classDate >= today;
            break;
        }
      }
      
      // Class type filter
      let matchesClassType = true;
      if (classTypeFilter !== "all") {
        switch (classTypeFilter) {
          case "attended":
            matchesClassType = registration.status === 'attended' || attendedRegistrationIds.has(Number(registration.id));
            break;
          case "registered":
            matchesClassType = registration.status === 'registered' && 
                              !!registration.schedule && 
                              !!registration.schedule.scheduleDate && 
                              !!registration.schedule.startTime &&
                              (() => {
                                const classDateTime = new Date(registration.schedule.scheduleDate);
                                const [hours, minutes] = registration.schedule.startTime.split(':');
                                classDateTime.setHours(parseInt(hours), parseInt(minutes));
                                return classDateTime > new Date();
                              })();
            break;
          case "cancelled":
            matchesClassType = registration.status === 'cancelled';
            break;
          case "absent":
            matchesClassType = registration.status === 'absent';
            break;
        }
      }
      
      return matchesSearch && matchesCategory && matchesTrainer && matchesDate && matchesClassType;
    });
  }, [allRegistrations, searchTerm, categoryFilter, trainerFilter, dateFilter, classTypeFilter, attendedRegistrationIds]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalClasses = allRegistrations.length;
    const attendanceRate = totalClasses > 0 ? Math.round((attendedClasses.length / totalClasses) * 100) : 0;
    const thisMonth = allRegistrations.filter(reg => {
      const classDate = new Date(reg.schedule.scheduleDate);
      const now = new Date();
      return classDate.getMonth() === now.getMonth() && classDate.getFullYear() === now.getFullYear();
    }).length;
    
    return {
      totalClasses,
      attendanceRate,
      thisMonth,
      favoriteCategory: categories.length > 0 ? categories[0] : "None"
    };
  }, [allRegistrations, attendedClasses.length, categories]);

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
      <Card key={`${classData.id}-${classData.status}`} className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold leading-tight truncate">{classData.schedule.class.name}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground truncate">
                {classData.schedule.trainer.firstName} {classData.schedule.trainer.lastName}
              </p>
            </div>
            <div className="ml-2 flex-shrink-0">
              {getStatusBadge(classData.status)}
            </div>
          </div>
          
          <div className="space-y-3">
            {/* Class Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center text-muted-foreground">
                <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{getDayName(classData.schedule.dayOfWeek)}, {formatDate(classData.schedule.scheduleDate)}</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{formatTime(classData.schedule.startTime)} - {formatTime(classData.schedule.endTime)}</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <User className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{classData.schedule.class.category}</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                {getStatusIcon(classData.status)}
                <span className="ml-2">
                  {isAttended && `Attended: ${formatDateTime(classData.registrationDate)}`}
                  {isRegistered && `Class Date: ${formatDate(classData.schedule.scheduleDate)}`}
                  {isCancelled && `Cancelled: ${formatDate(classData.registrationDate)}`}
                </span>
              </div>
            </div>
            
            {/* QR Code Section */}
            {showQR && isRegistered && classData.qrCode && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <QRGenerator value={classData.qrCode} size={40} />
                  <div>
                    <p className="text-xs font-medium">QR Code Available</p>
                    <p className="text-xs text-muted-foreground">Show for check-in</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedQR(classData.qrCode)}
                  className="h-8"
                >
                  <QrCode className="w-3 h-3 mr-1" />
                  View
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (registrationsLoading || checkinsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2"></div>
            <div className="h-4 w-64 bg-muted rounded animate-pulse"></div>
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} showImage={false} lines={4} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Class History</h1>
          <p className="text-muted-foreground mt-2">
            View all your classes - attended, registered, and cancelled
          </p>
        </div>
        
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search classes, trainers, or categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>
        
        {/* Advanced Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This week</SelectItem>
                  <SelectItem value="month">This month</SelectItem>
                  <SelectItem value="past">Past classes</SelectItem>
                  <SelectItem value="upcoming">Upcoming classes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Trainer</label>
              <Select value={trainerFilter} onValueChange={setTrainerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All trainers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All trainers</SelectItem>
                  {trainers.map(trainer => (
                    <SelectItem key={trainer} value={trainer}>{trainer}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setDateFilter("all");
                  setCategoryFilter("all");
                  setTrainerFilter("all");
                  setClassTypeFilter("all");
                  setSearchTerm("");
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Classes Attended
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{attendedClasses.length}</div>
            <p className="text-xs text-muted-foreground">Total completed classes</p>
            <div className="mt-2 text-xs text-green-600 font-medium">
              {statistics.attendanceRate}% attendance rate
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              Upcoming Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{registeredClasses.length}</div>
            <p className="text-xs text-muted-foreground">Classes you&apos;re registered for</p>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{statistics.thisMonth}</div>
            <p className="text-xs text-muted-foreground">Classes this month</p>
            <div className="mt-2 text-xs text-muted-foreground">
              Favorite: {statistics.favoriteCategory}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-orange-600" />
              Total Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{statistics.totalClasses}</div>
            <p className="text-xs text-muted-foreground">All time classes</p>
            <div className="mt-2 text-xs text-muted-foreground">
              {cancelledClasses.length} cancelled, {absentClasses.length} absent
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Class Type Filter */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Filter by class type:</label>
          <Select value={classTypeFilter} onValueChange={setClassTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              <SelectItem value="attended">Attended</SelectItem>
              <SelectItem value="registered">Registered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Class History Content */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredRegistrations
              .sort((a: Registration, b: Registration) => {
                // Sort by registration date for most types, but by schedule date for registered classes
                if (classTypeFilter === "registered") {
                  return new Date(a.schedule.scheduleDate).getTime() - new Date(b.schedule.scheduleDate).getTime();
                }
                return new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime();
              })
              .map((classData: Registration) => renderClassCard(classData, classData.status === 'registered'))}
          </div>
          {filteredRegistrations.length === 0 && (
            <div className="text-center py-12">
              {classTypeFilter === "attended" && <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />}
              {classTypeFilter === "registered" && <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />}
              {classTypeFilter === "cancelled" && <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />}
              {classTypeFilter === "absent" && <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />}
              {classTypeFilter === "all" && <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />}
              <p className="text-muted-foreground">
                {classTypeFilter === "all" && "No class history found."}
                {classTypeFilter === "attended" && "No attended classes found."}
                {classTypeFilter === "registered" && "No registered classes found."}
                {classTypeFilter === "cancelled" && "No cancelled classes found."}
                {classTypeFilter === "absent" && "No absent classes found."}
              </p>
              <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters or search terms.</p>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {selectedQR && (
        <Dialog open={!!selectedQR} onOpenChange={() => setSelectedQR(null)}>
          <DialogContent className="max-w-[90vw] sm:max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader className="text-center pb-3 sm:pb-4">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">Your QR Code</DialogTitle>
            </DialogHeader>
            
            <div className="flex flex-col items-center space-y-4 sm:space-y-6">
              <div className="relative p-2 sm:p-3 bg-muted/30 rounded-lg">
                <QRGenerator value={selectedQR} size={200} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedQR);
                    // You could add a toast notification here
                  }}
                  className="absolute top-2 right-2 h-8 w-8 p-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="w-full text-center space-y-2">
                <p className="text-sm text-muted-foreground">QR Code Value:</p>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs font-mono break-all text-foreground">{selectedQR}</p>
                </div>
              </div>
              
              <div className="w-full">
                <Button
                  onClick={() => setSelectedQR(null)}
                  className="w-full"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}