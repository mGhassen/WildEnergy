"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";

import { apiRequest } from "@/lib/queryClient";
import { Plus, Search, Edit, Trash2, Calendar, Users, TrendingUp, RepeatIcon } from "lucide-react";
import { getDayName, formatTime } from "@/lib/date";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const { data: rawSchedules = [], isLoading, refetch } = useQuery({
    queryKey: ["schedules"],
    queryFn: async () => {
      console.log('Schedules queryFn called');
      const result = await apiRequest("GET", "/api/schedules");
      console.log('Schedules queryFn result:', result);
      return result;
    },
    staleTime: 0, // Always consider data stale
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  console.log('Raw schedules from API:', rawSchedules);

  // Map snake_case fields to camelCase for UI
  const schedules = ((rawSchedules as any[]) || []).map((sch: any) => ({
    ...sch,
    class: sch.class || sch.classes || {}, // Ensure .class is always present
    classId: Number((sch.class?.id ?? sch.classes?.id ?? sch.class_id)),
    trainerId: Number(sch.trainer?.user_id ?? sch.trainer_id),
    startTime: sch.start_time,
    endTime: sch.end_time,
    scheduleDate: sch.schedule_date ? sch.schedule_date.split('T')[0] : "",
    startDate: sch.start_date ? sch.start_date.split('T')[0] : "",
    endDate: sch.end_date ? sch.end_date.split('T')[0] : "",
    dayOfWeek: Number(sch.day_of_week),
    repetitionType: sch.repetition_type,
    isActive: sch.is_active,
    trainer: sch.trainer ? {
      id: sch.trainer.id,
      firstName: sch.trainer.first_name || "",
      lastName: sch.trainer.last_name || "",
    } : {
      id: sch.trainer_id,
      firstName: "",
      lastName: "",
    },
  }));
  console.log('Transformed schedules:', schedules);

  const { data: registrations = [] } = useQuery({
    queryKey: ["registrations"],
    queryFn: () => apiRequest("GET", "/api/registrations"),
  });

  const { data: checkins = [] } = useQuery({
    queryKey: ["checkins"],
    queryFn: () => apiRequest("GET", "/api/checkins"),
  });

  const { data: classes } = useQuery({
    queryKey: ["admin", "classes"],
    queryFn: () => apiRequest("GET", "/api/admin/classes"),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["plans"],
    queryFn: () => apiRequest("GET", "/api/plans"),
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: () => apiRequest("GET", "/api/subscriptions"),
  });

  const { data: trainers } = useQuery({
    queryKey: ["trainers"],
    queryFn: () => apiRequest("GET", "/api/trainers"),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: () => apiRequest("GET", "/api/courses"),
  });

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
      trainerId: 0,
      dayOfWeek: 1, // Monday
      startTime: "",
      endTime: "",
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
    if (watchedClassId && watchedStartTime && classes) {
      // Find the selected class
      const selectedClass = (classes as any[]).find((cls: any) => cls.id === watchedClassId);
      
      if (selectedClass && selectedClass.duration) {
        // Calculate end time based on class duration
        const endTime = calculateEndTime(watchedStartTime, selectedClass.duration);
        
        // Only update if the end time field is empty or if we're creating a new schedule
        const currentEndTime = form.getValues("endTime");
        if (!currentEndTime || !editingSchedule) {
          form.setValue("endTime", endTime);
        }
      }
    }
  }, [watchedClassId, watchedStartTime, classes, form, editingSchedule]);

  const createScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      console.log('Creating schedule:', data);
      const result = await apiRequest("POST", "/api/schedules", mapScheduleToApi(data));
      console.log('Create schedule response:', result);
      return result;
    },
    onSuccess: async (data) => {
      console.log('Create schedule mutation succeeded, invalidating queries...');
      // Generate courses for the new schedule
      if (data?.schedule?.id) {
        try {
          const genResult = await apiRequest("POST", `/api/schedules/${data.schedule.id}`);
          console.log('Course generation result:', genResult);
        } catch (err) {
          toast({ title: "Failed to generate courses for schedule", variant: "destructive" });
        }
      }
      // Clear all queries and refetch
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      // Force a refetch to ensure we get the latest data
      setTimeout(() => refetch(), 100);
      setIsModalOpen(false);
      form.reset({
        classId: 0,
        trainerId: 0,
        dayOfWeek: 1,
        startTime: "",
        endTime: "",
        repetitionType: "once",
        scheduleDate: new Date().toISOString().split('T')[0],
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        isActive: true,
      });
      toast({ title: "Schedule created successfully" });
    },
    onError: (error) => {
      console.error('Create schedule mutation error:', error);
      toast({ 
        title: "Error creating schedule", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ScheduleFormData }) => {
      console.log('Updating schedule:', { id, data });
      const result = await apiRequest("PUT", `/api/schedules/${id}`, mapScheduleToApi(data));
      console.log('Update schedule response:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Update schedule mutation succeeded, invalidating queries...');
      // Clear all queries and refetch
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      // Force a refetch to ensure we get the latest data
      setTimeout(() => refetch(), 100);
      setIsModalOpen(false);
      setEditingSchedule(null);
      form.reset();
      toast({ title: "Schedule updated successfully" });
    },
    onError: (error) => {
      console.error('Update schedule mutation error:', error);
      toast({ 
        title: "Error updating schedule", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log('Deleting schedule:', id);
      const result = await apiRequest("DELETE", `/api/schedules/${id}`);
      console.log('Delete schedule response:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Delete schedule mutation succeeded, invalidating queries...');
      // Clear all queries and refetch
      queryClient.clear();
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      // Force a refetch to ensure we get the latest data
      setTimeout(() => refetch(), 100);
      
      // Show success message with course counts
      const courseCount = data.deletedCourses || 0;
      const activeCourseCount = data.activeCourses || 0;
      const scheduleName = data.scheduleName || 'Schedule';
      
      toast({ 
        title: "Schedule deleted successfully",
        description: `Deleted ${scheduleName} and ${courseCount} related course${courseCount !== 1 ? 's' : ''} (${activeCourseCount} active)`
      });
      
      // Close dialog
      setDeleteDialogOpen(false);
      setScheduleToDelete(null);
    },
    onError: (error) => {
      console.error('Delete schedule mutation error:', error);
      
      // Handle specific error for schedules with registrations
      if (error.message?.includes('Cannot delete schedule with existing registrations')) {
        const details = (error as any).details || {};
        toast({ 
          title: "Cannot Delete Schedule", 
          description: `This schedule has ${details.registeredMembers || 0} registered members and ${details.attendedMembers || 0} who have attended. Please cancel all registrations first.`,
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Error deleting schedule", 
          description: error.message,
          variant: "destructive" 
        });
      }
      
      // Close dialog on error
      setDeleteDialogOpen(false);
      setScheduleToDelete(null);
    },
  });

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
      updateScheduleMutation.mutate({ id: editingSchedule.id, data });
    } else {
      createScheduleMutation.mutate(data);
    }
  };

  const handleEdit = (schedule: any) => {
    console.log('Editing schedule:', schedule);
    setEditingSchedule(schedule);
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
      trainerId: 0,
      dayOfWeek: 1,
      startTime: "",
      endTime: "",
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
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-base truncate">{schedule.class?.name}</span>
                <Badge variant="outline" className="text-xs">{schedule.code || `SCH-${schedule.id}`}</Badge>
                <Badge variant="outline" className="text-xs">{schedule.class?.category}</Badge>
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <RepeatIcon className="w-3 h-3" />
                  {getRepetitionLabel(schedule.repetitionType || 'weekly')}
                </Badge>
                <Badge variant={schedule.isActive ? 'default' : 'secondary'} className="text-xs ml-1">
                  {schedule.isActive ? 'Active' : 'Inactive'}
                </Badge>
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
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-green-600" />
                  <span className="font-medium text-green-600">{attendanceRate}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-muted-foreground" />
                  <span className="font-medium">{maxCapacity}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            {canDeleteSchedule(schedule.id) ? (
              <Button size="icon" variant="ghost" className="border border-gray-200 text-red-600" onClick={() => onDelete(schedule)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="text-blue-600 hover:text-blue-700"
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
    <div className="space-y-8">
      <div className="flex justify-between items-center">
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
                        <Select onValueChange={value => field.onChange(Number(value))} value={String(field.value)}>
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
                        
                        {/* Class Info Display */}
                        {selectedClass && (
                          <div className="mt-2 p-3 bg-muted/30 rounded-md border">
                            <div className="flex items-center gap-2 mb-2">
                              <div 
                                className="w-3 h-3 rounded-full border border-white/20" 
                                style={{ backgroundColor: selectedClass.category?.color || '#6B7280' }}
                              />
                              <span className="text-sm font-medium text-foreground">
                                {selectedClass.category?.name || 'No Category'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <div>Duration: {selectedClass.duration || 0} min</div>
                              <div>Capacity: {selectedClass.max_capacity || 0} members</div>
                            </div>
                            {selectedClass.description && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                {selectedClass.description}
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
                      <Select onValueChange={value => field.onChange(Number(value))} value={String(field.value)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select trainer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {trainersList.map((trainer: any) => (
                            <SelectItem key={trainer.id} value={String(trainer.id)}>
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
                      <Select onValueChange={field.onChange} value={field.value}>
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

                {/* Date fields based on repetition type */}
                {form.watch("repetitionType") === "once" && (
                  <FormField
                    control={form.control}
                    name="scheduleDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Schedule Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ""} />
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
                            <Input type="date" {...field} value={field.value || ""} />
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
                            <Input type="date" {...field} value={field.value || ""} />
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
                )}

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

      {/* Main Content - List View Only */}
      <div className="space-y-6">

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search schedules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

        {/* Schedules Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Schedules</CardTitle>
            <CardDescription>
              {filteredSchedules.length} of {schedules?.length || 0} schedules
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center space-x-4 p-4">
                    <div className="w-12 h-12 bg-muted rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/4"></div>
                      <div className="h-3 bg-muted rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              isMobile ? (
                <div className="space-y-2">
                  {filteredSchedules.map((schedule: any) => (
                    <MobileScheduleCard key={schedule.id} schedule={schedule} onEdit={handleEdit} onDelete={handleDelete} />
                  ))}
                  {filteredSchedules.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No schedules found.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSchedules.map((schedule: any) => {
                    const attendedMembers = getScheduleCheckins(schedule.id);
                    
                    // Get capacity from class max_capacity
                    const maxCapacity = schedule.class?.max_capacity || 0;
                    
                    // Calculate attendance rate: total attendance over capacity multiplied by repetitions
                    const totalAttendance = attendedMembers.length;
                    const repetitionCount = schedule.repetitionType === 'weekly' ? 4 : schedule.repetitionType === 'daily' ? 30 : 1; // Estimate repetitions
                    const adjustedCapacity = maxCapacity * repetitionCount;
                    const attendanceRate = adjustedCapacity > 0 
                      ? Math.round((totalAttendance / adjustedCapacity) * 100)
                      : 0;

                    return (
                      <Card key={schedule.id} className="hover:shadow-md transition-shadow">
                        <CardContent className={isMobile ? 'p-3' : 'p-6'}>
                          <div className={isMobile ? 'flex flex-col gap-2' : 'flex items-center justify-between'}>
                            <div className={isMobile ? 'flex items-center gap-3' : 'flex items-center space-x-4 flex-1'}>
                              <div className={isMobile ? 'w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center' : 'w-16 h-16 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center'}>
                                <Calendar className={isMobile ? 'w-5 h-5 text-white' : 'w-8 h-8 text-white'} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className={isMobile ? 'text-base font-semibold text-foreground' : 'text-lg font-semibold text-foreground'}>{schedule.class?.name}</h3>
                                  <Badge variant="outline" className="text-xs">{schedule.code || `SCH-${schedule.id}`}</Badge>
                                  <Badge variant="outline" className="text-xs">{schedule.class?.category}</Badge>
                                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                    <RepeatIcon className="w-3 h-3" />
                                    {getRepetitionLabel(schedule.repetitionType || 'weekly')}
                                  </Badge>
                                </div>
                                <div className={isMobile ? 'flex flex-col gap-1 text-xs' : 'grid grid-cols-2 md:grid-cols-5 gap-4 text-sm'}>
                                  <div>
                                    <p className="text-muted-foreground">Trainer</p>
                                    <p className="font-medium">{schedule.trainer?.firstName} {schedule.trainer?.lastName}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Schedule</p>
                                    <div className="flex items-center gap-1">
                                      <Badge variant="outline" className="text-xs">
                                        {schedule.scheduleDate ? formatEuropeanDate(schedule.scheduleDate) : getDayName(schedule.dayOfWeek)}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                                      </span>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Capacity</p>
                                    <div className="flex items-center gap-1">
                                      <Users className="w-4 h-4 text-muted-foreground" />
                                      <span className="font-medium">{maxCapacity}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Attendance</p>
                                    <div className="flex items-center gap-1">
                                      <TrendingUp className="w-4 h-4 text-green-600" />
                                      <span className="font-medium text-green-600">{attendanceRate}%</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            {/* Desktop Actions */}
                            <div className="flex gap-2">
                              {canDeleteSchedule(schedule.id) ? (
                                <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(schedule)}>
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Delete
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-blue-600 hover:text-blue-700"
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
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  
                  {filteredSchedules.length === 0 && (
                    <div className="text-center py-12">
                      <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No schedules found</h3>
                      <p className="text-muted-foreground">
                        {searchTerm ? 'Try adjusting your search criteria' : 'Create your first schedule to get started'}
                      </p>
                    </div>
                  )}
                </div>
              )
            )}
          </CardContent>
        </Card>
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
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="font-medium text-red-800">
                  {scheduleToDelete.class?.name} - {scheduleToDelete.trainer?.firstName} {scheduleToDelete.trainer?.lastName}
                </div>
                <div className="text-sm text-red-600 mt-1">
                  {scheduleToDelete.scheduleDate ? formatEuropeanDate(scheduleToDelete.scheduleDate) : getDayName(scheduleToDelete.dayOfWeek)} • {formatTime(scheduleToDelete.startTime)} - {formatTime(scheduleToDelete.endTime)}
                </div>
                <div className="text-sm text-red-600 mt-3 space-y-1">
                  <div>⚠️ <strong>This will delete:</strong></div>
                  <div>• All courses generated from this schedule</div>
                  <div>• Schedule configuration and timing</div>
                  <div className="font-semibold mt-2">This action cannot be undone!</div>
                  <div className="text-xs text-gray-600 mt-2">
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
              className="bg-red-600 hover:bg-red-700"
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