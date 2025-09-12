"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";

import { useSchedule, useUpdateSchedule, useDeleteSchedule } from "@/hooks/useSchedules";
import { useClasses } from "@/hooks/useClasses";
import { useTrainers } from "@/hooks/useTrainers";
import { useAdminRegistrations, useAdminCheckins } from "@/hooks/useAdmin";
import { useCourses } from "@/hooks/useCourse";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Users, 
  TrendingUp, 
  RepeatIcon, 
  MoreHorizontal,
  AlertTriangle, 
  Edit, 
  Trash2, 
  Activity,
  MapPin,
  User,
  ChevronDown,
  ChevronRight,
  UserCheck,
  UserX,
  Settings,
  BarChart3
} from "lucide-react";
import { getDayName, formatTime } from "@/lib/date";
import { useToast } from "@/hooks/use-toast";

// Utility function for European date formatting (DD/MM/YYYY)
const formatEuropeanDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

interface ScheduleFormData {
  classId: number;
  trainerId: string; // Changed to string for UUID
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  maxParticipants: number;
  repetitionType: string;
  scheduleDate?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

// Helper to map camelCase to snake_case for API
function mapScheduleToApi(data: any) {
  return {
    class_id: Number(data.classId),
    trainer_id: String(data.trainerId),
    day_of_week: data.dayOfWeek,
    start_time: data.startTime,
    end_time: data.endTime,
    max_participants: data.maxParticipants,
    repetition_type: data.repetitionType,
    schedule_date: data.scheduleDate,
    start_date: data.startDate,
    end_date: data.endDate,
    is_active: data.isActive,
  };
}

const getRepetitionLabel = (type: string) => {
  switch (type) {
    case 'daily': return 'Daily';
    case 'weekly': return 'Weekly';
    case 'monthly': return 'Monthly';
    case 'once': return 'Once';
    default: return 'Weekly';
  }
};

export default function ScheduleDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const scheduleId = params.id as string;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [showTrainerDetails, setShowTrainerDetails] = useState(false);
  
  // Pagination and filtering state for courses
  const [coursesPage, setCoursesPage] = useState(1);
  const [coursesPerPage] = useState(10);
  const [coursesFilter, setCoursesFilter] = useState('all'); // 'all', 'scheduled', 'in_progress', 'completed', 'cancelled'
  const [coursesSearchTerm, setCoursesSearchTerm] = useState('');
  
  const form = useForm<ScheduleFormData>({
    defaultValues: {
      classId: 0,
      trainerId: "",
      dayOfWeek: 1,
      startTime: "",
      endTime: "",
      maxParticipants: 10,
      repetitionType: "once",
      scheduleDate: "",
      startDate: "",
      endDate: "",
      isActive: true,
    },
  });

  // Fetch schedule details
  const { data: schedule, isLoading: scheduleLoading, error: scheduleError } = useSchedule(Number(scheduleId));

  // Fetch classes for edit dialog
  const { data: classes = [] } = useClasses();

  // Fetch trainers for edit dialog
  const { data: trainers = [] } = useTrainers();

  // Fetch related data
  const { data: courses = [] } = useCourses();

  const { data: registrations = [] } = useAdminRegistrations();

  const { data: checkins = [] } = useAdminCheckins();

  // Get schedule-specific data
  const scheduleCourses = courses.filter((course: any) => course.schedule_id?.toString() === scheduleId);
  const courseIds = scheduleCourses.map((course: any) => course.id);
  const scheduleRegistrations = registrations.filter((reg: any) => 
    courseIds.includes(reg.course_id)
  );
  const attendedMembers = checkins.filter((checkin: any) => 
    courseIds.includes(checkin.course_id)
  );

