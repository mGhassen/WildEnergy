import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";

import { apiRequest } from "@/lib/queryClient";
import { Plus, Search, Edit, Trash2, Clock, Calendar, List, Users, TrendingUp, RepeatIcon } from "lucide-react";
import { getDayName, formatTime } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

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
    is_active: data.isActive,
  };
}

export default function AdminSchedules() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: rawSchedules = [], isLoading } = useQuery({
    queryKey: ["/api/schedules"],
  });

  // Map snake_case fields to camelCase for UI
  const schedules = ((rawSchedules as any[]) || []).map((sch: any) => ({
    ...sch,
    startTime: sch.start_time,
    endTime: sch.end_time,
    scheduleDate: sch.schedule_date,
    dayOfWeek: sch.day_of_week,
    repetitionType: sch.repetition_type,
    isActive: sch.is_active,
    class: sch.class,
    trainer: sch.trainer || {
      id: sch.trainer_id,
      firstName: "",
      lastName: "",
    },
  }));

  const { data: registrations = [] } = useQuery({
    queryKey: ["/api/registrations"],
  });

  const { data: checkins = [] } = useQuery({
    queryKey: ["/api/checkins"],
  });

  const { data: classes } = useQuery({
    queryKey: ["/api/classes"],
  });

  const { data: trainers } = useQuery({
    queryKey: ["/api/trainers"],
  });

  // Flatten trainers to expose firstName and lastName at the top level
  const trainersList = ((trainers as any[]) || []).map((trainer: any) => ({
    ...trainer,
    firstName: trainer.user?.firstName || "",
    lastName: trainer.user?.lastName || "",
  }));

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

  const createScheduleMutation = useMutation({
    mutationFn: async (data: ScheduleFormData) => {
      return await apiRequest("POST", "/api/schedules", mapScheduleToApi(data));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      setIsModalOpen(false);
      form.reset();
      toast({ title: "Schedule created successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error creating schedule", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ScheduleFormData }) => {
      return await apiRequest("PUT", `/api/schedules/${id}`, mapScheduleToApi(data));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      setIsModalOpen(false);
      setEditingSchedule(null);
      form.reset();
      toast({ title: "Schedule updated successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error updating schedule", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({ title: "Schedule deleted successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error deleting schedule", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const filteredSchedules = schedules?.filter((schedule: any) =>
    `${schedule.class?.name} ${schedule.trainer?.firstName} ${schedule.trainer?.lastName} ${getDayName(schedule.dayOfWeek)}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  ) || [];

  const getScheduleRegistrations = (scheduleId: number) => {
    return ((registrations as any[]) || []).filter((reg: any) => reg.schedule?.id === scheduleId);
  };

  const getScheduleCheckins = (scheduleId: number) => {
    return ((checkins as any[]) || []).filter((checkin: any) => checkin.registration?.schedule?.id === scheduleId);
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
    setEditingSchedule(schedule);
    form.reset({
      classId: schedule.class?.id || 0,
      trainerId: schedule.trainer?.id || 0,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      repetitionType: schedule.repetitionType || "once",
      scheduleDate: schedule.scheduleDate ? new Date(schedule.scheduleDate).toISOString().split('T')[0] : "",
      startDate: "",
      endDate: "",
      isActive: schedule.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this schedule?")) {
      deleteScheduleMutation.mutate(id);
    }
  };

  const openCreateModal = () => {
    setEditingSchedule(null);
    form.reset();
    setIsModalOpen(true);
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
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {((classes as any[]) || []).map((classItem: any) => (
                            <SelectItem key={classItem.id} value={classItem.id.toString()}>
                              {classItem.name}
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
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select trainer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {trainersList.map((trainer: any) => (
                            <SelectItem key={trainer.id} value={trainer.id.toString()}>
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
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
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
        <Card>
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search schedules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

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
              <div className="space-y-4">
                {filteredSchedules.map((schedule: any) => {
                  const registeredMembers = getScheduleRegistrations(schedule.id);
                  const attendedMembers = getScheduleCheckins(schedule.id);
                  const attendanceRate = registeredMembers.length > 0 
                    ? Math.round((attendedMembers.length / registeredMembers.length) * 100)
                    : 0;

                  return (
                    <Card key={schedule.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 flex-1">
                            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                              <Calendar className="w-8 h-8 text-white" />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-foreground">{schedule.class?.name}</h3>
                                <Badge variant="outline" className="text-xs">
                                  {schedule.class?.category}
                                </Badge>
                                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                  <RepeatIcon className="w-3 h-3" />
                                  {getRepetitionLabel(schedule.repetitionType || 'weekly')}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Trainer</p>
                                  <p className="font-medium">{schedule.trainer?.firstName} {schedule.trainer?.lastName}</p>
                                </div>
                                
                                <div>
                                  <p className="text-muted-foreground">Schedule</p>
                                  <div className="flex items-center gap-1">
                                    <Badge variant="outline" className="text-xs">
                                      {schedule.scheduleDate ? new Date(schedule.scheduleDate).toLocaleDateString() : getDayName(schedule.dayOfWeek)}
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
                                    <span className="font-medium">
                                      {registeredMembers.length}/{schedule.class?.maxCapacity || 0}
                                    </span>
                                  </div>
                                </div>
                                
                                <div>
                                  <p className="text-muted-foreground">Attendance</p>
                                  <div className="flex items-center gap-1">
                                    <TrendingUp className="w-4 h-4 text-green-600" />
                                    <span className="font-medium text-green-600">
                                      {attendedMembers.length}/{registeredMembers.length} ({attendanceRate}%)
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              {schedule.class?.duration && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  Duration: {schedule.class.duration} minutes
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            <Badge variant={schedule.isActive ? 'default' : 'secondary'}>
                              {schedule.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(schedule)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(schedule.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}