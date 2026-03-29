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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";

import { useSchedule, useUpdateSchedule, useDeleteSchedule } from "@/hooks/useSchedules";
import { useClasses } from "@/hooks/useClasses";
import { useTrainers } from "@/hooks/useTrainers";
import { useAdminRegistrations, useAdminCheckins } from "@/hooks/useAdmin";
import { useCourses, useBulkUpdateCourses, useBulkDeleteCourses } from "@/hooks/useCourse";
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
  User,
  ChevronDown,
  ChevronRight,
  UserCheck,
  UserX,
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

function toDateInputValue(v?: string | null) {
  if (!v) return "";
  return String(v).split("T")[0];
}

function mapScheduleToApi(data: ScheduleFormData) {
  const d = (v?: string) => (v && v.trim() !== "" ? v.split("T")[0] : null);
  return {
    class_id: Number(data.classId),
    trainer_id: data.trainerId && data.trainerId.trim() !== "" ? data.trainerId : null,
    day_of_week: data.dayOfWeek,
    start_time: data.startTime,
    end_time: data.endTime,
    max_participants: data.maxParticipants,
    repetition_type: data.repetitionType,
    schedule_date: d(data.scheduleDate ?? ""),
    start_date: d(data.startDate ?? ""),
    end_date: d(data.endDate ?? ""),
    is_active: data.isActive ?? true,
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

const BULK_COURSE_STATUS_STEPS = [
  { api: "scheduled" as const, label: "Scheduled", short: "Sch." },
  { api: "in_progress" as const, label: "In progress", short: "Live" },
  { api: "completed" as const, label: "Completed", short: "Done" },
  { api: "cancelled" as const, label: "Cancelled", short: "Off" },
] as const;

type BulkCourseStatus = (typeof BULK_COURSE_STATUS_STEPS)[number]["api"];

function bulkCourseStatusToIndex(status: string) {
  const i = BULK_COURSE_STATUS_STEPS.findIndex((s) => s.api === status);
  return i >= 0 ? i : 0;
}

function inferBulkStatusFromSelection(selectedIds: number[], allCourses: any[]): BulkCourseStatus {
  const allowed = new Set(["scheduled", "in_progress", "completed", "cancelled"]);
  if (selectedIds.length === 0) return "scheduled";
  const byId = new Map<number, any>(allCourses.map((c: any) => [c.id, c]));
  for (const id of selectedIds) {
    const c = byId.get(id);
    const st = c?.status;
    if (st && allowed.has(st)) return st as BulkCourseStatus;
  }
  return "scheduled";
}

export default function ScheduleDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const scheduleId = params.id as string;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [showTrainerDetails, setShowTrainerDetails] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [bulkCourseOverrides, setBulkCourseOverrides] = useState<{
    status: BulkCourseStatus;
  }>({ status: "scheduled" });

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
  const scheduleRegistrationIds = new Set(
    scheduleRegistrations.map((r: any) => r.id)
  );
  const attendedMembers = checkins.filter((checkin: any) =>
    scheduleRegistrationIds.has(checkin.registration_id)
  );

  const selectedDeletableIds = useMemo(() => {
    return selectedCourseIds.filter((id) => {
      const regs = registrations.filter((r: any) => r.course_id === id);
      if (regs.length > 0) return false;
      const blockedByCheckin = checkins.some((ch: any) => {
        const reg = registrations.find((r: any) => r.id === ch.registration_id);
        return reg?.course_id === id;
      });
      return !blockedByCheckin;
    });
  }, [selectedCourseIds, registrations, checkins]);

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

  const updateScheduleMutation = useUpdateSchedule();
  const bulkUpdateCoursesMutation = useBulkUpdateCourses();
  const bulkDeleteCoursesMutation = useBulkDeleteCourses();

  const toggleCourseSelection = (id: number) => {
    setSelectedCourseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllOnPage = () => {
    const ids = paginatedCourses.map((c: any) => c.id);
    setSelectedCourseIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id: number) => next.add(id));
      return Array.from(next);
    });
  };

  const selectAllFiltered = () => {
    setSelectedCourseIds(filteredCourses.map((c: any) => c.id));
  };

  const clearSelection = () => setSelectedCourseIds([]);

  const clearSelectionOnPage = () => {
    const idsOnPage = new Set(paginatedCourses.map((c: any) => c.id));
    setSelectedCourseIds((prev) => prev.filter((id) => !idsOnPage.has(id)));
  };

  const openBulkEdit = () => {
    if (!schedule) return;
    form.reset({
      classId: schedule.class_id || 0,
      trainerId: schedule.trainer_id || "",
      dayOfWeek: schedule.day_of_week,
      startTime: schedule.start_time,
      endTime: schedule.end_time,
      maxParticipants:
        schedule.max_participants ??
        (schedule.class as { max_capacity?: number } | undefined)?.max_capacity ??
        10,
      repetitionType: schedule.repetition_type || "once",
      scheduleDate: toDateInputValue(schedule.schedule_date),
      startDate: toDateInputValue(schedule.start_date),
      endDate: toDateInputValue(schedule.end_date),
      isActive: schedule.is_active,
    });
    setBulkCourseOverrides({
      status: inferBulkStatusFromSelection(selectedCourseIds, scheduleCourses),
    });
    setBulkEditDialogOpen(true);
  };

  const handleUnifiedSubmit = async (data: ScheduleFormData) => {
    if (scheduleCourses.length > 0 && selectedCourseIds.length === 0) {
      toast({ title: "Select at least one course", variant: "destructive" });
      return;
    }
    try {
      await updateScheduleMutation.mutateAsync({
        scheduleId: Number(scheduleId),
        data: mapScheduleToApi(data),
      });
      if (selectedCourseIds.length > 0) {
        await bulkUpdateCoursesMutation.mutateAsync({
          courseIds: selectedCourseIds,
          changes: { status: bulkCourseOverrides.status },
        });
      }
      setBulkEditDialogOpen(false);
      clearSelection();
    } catch {
      // useUpdateSchedule / mutation hooks surface errors
    }
  };

  const confirmBulkDelete = () => {
    const ids = selectedDeletableIds;
    if (ids.length === 0) return;
    bulkDeleteCoursesMutation.mutate(ids, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: ["schedule", Number(scheduleId)] });
        toast({
          title: res.message,
          variant: res.failed?.length ? "destructive" : "default",
        });
        setBulkDeleteDialogOpen(false);
        clearSelection();
      },
      onError: (err: any) => {
        toast({
          title: err?.message || "Bulk delete failed",
          variant: "destructive",
        });
      },
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

  const canDeleteSchedule =
    scheduleRegistrations.length === 0 && attendedMembers.length === 0;

  const bulkStatusMaxIdx = BULK_COURSE_STATUS_STEPS.length - 1;
  const bulkStatusIdx = bulkCourseStatusToIndex(bulkCourseOverrides.status);
  const bulkStatusTooltipLeftPct =
    bulkStatusMaxIdx === 0 ? 0 : (bulkStatusIdx / bulkStatusMaxIdx) * 100;

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
            {scheduleCourses.length === 0 && (
              <DropdownMenuItem onClick={openBulkEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit schedule
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => {
                const params = new URLSearchParams({
                  scheduleId,
                  status: "registered,attended",
                });
                router.push(`/admin/registrations?${params.toString()}`);
              }}
            >
              <Users className="mr-2 h-4 w-4" />
              View registrations
            </DropdownMenuItem>
            {canDeleteSchedule ? (
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete schedule
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled className="text-muted-foreground">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete schedule (no registrations / check-ins)
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

            {selectedCourseIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-3 p-3 bg-primary/10 rounded-lg border border-border">
                <span className="text-sm font-medium">{selectedCourseIds.length} selected</span>
                <Button size="sm" onClick={openBulkEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit schedule &amp; courses
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={
                    selectedDeletableIds.length !== selectedCourseIds.length ||
                    selectedCourseIds.length === 0
                  }
                  title={
                    selectedDeletableIds.length !== selectedCourseIds.length
                      ? "All selected courses must have zero registrations and check-ins"
                      : undefined
                  }
                  onClick={() => setBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete selected
                </Button>
                <Button size="sm" variant="outline" onClick={selectAllFiltered}>
                  Select all {filteredCourses.length}
                </Button>
                <Button size="sm" variant="ghost" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {paginatedCourses.length > 0 ? (
              <>
                {/* Enhanced Course Table */}
                <div className="space-y-2">
                  {/* Table Header */}
                  <div className="grid grid-cols-[auto_2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_2fr] gap-4 p-3 bg-muted/20 rounded-lg border border-border/50 text-xs font-medium text-muted-foreground items-center">
                    <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={paginatedCourses.length > 0 && paginatedCourses.every((c: any) => selectedCourseIds.includes(c.id))}
                        onCheckedChange={(checked) => (checked ? selectAllOnPage() : clearSelectionOnPage())}
                      />
                    </div>
                    <div>Date & Time</div>
                    <div>Code</div>
                    <div>Capacity</div>
                    <div>Registered</div>
                    <div>Attended</div>
                    <div>Rate</div>
                    <div>Status</div>
                    <div>Active</div>
                    <div>Edited</div>
                    <div>Actions</div>
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
                        className="grid grid-cols-[auto_2fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr_2fr] gap-4 p-3 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer items-center"
                        onClick={() => router.push(`/admin/courses/${course.id}`)}
                      >
                        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedCourseIds.includes(course.id)}
                            onCheckedChange={() => toggleCourseSelection(course.id)}
                          />
                        </div>
                        {/* Date & Time */}
                        <div>
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
                        <div className="flex items-center">
                          <span className="text-xs font-mono text-muted-foreground">
                            {course.code || `CRS-${String(course.id).padStart(5, '0')}`}
                          </span>
                        </div>

                        {/* Capacity */}
                        <div className="flex items-center">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm">{maxCapacity}</span>
                          </div>
                        </div>

                        {/* Registered */}
                        <div className="flex items-center">
                          <div className="flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-blue-500" />
                            <span className="text-sm">{registeredCount}</span>
                          </div>
                        </div>

                        {/* Attended */}
                        <div className="flex items-center">
                          <div className="flex items-center gap-1">
                            <UserX className="w-3 h-3 text-green-500" />
                            <span className="text-sm">{attendedCount}</span>
                          </div>
                        </div>

                        {/* Attendance Rate */}
                        <div className="flex items-center">
                          <div className="flex items-center gap-1">
                            <BarChart3 className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm">{attendanceRate}%</span>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center">
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
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full ${course.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                        </div>

                        {/* Edited Status */}
                        <div className="flex items-center">
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
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
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

      <Dialog open={bulkEditDialogOpen} onOpenChange={setBulkEditDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit schedule &amp; selected courses</DialogTitle>
            <DialogDescription>
              {scheduleCourses.length > 0
                ? `Schedule fields update the template and sync related courses. Course status applies to the ${selectedCourseIds.length} selected course(s).`
                : "This schedule has no courses yet; saving updates the template only."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUnifiedSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="classId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classes?.map((cls: any) => (
                          <SelectItem key={cls.id} value={String(cls.id)}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: cls.category?.color || "#6b7280" }}
                              />
                              <span>{cls.name}</span>
                              {cls.group && (
                                <span className="text-xs text-muted-foreground ml-2">({cls.group.name})</span>
                              )}
                            </div>
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
                name="trainerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trainer</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value)} value={field.value ?? ""}>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start time</FormLabel>
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
                      <FormLabel>End time</FormLabel>
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
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
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

              {form.watch("repetitionType") === "once" && (
                <FormField
                  control={form.control}
                  name="scheduleDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Schedule date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {(form.watch("repetitionType") === "daily" ||
                form.watch("repetitionType") === "weekly" ||
                form.watch("repetitionType") === "monthly") && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <FormField
                control={form.control}
                name="dayOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day of week</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value !== undefined ? String(field.value) : ""}
                    >
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

              <FormField
                control={form.control}
                name="maxParticipants"
                render={({ field }) => {
                  const selectedClassId = form.watch("classId");
                  const selectedClass = (classes as any[])?.find((cls: any) => cls.id === selectedClassId);
                  const classCapacity = selectedClass?.max_capacity || 0;
                  return (
                    <FormItem>
                      <FormLabel>Max participants</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value === "" ? 0 : parseInt(value, 10) || 0);
                            }}
                          />
                          {classCapacity > 0 && (
                            <p className="text-xs text-muted-foreground">Class capacity: {classCapacity}</p>
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
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Schedule active</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        {field.value
                          ? "Schedule is active"
                          : "Schedule is inactive; related courses are deactivated"}
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {scheduleCourses.length > 0 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bulk-ov-status-slider" className="sr-only">
                      Course status
                    </Label>
                    <div className="relative px-1 pb-1 pt-10">
                      <div
                        className="pointer-events-none absolute left-0 top-1 z-10 -translate-x-1/2"
                        style={{ left: `${bulkStatusTooltipLeftPct}%` }}
                        aria-hidden
                      >
                        <span className="inline-block whitespace-nowrap rounded-md border border-border bg-muted/90 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm">
                          {BULK_COURSE_STATUS_STEPS[bulkStatusIdx].label}
                        </span>
                      </div>
                      <Slider
                        id="bulk-ov-status-slider"
                        min={0}
                        max={bulkStatusMaxIdx}
                        step={1}
                        value={[bulkStatusIdx]}
                        onValueChange={(v) =>
                          setBulkCourseOverrides({
                            status: BULK_COURSE_STATUS_STEPS[v[0]].api,
                          })
                        }
                        className="py-3"
                      />
                    </div>
                    <div className="flex justify-between gap-0.5 px-0.5">
                      {BULK_COURSE_STATUS_STEPS.map((s) => (
                        <span
                          key={s.api}
                          className="flex-1 text-center text-[10px] font-medium text-muted-foreground leading-tight"
                        >
                          {s.short}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => setBulkEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateScheduleMutation.isPending || bulkUpdateCoursesMutation.isPending}
                >
                  {updateScheduleMutation.isPending || bulkUpdateCoursesMutation.isPending
                    ? "Saving…"
                    : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedDeletableIds.length} course(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Only courses with no registrations and no check-ins are deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                confirmBulkDelete();
              }}
              disabled={bulkDeleteCoursesMutation.isPending}
            >
              {bulkDeleteCoursesMutation.isPending ? "Deleting…" : "Delete courses"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
