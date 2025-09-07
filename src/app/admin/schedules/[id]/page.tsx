"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";

import { apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Users, 
  TrendingUp, 
  RepeatIcon, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Activity,
  MapPin,
  User
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
  trainerId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
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
    trainer_id: Number(data.trainerId),
    day_of_week: data.dayOfWeek,
    start_time: data.startTime,
    end_time: data.endTime,
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
  
  // Pagination and filtering state for courses
  const [coursesPage, setCoursesPage] = useState(1);
  const [coursesPerPage] = useState(10);
  const [coursesFilter, setCoursesFilter] = useState('all'); // 'all', 'scheduled', 'in_progress', 'completed', 'cancelled'
  const [coursesSearchTerm, setCoursesSearchTerm] = useState('');
  
  const form = useForm<ScheduleFormData>({
    defaultValues: {
      classId: 0,
      trainerId: 0,
      dayOfWeek: 1,
      startTime: "",
      endTime: "",
      repetitionType: "once",
      scheduleDate: "",
      startDate: "",
      endDate: "",
      isActive: true,
    },
  });

  // Fetch schedule details
  const { data: schedule, isLoading: scheduleLoading, error: scheduleError } = useQuery({
    queryKey: ["schedule", scheduleId],
    queryFn: () => apiRequest("GET", `/api/schedules/${scheduleId}`),
    enabled: !!scheduleId,
  });

  // Fetch classes for edit dialog
  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: () => apiRequest("GET", "/api/admin/classes"),
  });

  // Fetch trainers for edit dialog
  const { data: trainers = [] } = useQuery({
    queryKey: ["trainers"],
    queryFn: () => apiRequest("GET", "/api/trainers"),
  });

  // Fetch related data
  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => apiRequest("GET", "/api/courses"),
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ["registrations"],
    queryFn: () => apiRequest("GET", "/api/registrations"),
  });

  const { data: checkins = [] } = useQuery({
    queryKey: ["checkins"],
    queryFn: () => apiRequest("GET", "/api/checkins"),
  });

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
  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ScheduleFormData }) => {
      const apiData = mapScheduleToApi(data);
      return apiRequest("PUT", `/api/schedules/${id}`, apiData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule", scheduleId] });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      setEditDialogOpen(false);
      toast({
        title: "Success",
        description: "Schedule updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update schedule",
        variant: "destructive",
      });
    },
  });

  const handleEdit = () => {
    if (schedule) {
      form.reset({
        classId: schedule.classId || 0,
        trainerId: schedule.trainerId || 0,
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        repetitionType: schedule.repetitionType || "once",
        scheduleDate: schedule.scheduleDate || "",
        startDate: schedule.startDate || "",
        endDate: schedule.endDate || "",
        isActive: schedule.isActive,
      });
      setEditDialogOpen(true);
    }
  };

  const handleSubmit = (data: ScheduleFormData) => {
    updateScheduleMutation.mutate({ id: scheduleId, data });
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await apiRequest("DELETE", `/api/schedules/${scheduleId}`);
      router.push("/admin/schedules");
    } catch (error) {
      console.error("Failed to delete schedule:", error);
    }
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
              <Badge variant="outline" className="font-mono">
                {schedule.code || `SCH-${schedule.id}`}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Schedule ID: {schedule.id} • Created {formatEuropeanDate(schedule.created_at)}
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
            <div className="flex items-start gap-2">
              <div 
                className="w-1 h-8 mt-0.5" 
                style={{ backgroundColor: schedule.class?.category?.color || '#6B7280' }}
              />
              <div className="flex flex-col">
                {schedule.class?.category?.group && (
                  <span 
                    className="text-xs font-medium"
                    style={{ color: schedule.class.category.group.color }}
                  >
                    {schedule.class.category.group.name}
                  </span>
                )}
                <span className="text-sm text-foreground">
                  {schedule.class?.category?.name || 'No Category'}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Duration</span>
                <span className="font-medium">{schedule.class?.duration || 0} min</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Capacity</span>
                <span className="font-medium">{schedule.class?.max_capacity || 0} members</span>
              </div>
            </div>

            {schedule.class?.description && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium">Description</span>
                <p className="text-sm text-foreground leading-relaxed">
                  {schedule.class.description}
                </p>
              </div>
            )}
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
                <span className="text-xs text-muted-foreground font-medium">Schedule Code:</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {schedule.code || `SCH-${schedule.id}`}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  {schedule.scheduleDate ? formatEuropeanDate(schedule.scheduleDate) : getDayName(schedule.dayOfWeek)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <RepeatIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground">
                  {getRepetitionLabel(schedule.repetitionType || 'weekly')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${schedule.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-foreground">
                  {schedule.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {schedule.startDate && schedule.endDate && (
              <div className="pt-3 border-t border-border/50">
                <span className="text-xs text-muted-foreground font-medium">Date Range</span>
                <div className="text-sm text-foreground">
                  {formatEuropeanDate(schedule.startDate)} - {formatEuropeanDate(schedule.endDate)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trainer Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5" />
              Trainer Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {schedule.trainer?.firstName} {schedule.trainer?.lastName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{schedule.trainer?.email}</span>
              </div>
              {schedule.trainer?.phone && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{schedule.trainer.phone}</span>
                </div>
              )}
            </div>
            
            {(schedule.trainer?.specialization || schedule.trainer?.experience_years) && (
              <div className="pt-3 border-t border-border/50 space-y-2">
                {schedule.trainer?.specialization && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Specialization:</span>
                    <span className="font-medium text-foreground">{schedule.trainer.specialization}</span>
                  </div>
                )}
                {schedule.trainer?.experience_years && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Experience:</span>
                    <span className="font-medium text-foreground">{schedule.trainer.experience_years} years</span>
                  </div>
                )}
              </div>
            )}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/30 rounded-lg border border-border">
              <div className="text-2xl font-bold text-foreground">{scheduleCourses.length}</div>
              <div className="text-sm text-muted-foreground">Total Courses</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg border border-border">
              <div className="text-2xl font-bold text-foreground">{scheduleRegistrations.length}</div>
              <div className="text-sm text-muted-foreground">Total Registrations</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg border border-border">
              <div className="text-2xl font-bold text-foreground">{attendedMembers.length}</div>
              <div className="text-sm text-muted-foreground">Attended Members</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg border border-border">
              <div className="text-2xl font-bold text-foreground">
                {scheduleRegistrations.length > 0 
                  ? Math.round((attendedMembers.length / scheduleRegistrations.length) * 100)
                  : 0}%
              </div>
              <div className="text-sm text-muted-foreground">Attendance Rate</div>
            </div>
          </div>
          
          {/* Additional Details */}
          <div className="mt-6 pt-4 border-t border-border/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max Capacity:</span>
                <span className="font-medium text-foreground">{schedule.class?.max_capacity || 0} members</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Class Duration:</span>
                <span className="font-medium text-foreground">{schedule.class?.duration || 0} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Repetition:</span>
                <span className="font-medium text-foreground">{getRepetitionLabel(schedule.repetitionType || 'weekly')}</span>
              </div>
            </div>
          </div>
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
                <div className="space-y-3">
                  {paginatedCourses.map((course: any) => {
                    // Get course-specific data
                    const courseRegistrations = registrations.filter((reg: any) => reg.course_id === course.id);
                    const courseCheckins = checkins.filter((checkin: any) => 
                      courseRegistrations.some((reg: any) => reg.id === checkin.registration_id)
                    );
                    const registeredCount = courseRegistrations.length;
                    const attendedCount = courseCheckins.length;
                    const maxCapacity = course.max_participants || schedule.class?.max_capacity || 0;
                    const attendanceRate = registeredCount > 0 ? Math.round((attendedCount / registeredCount) * 100) : 0;
                    const capacityRate = maxCapacity > 0 ? Math.round((registeredCount / maxCapacity) * 100) : 0;

                    return (
                      <div key={course.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-foreground">
                                {formatEuropeanDate(course.course_date)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {formatTime(course.start_time)} - {formatTime(course.end_time)}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                              <span>ID: {course.id}</span>
                              <span>{registeredCount}/{maxCapacity} registered</span>
                              <span>{attendedCount} attended</span>
                              <span>{attendanceRate}% attendance</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {/* Capacity Bar */}
                          <div className="w-16">
                            <div className="text-xs text-muted-foreground mb-1 text-center">
                              {capacityRate}%
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div 
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                  capacityRate >= 100 ? 'bg-red-500' : 
                                  capacityRate >= 80 ? 'bg-yellow-500' : 
                                  'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(capacityRate, 100)}%` }}
                              />
                            </div>
                          </div>
                          
                          {/* Status Badge */}
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant={course.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                              {course.status}
                            </Badge>
                            {course.is_active === false && (
                              <Badge variant="destructive" className="text-xs">Inactive</Badge>
                            )}
                          </div>
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
                    <Select onValueChange={value => field.onChange(Number(value))} value={String(field.value)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select trainer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {trainers?.map((trainer: any) => (
                          <SelectItem key={trainer.id} value={String(trainer.id)}>
                            {trainer.first_name} {trainer.last_name}
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
