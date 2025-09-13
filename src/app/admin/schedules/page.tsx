"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import DataTable from "@/components/data-table";

import { useSchedules } from "@/hooks/useSchedules";
import { useCreateScheduleWithCourses, useUpdateScheduleWithCourses, useDeleteScheduleWithCourses } from "@/hooks/useScheduleWithCourses";
import { useRegistrations } from "@/hooks/useRegistrations";
import { useCheckins } from "@/hooks/useCheckins";
import { useAdminClasses } from "@/hooks/useAdmin";
import { usePlans } from "@/hooks/usePlans";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useTrainers } from "@/hooks/useTrainers";
import { useCourses } from "@/hooks/useCourse";
import { Plus, Search, Edit, Trash2, Calendar, Users, TrendingUp, RepeatIcon, Clock, MapPin, Activity, MoreHorizontal, Eye } from "lucide-react";
import { getDayName, formatTime } from "@/lib/date";
import { TableSkeleton, FormSkeleton } from "@/components/skeletons";

// Utility function for European date formatting (DD/MM/YYYY)
const formatEuropeanDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

interface ScheduleFormData {
  classId: number;
  trainerId: string; // Changed to string to handle UUID
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
function mapScheduleToApi(data: any, classes: any[] = []) {
  const selectedClass = classes.find(c => c.id === Number(data.classId));
  const className = selectedClass?.name || 'Class';
  
  return {
    class_id: data.classId,
    trainer_id: data.trainerId, // Keep as string (UUID)
    day_of_week: data.dayOfWeek,
    start_time: data.startTime,
    end_time: data.endTime,
    max_participants: data.maxParticipants, // Use form value
    is_active: data.isActive ?? true,
    repetition_type: data.repetitionType,
    schedule_date: data.scheduleDate,
    start_date: data.startDate,
    end_date: data.endDate,
  };
}

// Helper function to calculate end time based on start time and class duration
function calculateEndTime(startTime: string, durationMinutes: number): string {
  if (!startTime || !durationMinutes) return '';
  
  // Parse start time (HH:MM format)
  const [hours, minutes] = startTime.split(':').map(Number);
  
  // Convert to total minutes from midnight
  const startMinutes = hours * 60 + minutes;
  
  // Add duration
  const endMinutes = startMinutes + durationMinutes;
  
  // Convert back to HH:MM format
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  
  // Format with leading zeros
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
}

export default function AdminSchedules() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();