  // Filtered and paginated courses
  const filteredCourses = useMemo(() => {
    let filtered = scheduleCourses;

    // Filter by status
    if (coursesFilter !== 'all') {
      filtered = filtered.filter((course: any) => course.status === coursesFilter);
    }

    // Filter by search term (date, time, course ID, or status)
    if (coursesSearchTerm) {
      const searchLower = coursesSearchTerm.toLowerCase();
      filtered = filtered.filter((course: any) => 
        formatEuropeanDate(course.course_date).toLowerCase().includes(searchLower) ||
        formatTime(course.start_time).toLowerCase().includes(searchLower) ||
        formatTime(course.end_time).toLowerCase().includes(searchLower) ||
        course.id.toString().includes(searchLower) ||
        course.status.toLowerCase().includes(searchLower)
      );
    }

    // Sort by date (most recent first)
    return filtered.sort((a: any, b: any) => 
      new Date(b.course_date).getTime() - new Date(a.course_date).getTime()
    );
  }, [scheduleCourses, coursesFilter, coursesSearchTerm]);

  // Paginated courses
  const paginatedCourses = useMemo(() => {
    const startIndex = (coursesPage - 1) * coursesPerPage;
    const endIndex = startIndex + coursesPerPage;
    return filteredCourses.slice(startIndex, endIndex);
  }, [filteredCourses, coursesPage, coursesPerPage]);

