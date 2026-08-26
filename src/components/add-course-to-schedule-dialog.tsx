"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateCourse } from "@/hooks/useCourse";
import { useClasses } from "@/hooks/useClasses";
import { useTrainers } from "@/hooks/useTrainers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Schedule } from "@/lib/api/schedules";
import { CalendarPlus, Clock, Users, User } from "lucide-react";

const addCourseSchema = z
  .object({
    class_id: z.number().min(1, "Class is required"),
    trainer_id: z.string().optional(),
    course_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date is required"),
    start_time: z.string().min(1, "Start time is required"),
    end_time: z.string().min(1, "End time is required"),
    max_participants: z.number().min(1, "Max participants must be at least 1"),
  })
  .refine(
    (data) => {
      const start = new Date(`2000-01-01T${data.start_time}`);
      const end = new Date(`2000-01-01T${data.end_time}`);
      return end > start;
    },
    { message: "End time must be after start time", path: ["end_time"] },
  );

type AddCourseForm = z.infer<typeof addCourseSchema>;

function toTimeInputValue(v?: string | null) {
  if (!v) return "";
  return String(v).slice(0, 5);
}

function toDateInputValue(v?: string | null) {
  if (!v) return "";
  return String(v).split("T")[0];
}

interface AddCourseToScheduleDialogProps {
  schedule: Schedule;
  existingCourseDates: string[];
  isOpen: boolean;
  onClose: () => void;
}

export function AddCourseToScheduleDialog({
  schedule,
  existingCourseDates,
  isOpen,
  onClose,
}: AddCourseToScheduleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const createCourse = useCreateCourse();
  const { data: classes = [] } = useClasses();
  const { data: trainers = [] } = useTrainers();

  const form = useForm<AddCourseForm>({
    resolver: zodResolver(addCourseSchema),
    defaultValues: {
      class_id: schedule.class_id,
      trainer_id: schedule.trainer_id || "",
      course_date:
        toDateInputValue(schedule.schedule_date) ||
        toDateInputValue(schedule.start_date) ||
        "",
      start_time: toTimeInputValue(schedule.start_time),
      end_time: toTimeInputValue(schedule.end_time),
      max_participants:
        schedule.max_participants ??
        (schedule.class as { max_capacity?: number } | undefined)?.max_capacity ??
        10,
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    form.reset({
      class_id: schedule.class_id,
      trainer_id: schedule.trainer_id || "",
      course_date:
        toDateInputValue(schedule.schedule_date) ||
        toDateInputValue(schedule.start_date) ||
        "",
      start_time: toTimeInputValue(schedule.start_time),
      end_time: toTimeInputValue(schedule.end_time),
      max_participants:
        schedule.max_participants ??
        (schedule.class as { max_capacity?: number } | undefined)?.max_capacity ??
        10,
    });
  }, [isOpen, schedule, form]);

  const onSubmit = async (data: AddCourseForm) => {
    const dateTaken = existingCourseDates.some(
      (d) => toDateInputValue(d) === data.course_date,
    );
    if (dateTaken) {
      toast({
        title: "Date already has a course",
        description: "This schedule already has a course on that date.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createCourse.mutateAsync({
        schedule_id: schedule.id,
        class_id: data.class_id,
        trainer_id: data.trainer_id?.trim() ? data.trainer_id : (null as any),
        course_date: data.course_date,
        start_time: data.start_time.length === 5 ? `${data.start_time}:00` : data.start_time,
        end_time: data.end_time.length === 5 ? `${data.end_time}:00` : data.end_time,
        max_participants: data.max_participants,
        status: "scheduled",
        is_active: true,
      } as any);

      toast({
        title: "Course added",
        description: "The course has been added to this schedule.",
      });
      onClose();
    } catch (error: any) {
      toast({
        title: "Failed to add course",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5" />
            Add course
          </DialogTitle>
          <DialogDescription>
            Prefills from the schedule. Change any field for this course only.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="course_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="class_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {classes.map((cls: any) => (
                        <SelectItem key={cls.id} value={String(cls.id)}>
                          {cls.name}
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
              name="trainer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Trainer
                  </FormLabel>
                  <Select
                    value={field.value || "__none__"}
                    onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select trainer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">No trainer</SelectItem>
                      {trainers.map((trainer) => (
                        <SelectItem key={trainer.id} value={trainer.id}>
                          {trainer.first_name} {trainer.last_name}
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
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Start
                    </FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      End
                    </FormLabel>
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
              name="max_participants"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Max participants
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      value={field.value}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add course"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