  // Data table columns configuration
  const scheduleColumns = [
    {
      key: 'class.name',
      label: 'Class',
      sortable: true,
      width: '200px',
      render: (value: any, row: any) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${row.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-muted-foreground font-mono">
              {row.code || `SCH-${String(row.id).padStart(5, '0')}`}
            </span>
          </div>
          <div className="font-medium text-sm text-foreground truncate" title={row.class?.name || 'Unknown Class'}>
            {row.class?.name || 'Unknown Class'}
          </div>
        </div>
      )
    },
    {
      key: 'trainer',
      label: 'Trainer',
      sortable: true,
      width: '100px',
      render: (value: any, row: any) => (
        <div className="font-medium text-sm text-foreground truncate" title={`${row.trainer?.firstName} ${row.trainer?.lastName}`}>
          {row.trainer?.firstName} {row.trainer?.lastName}
        </div>
      )
    },
    {
      key: 'schedule',
      label: 'Schedule & Repetition',
      sortable: true,
      width: '180px',
      render: (value: any, row: any) => {
        const repetitionType = row.repetitionType || 'weekly';
        
        return (
          <div className="space-y-1">
            <div className="text-sm font-medium text-foreground">
              {formatTime(row.startTime)} - {formatTime(row.endTime)}
            </div>
            <div className="text-xs text-muted-foreground">
              {getRepetitionLabel(repetitionType)}
            </div>
            {/* Date range based on repetition type */}
            {repetitionType === 'once' ? (
              <div className="text-xs text-foreground font-medium">
                {row.schedule_date ? formatEuropeanDate(row.schedule_date) : 
                 row.start_date ? formatEuropeanDate(row.start_date) : 'No date'}
              </div>
            ) : (
              (row.start_date || row.end_date) && (
                <div className="text-xs text-foreground font-medium">
                  {row.start_date ? formatEuropeanDate(row.start_date) : 'No start'} - {row.end_date ? formatEuropeanDate(row.end_date) : 'No end'}
                </div>
              )
            )}
          </div>
        );
      }
    },
    {
      key: 'capacity',
      label: 'Capacity & Attendance',
      sortable: true,
      width: '120px',
      render: (value: any, row: any) => {
        const attendedMembers = getScheduleCheckins(row.id);
        const maxCapacity = row.class?.max_capacity || 0;
        const repetitionCount = row.repetitionType === 'weekly' ? 4 : row.repetitionType === 'daily' ? 30 : 1;
        const adjustedCapacity = maxCapacity * repetitionCount;
        const attendanceRate = adjustedCapacity > 0 
          ? Math.round((attendedMembers.length / adjustedCapacity) * 100)
          : 0;
        
        return (
          <div className="space-y-1">
            <div className="text-sm font-medium text-foreground">
              {maxCapacity} people
            </div>
            <div className="text-xs text-muted-foreground">
              {attendanceRate}% attendance
            </div>
          </div>
        );
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '80px',
      render: (value: any, row: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleViewSchedule(row);
              }}
            >
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            {canEditSchedule(row.id) ? (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(row);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  toast({
                    title: "Cannot Edit Schedule",
                    description: "This schedule has member registrations or check-ins. Please cancel all registrations first.",
                    variant: "destructive"
                  });
                }}
                className="text-muted-foreground"
                disabled
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit (Has Registrations)
              </DropdownMenuItem>
            )}
            {canDeleteSchedule(row.id) ? (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(row);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  const scheduleCourses = courses.filter((course: any) => course.schedule_id === row.id);
                  const courseIds = scheduleCourses.map((course: any) => course.id);
                  const scheduleRegistrations = registrations.filter((reg: any) => 
                    courseIds.includes(reg.course_id)
                  );
                  
                  const params = new URLSearchParams({
                    scheduleId: row.id.toString(),
                    status: 'registered,attended'
                  });
                  window.location.href = `/admin/registrations?${params.toString()}`;
                }}
              >
                <Users className="mr-2 h-4 w-4" />
                View Registrations
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  // Group options for data table
  const groupOptions = [
    { key: 'class.category.name', label: 'Category' },
    { key: 'trainer.firstName', label: 'Trainer' },
    { key: 'repetitionType', label: 'Repetition Type' },
    { key: 'dayOfWeek', label: 'Day of Week' },
    { key: 'is_active', label: 'Status' }
  ];