  // Pagination info
  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);

  // Update schedule mutation
  const updateScheduleMutation = useUpdateSchedule();

  const handleEdit = () => {
    if (schedule) {
      form.reset({
        classId: schedule.class_id || 0,
        trainerId: schedule.trainer_id || "",
        dayOfWeek: schedule.day_of_week,
        startTime: schedule.start_time,
        endTime: schedule.end_time,
        maxParticipants: schedule.max_participants || 10,
        repetitionType: schedule.repetition_type || "once",
        scheduleDate: schedule.schedule_date || "",
        startDate: schedule.start_date || "",
        endDate: schedule.end_date || "",
        isActive: schedule.is_active,
      });
      setEditDialogOpen(true);
    }
  };

  const handleSubmit = (data: ScheduleFormData) => {
    const apiData = mapScheduleToApi(data);
    updateScheduleMutation.mutate({ 
      scheduleId: Number(scheduleId), 
      data: apiData 
    }, {
      onSuccess: () => {
        setEditDialogOpen(false);
      }
    });
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const deleteScheduleMutation = useDeleteSchedule();

  const confirmDelete = () => {
    deleteScheduleMutation.mutate(Number(scheduleId), {
      onSuccess: () => {
        router.push("/admin/schedules");
      }
    });
  };

  const canDeleteSchedule = (scheduleId: string) => {
    return scheduleCourses.length === 0;
  };

  // Pagination handlers
  const handleCoursesPageChange = (newPage: number) => {
    setCoursesPage(newPage);
  };

  const handleCoursesFilterChange = (newFilter: string) => {
    setCoursesFilter(newFilter);
    setCoursesPage(1); // Reset to first page when filter changes
  };

  const handleCoursesSearchChange = (searchTerm: string) => {
    setCoursesSearchTerm(searchTerm);
    setCoursesPage(1); // Reset to first page when search changes
  };

  if (scheduleLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading schedule details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (scheduleError || !schedule) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Schedule Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The schedule with ID {scheduleId} doesn't exist or has been deleted.
          </p>
          <div className="space-y-2">
            <Button onClick={() => router.push("/admin/schedules")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Schedules
            </Button>
            <div className="text-sm text-muted-foreground">
              Or <button 
                onClick={() => router.push("/admin/schedules")}
                className="text-primary hover:underline"
              >
                create a new schedule
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/admin/schedules")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Schedules
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{schedule.class?.name || 'Unknown Class'}</h1>
              <Badge variant={schedule.is_active ? 'default' : 'secondary'} className="text-xs">
                {schedule.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {schedule.code || `SCH-${String(schedule.id).padStart(5, '0')}`}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Created {formatEuropeanDate(schedule.created_at)}
            </p>
          </div>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4 mr-2" />
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                handleEdit();
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Schedule
            </DropdownMenuItem>
            {canDeleteSchedule(scheduleId) ? (
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Schedule
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => {
                  const params = new URLSearchParams({
                    scheduleId: scheduleId,
                    status: 'registered,attended'
                  });
                  router.push(`/admin/registrations?${params.toString()}`);
                }}
              >
                <Users className="mr-2 h-4 w-4" />
                View Registrations
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Schedule Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Class Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Class Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {schedule.class?.name || 'Unknown Class'}
                </span>
              </div>
              
              <div className="flex items-start gap-2">
                <div 
                  className="w-1 h-8 mt-0.5" 
                  style={{ backgroundColor: schedule.class?.category?.color || '#6B7280' }}
                />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Category</span>
                  <span className="text-sm text-foreground">
                    {schedule.class?.category?.name || 'No Category'}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Capacity</span>
                  <span className="font-medium">{schedule.max_participants || (schedule.class as any)?.max_capacity || 0} members</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">Duration</span>
                  <span className="font-medium">{(schedule.class as any)?.duration || 'N/A'} min</span>
                </div>
              </div>
              
              {(schedule.class as any)?.description && (
                <div className="pt-2 border-t border-border/50">
                  <span className="text-xs text-muted-foreground font-medium">Description</span>
                  <p className="text-sm text-foreground mt-1 leading-relaxed">
                    {(schedule.class as any).description}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Schedule Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Schedule Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  {schedule.schedule_date ? formatEuropeanDate(schedule.schedule_date) : getDayName(schedule.day_of_week)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <RepeatIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  {getRepetitionLabel(schedule.repetition_type || 'weekly')}
                </span>
              </div>
            </div>

            {schedule.start_date && schedule.end_date && (
              <div className="pt-3 border-t border-border/50">
                <span className="text-xs text-muted-foreground font-medium">Date Range</span>
                <div className="text-sm text-foreground">
                  {formatEuropeanDate(schedule.start_date)} - {formatEuropeanDate(schedule.end_date)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trainer Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Trainer Details
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTrainerDetails(!showTrainerDetails)}
                className="h-8 w-8 p-0"
              >
                {showTrainerDetails ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {(schedule.trainer as any)?.firstName || schedule.trainer?.first_name} {(schedule.trainer as any)?.lastName || schedule.trainer?.last_name}
                </span>
                <Badge variant={(schedule.trainer as any)?.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                  {(schedule.trainer as any)?.status || 'Unknown'}
                </Badge>
              </div>
              
              {(schedule.trainer as any)?.specialization && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Specialization:</span>
                  <span className="text-sm text-foreground">{(schedule.trainer as any).specialization}</span>
                </div>
              )}
              
              {showTrainerDetails && (
                <>
                  {(schedule.trainer as any)?.experience_years && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Experience:</span>
                      <span className="text-sm text-foreground">{(schedule.trainer as any).experience_years} years</span>
                    </div>
                  )}
                  
                  {(schedule.trainer as any)?.hourly_rate && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Rate:</span>
                      <span className="text-sm text-foreground">{(schedule.trainer as any).hourly_rate} TND/hour</span>
                    </div>
                  )}
                  
                  {(schedule.trainer as any)?.phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Phone:</span>
                      <span className="text-sm text-foreground">{(schedule.trainer as any).phone}</span>
                    </div>
                  )}
                  
                  {(schedule.trainer as any)?.email && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Email:</span>
                      <span className="text-sm text-foreground">{(schedule.trainer as any).email}</span>
                    </div>
                  )}
                  
                  {(schedule.trainer as any)?.bio && (
                    <div className="pt-3 border-t border-border/50">
                      <span className="text-xs text-muted-foreground font-medium">Bio</span>
                      <p className="text-sm text-foreground mt-1 leading-relaxed">
                        {(schedule.trainer as any).bio}
                      </p>
                    </div>
                  )}
                  
                  {(schedule.trainer as any)?.certification && (
                    <div className="pt-3 border-t border-border/50">
                      <span className="text-xs text-muted-foreground font-medium">Certifications</span>
                      <p className="text-sm text-foreground mt-1">
                        {(schedule.trainer as any).certification}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Statistics & Performance
          </CardTitle>
        </CardHeader>
        <CardContent>        
          {/* Course Status Breakdown */}
          {scheduleCourses.length > 0 && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {scheduleCourses.filter((c: any) => c.status === 'scheduled').length}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">Scheduled</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                    {scheduleCourses.filter((c: any) => c.status === 'in_progress').length}
                  </div>
                  <div className="text-xs text-yellow-600 dark:text-yellow-400">In Progress</div>
                </div>
                <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {scheduleCourses.filter((c: any) => c.status === 'completed').length}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">Completed</div>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="text-lg font-bold text-red-600 dark:text-red-400">
                    {scheduleCourses.filter((c: any) => c.status === 'cancelled').length}
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-400">Cancelled</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Courses */}
      {scheduleCourses.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Courses ({filteredCourses.length})
                </CardTitle>
                <CardDescription>
                  All courses for this schedule
                </CardDescription>
              </div>
            </div>
            
            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by date, time, course ID, or status..."
                  value={coursesSearchTerm}
                  onChange={(e) => handleCoursesSearchChange(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <Select value={coursesFilter} onValueChange={handleCoursesFilterChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {paginatedCourses.length > 0 ? (
              <>
                {/* Enhanced Course Table */}
                <div className="space-y-2">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-4 p-3 bg-muted/20 rounded-lg border border-border/50 text-xs font-medium text-muted-foreground">
                    <div className="col-span-2">Date & Time</div>
                    <div className="col-span-1">Code</div>
                    <div className="col-span-1">Capacity</div>
                    <div className="col-span-1">Registered</div>
                    <div className="col-span-1">Attended</div>
                    <div className="col-span-1">Rate</div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-1">Active</div>
                    <div className="col-span-1">Edited</div>
                    <div className="col-span-2">Actions</div>
                  </div>

                  {/* Course Rows */}
                  {paginatedCourses.map((course: any) => {
                    // Get course-specific data
                    const courseRegistrations = registrations.filter((reg: any) => reg.course_id === course.id);
                    const courseCheckins = checkins.filter((checkin: any) => 
                      courseRegistrations.some((reg: any) => reg.id === checkin.registration_id)
                    );
                    const registeredCount = courseRegistrations.length;
                    const attendedCount = courseCheckins.length;
                    const maxCapacity = course.max_participants || schedule.max_participants || 0;
                    const attendanceRate = registeredCount > 0 ? Math.round((attendedCount / registeredCount) * 100) : 0;
                    const capacityRate = maxCapacity > 0 ? Math.round((registeredCount / maxCapacity) * 100) : 0;

                    return (
                      <div 
                        key={course.id} 
                        className="grid grid-cols-12 gap-4 p-3 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/admin/courses/${course.id}`)}
                      >
                        {/* Date & Time */}
                        <div className="col-span-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium text-sm text-foreground">
                                {formatEuropeanDate(course.course_date)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatTime(course.start_time)} - {formatTime(course.end_time)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Course Code */}
                        <div className="col-span-1 flex items-center">
                          <span className="text-xs font-mono text-muted-foreground">
                            {course.code || `CRS-${String(course.id).padStart(5, '0')}`}
                          </span>
                        </div>

                        {/* Capacity */}
                        <div className="col-span-1 flex items-center">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm">{maxCapacity}</span>
                          </div>
                        </div>

                        {/* Registered */}
                        <div className="col-span-1 flex items-center">
                          <div className="flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-blue-500" />
                            <span className="text-sm">{registeredCount}</span>
                          </div>
                        </div>

                        {/* Attended */}
                        <div className="col-span-1 flex items-center">
                          <div className="flex items-center gap-1">
                            <UserX className="w-3 h-3 text-green-500" />
                            <span className="text-sm">{attendedCount}</span>
                          </div>
                        </div>

                        {/* Attendance Rate */}
                        <div className="col-span-1 flex items-center">
                          <div className="flex items-center gap-1">
                            <BarChart3 className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm">{attendanceRate}%</span>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="col-span-1 flex items-center">
                          <Badge 
                            variant={
                              course.status === 'completed' ? 'default' : 
                              course.status === 'in_progress' ? 'secondary' :
                              course.status === 'cancelled' ? 'destructive' : 'outline'
                            } 
                            className="text-xs"
                          >
                            {course.status}
                          </Badge>
                        </div>

                        {/* Active Status */}
                        <div className="col-span-1 flex items-center">
                          <div className={`w-2 h-2 rounded-full ${course.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                        </div>

                        {/* Edited Status */}
                        <div className="col-span-1 flex items-center">
                          {course.isEdited ? (
                            <Badge variant="outline" className="text-orange-600 border-orange-200 text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Yes
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">No</span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="col-span-2 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/courses/${course.id}`} className="flex items-center gap-2">
                                  <Activity className="w-4 h-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/courses/${course.id}`} className="flex items-center gap-2">
                                  <Edit className="w-4 h-4" />
                                  Edit Course
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/registrations?courseId=${course.id}`} className="flex items-center gap-2">
                                  <Users className="w-4 h-4" />
                                  View Registrations
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/checkins?courseId=${course.id}`} className="flex items-center gap-2">
                                  <Activity className="w-4 h-4" />
                                  View Check-ins
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-border/50">
                    <div className="text-sm text-muted-foreground">
                      Showing {((coursesPage - 1) * coursesPerPage) + 1} to {Math.min(coursesPage * coursesPerPage, filteredCourses.length)} of {filteredCourses.length} courses
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCoursesPageChange(coursesPage - 1)}
                        disabled={coursesPage === 1}
                      >
                        Previous
                      </Button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = i + 1;
                          const isActive = pageNum === coursesPage;
                          return (
                            <Button
                              key={pageNum}
                              variant={isActive ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleCoursesPageChange(pageNum)}
                              className="w-8 h-8 p-0"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                        {totalPages > 5 && (
                          <>
                            <span className="text-sm text-muted-foreground">...</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCoursesPageChange(totalPages)}
                              className="w-8 h-8 p-0"
                            >
                              {totalPages}
                            </Button>
                          </>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCoursesPageChange(coursesPage + 1)}
                        disabled={coursesPage === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No courses found matching your criteria</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCoursesFilter('all');
                    setCoursesSearchTerm('');
                    setCoursesPage(1);
                  }}
                  className="mt-2"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Schedule Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
            <DialogDescription>
              Update schedule information
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="classId"
                render={({ field }) => {
                  const selectedClass = classes ? (classes as any[]).find((cls: any) => cls.id === field.value) : null;
                  
                  return (
                    <FormItem>
                      <FormLabel>Class</FormLabel>
                      <Select onValueChange={value => field.onChange(Number(value))} value={String(field.value)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classes?.map((cls: any) => (
                            <SelectItem key={cls.id} value={String(cls.id)}>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: cls.category?.color || '#6b7280' }}
                                  />
                                  <span>{cls.name}</span>
                                </div>
                                {cls.group && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    ({cls.group.name})
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="trainerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trainer</FormLabel>
                    <Select onValueChange={value => field.onChange(value)} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select trainer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {trainers?.map((trainer: any) => (
                          <SelectItem key={trainer.id} value={trainer.id}>
                            {trainer.firstName || trainer.first_name} {trainer.lastName || trainer.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dayOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day of Week</FormLabel>
                    <Select onValueChange={value => field.onChange(Number(value))} value={String(field.value)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select day of week" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">Sunday</SelectItem>
                        <SelectItem value="1">Monday</SelectItem>
                        <SelectItem value="2">Tuesday</SelectItem>
                        <SelectItem value="3">Wednesday</SelectItem>
                        <SelectItem value="4">Thursday</SelectItem>
                        <SelectItem value="5">Friday</SelectItem>
                        <SelectItem value="6">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="maxParticipants"
                render={({ field }) => {
                  const selectedClassId = form.watch("classId");
                  const selectedClass = classes?.find((cls: any) => cls.id === selectedClassId);
                  const classCapacity = selectedClass?.max_capacity || 0;
                  
                  return (
                    <FormItem>
                      <FormLabel>Max Participants</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Input 
                            type="number" 
                            min="1" 
                            max="100" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                          {classCapacity > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Class capacity: {classCapacity} participants
                            </p>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="repetitionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repetition</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select repetition type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="once">Once</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Active Status Toggle */}
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Active Status
                      </FormLabel>
                      <div className="text-sm text-muted-foreground">
                        {field.value ? "Schedule is active and courses can be created" : "Schedule is inactive and courses will be deactivated"}
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={updateScheduleMutation.isPending}>
                  {updateScheduleMutation.isPending ? "Updating..." : "Update Schedule"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this schedule? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Schedule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
