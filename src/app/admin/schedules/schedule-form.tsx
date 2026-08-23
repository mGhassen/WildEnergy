"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import { UseFormReturn } from "react-hook-form";

const WEEK_DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

export interface ScheduleFormData {
  classId: number;
  trainerId: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  maxParticipants: number;
  repetitionType: string;
  scheduleDate?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export const scheduleFormDefaultValues: ScheduleFormData = {
  classId: 0,
  trainerId: "",
  daysOfWeek: [1],
  startTime: "",
  endTime: "",
  maxParticipants: 10,
  repetitionType: "once",
  scheduleDate: new Date().toISOString().split("T")[0],
  startDate: new Date().toISOString().split("T")[0],
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  isActive: true,
};

export function mapScheduleToApi(data: ScheduleFormData, classes: any[] = []) {
  const days =
    data.repetitionType === "weekly"
      ? [...new Set(data.daysOfWeek ?? [])].sort((a, b) => a - b)
      : [];

  return {
    class_id: data.classId,
    trainer_id: data.trainerId && data.trainerId.trim() !== "" ? data.trainerId : "",
    day_of_week: days[0] ?? data.daysOfWeek?.[0] ?? 1,
    days_of_week: days.length ? days : undefined,
    start_time: data.startTime,
    end_time: data.endTime,
    max_participants: data.maxParticipants,
    is_active: data.isActive ?? true,
    repetition_type: data.repetitionType,
    schedule_date: data.scheduleDate,
    start_date: data.startDate,
    end_date: data.endDate,
  };
}

export function scheduleToFormValues(schedule: any): ScheduleFormData {
  const day = schedule.dayOfWeek ?? schedule.day_of_week;
  const days =
    Array.isArray(schedule.daysOfWeek) && schedule.daysOfWeek.length
      ? schedule.daysOfWeek
      : Array.isArray(schedule.days_of_week) && schedule.days_of_week.length
        ? schedule.days_of_week
        : [day ?? 1];

  return {
    classId: schedule.classId || schedule.class_id || 0,
    trainerId: schedule.trainerId || schedule.trainer_id || "",
    daysOfWeek: days.map(Number),
    startTime: schedule.startTime || schedule.start_time || "",
    endTime: schedule.endTime || schedule.end_time || "",
    maxParticipants: schedule.maxParticipants || schedule.max_participants || 10,
    repetitionType: schedule.repetitionType || schedule.repetition_type || "once",
    scheduleDate: schedule.scheduleDate || schedule.schedule_date || "",
    startDate: schedule.startDate || schedule.start_date || "",
    endDate: schedule.endDate || schedule.end_date || "",
    isActive: Boolean(schedule.isActive ?? schedule.is_active ?? true),
  };
}

type ScheduleFormProps = {
  form: UseFormReturn<ScheduleFormData>;
  classes: any[];
  trainers: any[];
  onSubmit: (data: ScheduleFormData) => void;
  submitLabel: string;
  isSubmitting?: boolean;
  isEdit?: boolean;
};

export function ScheduleForm({
  form,
  classes,
  trainers,
  onSubmit,
  submitLabel,
  isSubmitting,
  isEdit,
}: ScheduleFormProps) {
  const watchedClassId = form.watch("classId");
  const watchedStartTime = form.watch("startTime");
  const watchedRepetitionType = form.watch("repetitionType");

  useEffect(() => {
    if (!watchedClassId || !classes?.length) return;
    const selectedClass = classes.find((cls: any) => cls.id === watchedClassId);
    if (!selectedClass) return;
    if (!isEdit) {
      form.setValue("maxParticipants", selectedClass.max_capacity || 10);
    }
    if (watchedStartTime && selectedClass.duration) {
      const [hours, minutes] = watchedStartTime.split(":").map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + (selectedClass.duration || 60);
      const endHours = Math.floor(endMinutes / 60) % 24;
      const endMins = endMinutes % 60;
      form.setValue(
        "endTime",
        `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`,
      );
    }
  }, [watchedClassId, watchedStartTime, classes, form, isEdit]);

  return (
<Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                          {trainers.map((trainer: any) => (
                            <SelectItem key={trainer.id} value={String(trainer.id)}>
                              {trainer.first_name || trainer.firstName}{" "}
                              {trainer.last_name || trainer.lastName}
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
                              value={field.value || ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value === "" ? 0 : parseInt(value, 10) || 0);
                              }}
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
                    name="daysOfWeek"
                    rules={{
                      validate: (value) =>
                        (value?.length ?? 0) > 0 || "Select at least one day",
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Days of Week</FormLabel>
                        <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                          {WEEK_DAYS.map((day) => {
                            const checked = field.value?.includes(day.value) ?? false;
                            return (
                              <label
                                key={day.value}
                                className="flex cursor-pointer items-center gap-2 text-sm"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(isChecked) => {
                                    const current = field.value ?? [];
                                    field.onChange(
                                      isChecked
                                        ? [...current, day.value].sort((a, b) => a - b)
                                        : current.filter((d) => d !== day.value),
                                    );
                                  }}
                                />
                                {day.label}
                              </label>
                            );
                          })}
                        </div>
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
                  <Button type="submit" disabled={isSubmitting}>
                    {submitLabel}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
  );
}