  // Filter options for data table (will be defined after schedules data)
  const getFilterOptions = (schedulesData: any[]) => [
    {
      key: 'class.category.name',
      label: 'Category',
      type: 'select' as const,
      options: Array.from(new Set(schedulesData?.map((s: any) => s.class?.category?.name).filter(Boolean))).map(name => ({
        value: name,
        label: name
      }))
    },
    {
      key: 'trainer.firstName',
      label: 'Trainer',
      type: 'select' as const,
      options: Array.from(new Set(schedulesData?.map((s: any) => s.trainer?.firstName).filter(Boolean))).map(name => ({
        value: name,
        label: name
      }))
    },
    {
      key: 'repetitionType',
      label: 'Repetition',
      type: 'select' as const,
      options: [
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'once', label: 'Once' }
      ]
    },
    {
      key: 'is_active',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' }
      ]
    }
  ];

  // Navigate to schedule details page
  const handleViewSchedule = (schedule: any) => {
    window.location.href = `/admin/schedules/${schedule.id}`;
  };

  const { data: rawSchedules = [], isLoading, refetch } = useSchedules();

  console.log('Raw schedules from useQuery:', rawSchedules);
  console.log('Raw schedules type:', typeof rawSchedules);
  console.log('Raw schedules length:', Array.isArray(rawSchedules) ? rawSchedules.length : 'not array');

  // Map snake_case fields to camelCase for UI
  const schedules = ((rawSchedules as any[]) || []).map((sch: any) => ({
    ...sch,
    class: sch.classes || sch.class || {}, // Use classes from API response
    classId: Number((sch.classes?.id ?? sch.class?.id ?? sch.class_id)) || 0,
    trainerId: String(sch.trainer?.account_id ?? sch.trainer_id ?? ""),
    startTime: sch.start_time || "",
    endTime: sch.end_time || "",
    scheduleDate: sch.schedule_date ? sch.schedule_date.split('T')[0] : "",
    startDate: sch.start_date ? sch.start_date.split('T')[0] : "",
    endDate: sch.end_date ? sch.end_date.split('T')[0] : "",
    dayOfWeek: Number(sch.day_of_week) || 1,
    repetitionType: sch.repetition_type || "once",
    isActive: Boolean(sch.is_active),
    trainer: sch.trainer ? {
      id: sch.trainer.id,
      firstName: sch.trainer.firstName || sch.trainer.first_name || "",
      lastName: sch.trainer.lastName || sch.trainer.last_name || "",
    } : {
      id: sch.trainer_id,
      firstName: "",
      lastName: "",
    },
  }));
  
  // Debug category data
  console.log('Schedules after transformation:', schedules);
  if (schedules.length > 0) {
    console.log('Schedule count:', schedules.length);
    console.log('First schedule class data:', schedules[0].class);
    console.log('First schedule category data:', schedules[0].class?.category);
    console.log('First schedule trainer data:', schedules[0].trainer);
    console.log('First schedule raw data:', rawSchedules[0]);
  } else {
    console.log('No schedules found after transformation');
    console.log('Raw schedules data:', rawSchedules);
  }

  const { data: registrations = [] } = useRegistrations();
  const { data: checkins = [] } = useCheckins();
  const { data: classes } = useAdminClasses();
  const { data: plans = [] } = usePlans();
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: trainers } = useTrainers();
  const { data: courses = [] } = useCourses();

  const coursesCountBySchedule: Record<number, number> = {};
  ((courses as any[]) || []).forEach((course) => {
    if (course.schedule_id) {
      coursesCountBySchedule[course.schedule_id] = (coursesCountBySchedule[course.schedule_id] || 0) + 1;
    }
  });

  // Flatten trainers to expose firstName and lastName at the top level
  const trainersList = ((trainers as any[]) || []).map((trainer: any) => ({
    id: trainer.id,
    firstName: trainer.first_name || "",
    lastName: trainer.last_name || "",
  }));
  console.log('Trainers list:', trainersList);

  const form = useForm<ScheduleFormData>({
    defaultValues: {
      classId: 0,
      trainerId: "", // Changed to empty string for UUID
      dayOfWeek: 1, // Monday
      startTime: "",
      endTime: "",
      maxParticipants: 10, // Default value, will be updated when class is selected
      repetitionType: "once",
      scheduleDate: new Date().toISOString().split('T')[0],
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isActive: true,
    },
  });

  // Watch for class selection and start time changes to auto-fill end time
  const watchedClassId = form.watch("classId");
  const watchedStartTime = form.watch("startTime");

  useEffect(() => {
    if (watchedClassId && classes) {
      // Find the selected class
      const selectedClass = (classes as any[]).find((cls: any) => cls.id === watchedClassId);
      
      if (selectedClass) {
        // Auto-fill max participants with class capacity
        const currentMaxParticipants = form.getValues("maxParticipants");
        if (!currentMaxParticipants || !editingSchedule) {
          form.setValue("maxParticipants", selectedClass.max_capacity || 10);
        }
        
        // Calculate end time based on class duration
        if (watchedStartTime && selectedClass.duration) {
          const endTime = calculateEndTime(watchedStartTime, selectedClass.duration);
          
          // Only update if the end time field is empty or if we're creating a new schedule
          const currentEndTime = form.getValues("endTime");
          if (!currentEndTime || !editingSchedule) {
            form.setValue("endTime", endTime);
          }
        }
      }
    }
  }, [watchedClassId, watchedStartTime, classes, form, editingSchedule]);

  const createScheduleMutation = useCreateScheduleWithCourses();
  const updateScheduleMutation = useUpdateScheduleWithCourses();
  const deleteScheduleMutation = useDeleteScheduleWithCourses();

  // Handle successful mutations
  useEffect(() => {
    if (createScheduleMutation.isSuccess) {
      setIsModalOpen(false);
      setEditingSchedule(null);
      form.reset({
        classId: 0,
        trainerId: "",
        dayOfWeek: 1,
        startTime: "",
        endTime: "",
        maxParticipants: 10,
        repetitionType: "once",
        scheduleDate: new Date().toISOString().split('T')[0],
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isActive: true,
      });
    }
  }, [createScheduleMutation.isSuccess, form]);

  useEffect(() => {
    if (updateScheduleMutation.isSuccess) {
      setIsModalOpen(false);
      setEditingSchedule(null);
      form.reset({
        classId: 0,
        trainerId: "",
        dayOfWeek: 1,
        startTime: "",
        endTime: "",
        maxParticipants: 10,
        repetitionType: "once",
        scheduleDate: new Date().toISOString().split('T')[0],
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isActive: true,
      });
    }
  }, [updateScheduleMutation.isSuccess, form]);

  const filteredSchedules = schedules?.filter((schedule: any) =>
    `${schedule.class?.name} ${schedule.trainer?.firstName} ${schedule.trainer?.lastName} ${getDayName(schedule.dayOfWeek)}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  ) || [];


  const getScheduleCheckins = (scheduleId: number) => {
    // Ensure checkins is an array before filtering
    if (!Array.isArray(checkins)) {
      return [];
    }
    // Get all courses for this schedule
    const scheduleCourses = courses.filter((course: any) => course.schedule_id === scheduleId);
    const courseIds = scheduleCourses.map((course: any) => course.id);
    
    return checkins.filter((checkin: any) => 
      courseIds.includes(checkin.registration?.course_id)
    );
  };

  const canDeleteSchedule = (scheduleId: number) => {
    // Get all courses for this schedule
    const scheduleCourses = courses.filter((course: any) => course.schedule_id === scheduleId);
    const courseIds = scheduleCourses.map((course: any) => course.id);
    
    // Check if any of these courses have registrations
    const scheduleRegistrations = registrations.filter((reg: any) => 
      courseIds.includes(reg.course_id)
    );
    
    // Check if any of these courses have checkins
    const scheduleCheckins = checkins.filter((checkin: any) => 
      courseIds.includes(checkin.registration?.course_id)
    );
    
    return scheduleRegistrations.length === 0 && scheduleCheckins.length === 0;
  };

  const canEditSchedule = (scheduleId: number) => {
    // Get all courses for this schedule
    const scheduleCourses = courses.filter((course: any) => course.schedule_id === scheduleId);
    const courseIds = scheduleCourses.map((course: any) => course.id);
    
    // Check if any of these courses have registrations
    const scheduleRegistrations = registrations.filter((reg: any) => 
      courseIds.includes(reg.course_id)
    );
    
    // Check if any of these courses have checkins
    const scheduleCheckins = checkins.filter((checkin: any) => 
      courseIds.includes(checkin.registration?.course_id)
    );
    
    return scheduleRegistrations.length === 0 && scheduleCheckins.length === 0;
  };

  const getRepetitionLabel = (type: string) => {
    switch (type) {
      case 'once': return 'One-time';
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      default: return 'Weekly';
    }
  };

  const handleSubmit = (data: ScheduleFormData) => {
    if (editingSchedule) {
      updateScheduleMutation.mutate({ scheduleId: editingSchedule.id, data: mapScheduleToApi(data, classes) });
    } else {
      createScheduleMutation.mutate(mapScheduleToApi(data, classes), {
        onSuccess: (result) => {
          // Navigate to the schedule detail page after successful creation
          if (result?.id) {
            router.push(`/admin/schedules/${result.id}`);
          }
        }
      });
    }
  };

  const handleEdit = (schedule: any) => {
    console.log('Editing schedule:', schedule);
    
    // Check if schedule can be edited
    if (!canEditSchedule(schedule.id)) {
      toast({
        title: "Cannot Edit Schedule",
        description: "This schedule has member registrations or check-ins. Please cancel all registrations first.",
        variant: "destructive"
      });
      return;
    }
    
    setEditingSchedule(schedule);
    form.reset({
      classId: schedule.classId || 0,
      trainerId: schedule.trainerId || "",
      dayOfWeek: schedule.dayOfWeek || 1,
      startTime: schedule.startTime || "",
      endTime: schedule.endTime || "",
      maxParticipants: schedule.maxParticipants || 10,
      repetitionType: schedule.repetitionType || "once",
      scheduleDate: schedule.scheduleDate || "",
      startDate: schedule.startDate || "",
      endDate: schedule.endDate || "",
      isActive: Boolean(schedule.isActive),
    });
    setIsModalOpen(true);
  };

  const handleDelete = (schedule: any) => {
    setScheduleToDelete(schedule);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (scheduleToDelete) {
      deleteScheduleMutation.mutate(scheduleToDelete.id);
    }
  };

  const openCreateModal = () => {
    setEditingSchedule(null);
    form.reset({
      classId: 0,
      trainerId: "",
      dayOfWeek: 1,
      startTime: "",
      endTime: "",
      maxParticipants: 10,
      repetitionType: "once",
      scheduleDate: new Date().toISOString().split('T')[0],
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isActive: true,
    });
    setIsModalOpen(true);
  };

  // --- Mobile Schedule Card ---
  const MobileScheduleCard = ({ schedule, onEdit, onDelete }: { schedule: any, onEdit: (s: any) => void, onDelete: (id: number) => void }) => {
    const attendedMembers = getScheduleCheckins(schedule.id);
    const maxCapacity = schedule.class?.max_capacity || 0;
    const totalAttendance = attendedMembers.length;
    const repetitionCount = schedule.repetitionType === 'weekly' ? 4 : schedule.repetitionType === 'daily' ? 30 : 1;
    const adjustedCapacity = maxCapacity * repetitionCount;
    const attendanceRate = adjustedCapacity > 0 ? Math.round((totalAttendance / adjustedCapacity) * 100) : 0;
    return (
      <Card className="mb-3 shadow-sm border border-gray-200">
        <CardContent className="p-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="space-y-1 mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${schedule.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-xs text-muted-foreground font-mono">
                    {schedule.code || `SCH-${String(schedule.id).padStart(5, '0')}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-base truncate">{schedule.class?.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {schedule.class?.category?.name || 'No Category'}
                  </Badge>
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <RepeatIcon className="w-3 h-3" />
                    {getRepetitionLabel(schedule.repetitionType || 'weekly')}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {schedule.trainer?.firstName} {schedule.trainer?.lastName}
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs">
                    {schedule.scheduleDate ? formatEuropeanDate(schedule.scheduleDate) : getDayName(schedule.dayOfWeek)}
                  </Badge>
                  <span>{formatTime(schedule.startTime)}-{formatTime(schedule.endTime)}</span>
                  <span className="text-xs text-muted-foreground">
                    {getRepetitionLabel(schedule.repetitionType || 'weekly')}
                  </span>
                </div>
                {(() => {
                  const repetitionType = schedule.repetitionType || 'weekly';
                  
                  // For "once" repetition, show only the single date
                  if (repetitionType === 'once') {
                    const singleDate = schedule.schedule_date || schedule.start_date;
                    return singleDate ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span className="text-xs">
                          {formatEuropeanDate(singleDate)}
                        </span>
                      </div>
                    ) : null;
                  }
                  
                  // For other repetition types, show start and end dates with dash
                  if (schedule.start_date || schedule.end_date) {
                    return (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span className="text-xs">
                          {schedule.start_date ? formatEuropeanDate(schedule.start_date) : 'No start'} - {schedule.end_date ? formatEuropeanDate(schedule.end_date) : 'No end'}
                        </span>
                      </div>
                    );
                  }
                  
                  return null;
                })()}
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-muted-foreground" />
                  <span className="font-medium text-foreground">{attendanceRate}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-muted-foreground" />
                  <span className="font-medium">{maxCapacity}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            {canEditSchedule(schedule.id) ? (
              <Button size="icon" variant="ghost" className="border border-border text-primary" onClick={() => onEdit(schedule)}>
                <Edit className="w-4 h-4" />
              </Button>
            ) : (
              <div className="text-xs text-muted-foreground px-2 py-1 bg-gray-100 rounded flex items-center gap-1">
                <Edit className="w-3 h-3" />
                Has registrations
              </div>
            )}
            {canDeleteSchedule(schedule.id) ? (
              <Button size="icon" variant="ghost" className="border border-border text-destructive" onClick={() => onDelete(schedule)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="text-primary hover:text-primary/80"
                onClick={() => {
                  const scheduleCourses = courses.filter((course: any) => course.schedule_id === schedule.id);
                  const courseIds = scheduleCourses.map((course: any) => course.id);
                  const scheduleRegistrations = registrations.filter((reg: any) => 
                    courseIds.includes(reg.course_id)
                  );
                  
                  // Redirect to registrations page with filters
                  const params = new URLSearchParams({
                    scheduleId: schedule.id.toString(),
                    status: 'registered,attended'
                  });
                  window.location.href = `/admin/registrations?${params.toString()}`;
                }}
              >
                View Registrations
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Schedules</h1>
          <p className="text-muted-foreground">Manage class schedule templates</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Add Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingSchedule ? "Edit Schedule" : "Add New Schedule"}</DialogTitle>
              <DialogDescription>
                {editingSchedule ? "Update schedule information" : "Add a new schedule template"}
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
                        <Select onValueChange={value => field.onChange(Number(value))} value={field.value !== undefined ? String(field.value) : ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {((classes as any[]) || []).map((classItem: any) => (
                              <SelectItem key={classItem.id} value={String(classItem.id)}>
                                {classItem.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                        
                        {/* Enhanced Class Info Display */}
                        {selectedClass && (
                          <div className="mt-2 p-4 bg-muted/30 rounded-md border space-y-3">

                            {/* Category & Group Combined */}
                            <div className="flex items-start gap-2 justify-between">
                              <div className="flex items-start gap-2">
                                <div 
                                  className="w-1 h-8 mt-0.5" 
                                style={{ backgroundColor: selectedClass.category?.color || '#6B7280' }}
                              />
                                <div className="flex flex-col">
                                  {selectedClass.category?.group && (
                                    <span 
                                      className="text-xs font-medium"
                                      style={{ color: selectedClass.category.group.color }}
                                    >
                                      {selectedClass.category.group.name}
                                    </span>
                                  )}
                                  <span className="text-sm text-foreground">
                                {selectedClass.category?.name || 'No Category'}
                              </span>
                            </div>
                            </div>
                              {/* Status Pin - Same Line */}
                              <div 
                                className={`w-3 h-3 rounded-full mt-1 ${selectedClass.is_active ? 'bg-green-500' : 'bg-red-500'}`}
                                title={selectedClass.is_active ? 'Active' : 'Inactive'}
                              />
                            </div>

                            {/* Basic Info Grid */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Duration</span>
                                <span className="font-medium">{selectedClass.duration || 0} min</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Capacity</span>
                                <span className="font-medium">{selectedClass.max_capacity || 0} members</span>
                              </div>
                            </div>

                            {/* Description */}
                            {selectedClass.description && (
                              <div className="space-y-1">
                                <span className="text-xs text-muted-foreground font-medium">Description</span>
                                <p className="text-sm text-foreground leading-relaxed">
                                {selectedClass.description}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
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
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select trainer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {trainersList.map((trainer: any) => (
                            <SelectItem key={trainer.id} value={trainer.id}>
                              {trainer.firstName} {trainer.lastName}
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
                  name="repetitionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repetition Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select repetition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="once">Once (Single session)</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
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

                {/* Max Participants */}
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
                              value={field.value || ""}
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

                {/* Date fields based on repetition type */}
                {form.watch("repetitionType") === "once" && (
                  <FormField
                    control={form.control}
                    name="scheduleDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Schedule Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field}  />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {(form.watch("repetitionType") === "daily" || form.watch("repetitionType") === "weekly" || form.watch("repetitionType") === "monthly") && (
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field}  />
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
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field}  />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {form.watch("repetitionType") === "weekly" && (
                  <FormField
                    control={form.control}
                    name="dayOfWeek"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Day of Week</FormLabel>
                        <Select onValueChange={value => field.onChange(Number(value))} value={field.value !== undefined ? String(field.value) : ""}>
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
                )}

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
                  <Button type="submit" disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}>
                    {editingSchedule ? "Update Schedule" : "Create Schedule"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content - Enhanced Data Table */}
      <div className="flex-1 flex flex-col min-h-0">
        <DataTable
          data={schedules || []}
          columns={scheduleColumns}
          groupOptions={groupOptions}
          filterOptions={schedules ? getFilterOptions(schedules) : []}
          loading={isLoading}
          searchable={true}
          selectable={true}
          onRowClick={handleViewSchedule}
          pagination={true}
          pageSize={20}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this schedule? This action will permanently delete all related courses.
            </AlertDialogDescription>
            {scheduleToDelete && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="font-medium text-destructive">
                  {scheduleToDelete.class?.name} - {scheduleToDelete.trainer?.firstName} {scheduleToDelete.trainer?.lastName}
                </div>
                <div className="text-sm text-destructive/80 mt-1">
                  {scheduleToDelete.scheduleDate ? formatEuropeanDate(scheduleToDelete.scheduleDate) : getDayName(scheduleToDelete.dayOfWeek)} • {formatTime(scheduleToDelete.startTime)} - {formatTime(scheduleToDelete.endTime)}
                </div>
                <div className="text-sm text-destructive/80 mt-3 space-y-1">
                  <div>⚠️ <strong>This will delete:</strong></div>
                  <div>• All courses generated from this schedule</div>
                  <div>• Schedule configuration and timing</div>
                  <div className="font-semibold mt-2">This action cannot be undone!</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Note: Schedules with member registrations cannot be deleted. Cancel all registrations first.
                  </div>
                </div>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteScheduleMutation.isPending}
            >
              {deleteScheduleMutation.isPending ? "Deleting..." : "Delete Schedule"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}