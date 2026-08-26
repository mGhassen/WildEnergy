"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { editCourseSchema, EditCourse } from "@/shared/zod-schemas";
import { useUpdateCourse } from "@/hooks/useCourse";
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
import { Course } from "@/lib/api/courses";
import { toDateKey } from "@/lib/date";
import { Clock, Users, User, Edit } from "lucide-react";

function toTimeInputValue(v?: string | null) {
  if (!v) return "";
  return String(v).slice(0, 5);
}

interface CourseEditDialogProps {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
}

export function CourseEditDialog({ course, isOpen, onClose }: CourseEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const updateCourse = useUpdateCourse();
  const { data: classes = [] } = useClasses();
  const { data: trainers = [] } = useTrainers();

  const form = useForm<EditCourse>({
    resolver: zodResolver(editCourseSchema),
    defaultValues: {
      class_id: course.class_id,
      trainer_id: course.trainer_id ? String(course.trainer_id) : "",
      course_date: toDateKey(course.course_date) || "",
      start_time: toTimeInputValue(course.start_time),
      end_time: toTimeInputValue(course.end_time),
      max_participants: course.max_participants,
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    form.reset({
      class_id: course.class_id,
      trainer_id: course.trainer_id ? String(course.trainer_id) : "",
      course_date: toDateKey(course.course_date) || "",
      start_time: toTimeInputValue(course.start_time),
      end_time: toTimeInputValue(course.end_time),
      max_participants: course.max_participants,
    });
  }, [isOpen, course, form]);

  const onSubmit = async (data: EditCourse) => {
    setIsSubmitting(true);
    try {
      await updateCourse.mutateAsync({
        courseId: course.id,
        data: {
          class_id: data.class_id,
          trainer_id: data.trainer_id?.trim() ? data.trainer_id : "",
          course_date: data.course_date,
          start_time: data.start_time.length === 5 ? `${data.start_time}:00` : data.start_time,
          end_time: data.end_time.length === 5 ? `${data.end_time}:00` : data.end_time,
          max_participants: data.max_participants,
        },
      });

      toast({
        title: "Course updated",
        description: "The course has been successfully updated.",
      });
      onClose();
    } catch (error: any) {
      toast({
        title: "Failed to update course",
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
            <Edit className="w-5 h-5" />
            Edit course
          </DialogTitle>
          <DialogDescription>
            Change any field for this course only. Diffs vs the schedule are tracked.
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
                {isSubmitting ? "Updating..." : "Update course"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
