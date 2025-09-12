"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { editCourseSchema, EditCourse } from '@/shared/zod-schemas';
import { useUpdateCourse } from '@/hooks/useCourse';
import { useTrainers } from '@/hooks/useTrainers';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Course } from '@/lib/api/courses';
import { formatTime } from '@/lib/date';
import { AlertTriangle, Clock, Users, User } from 'lucide-react';

interface CourseEditDialogProps {
  course: Course;
  isOpen: boolean;
  onClose: () => void;
}

export function CourseEditDialog({ course, isOpen, onClose }: CourseEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const updateCourse = useUpdateCourse();
  const { data: trainers } = useTrainers();

  const form = useForm<EditCourse>({
    resolver: zodResolver(editCourseSchema),
    defaultValues: {
      trainerId: course.trainer_id,
      startTime: course.start_time,
      endTime: course.end_time,
      maxParticipants: course.max_participants,
      status: course.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled',
    },
  });

  const onSubmit = async (data: EditCourse) => {
    setIsSubmitting(true);
    try {
      await updateCourse.mutateAsync({
        courseId: course.id,
        data: {
          trainer_id: data.trainerId,
          start_time: data.startTime,
          end_time: data.endTime,
          max_participants: data.maxParticipants,
          status: data.status,
        },
      });

      toast({
        title: 'Course updated',
        description: 'The course has been successfully updated.',
      });
      onClose();
    } catch (error: any) {
      toast({
        title: 'Failed to update course',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTrainerName = (trainerId: number) => {
    const trainer = trainers?.find(t => t.id === trainerId);
    return trainer ? `${trainer.first_name} ${trainer.last_name}` : 'Unknown Trainer';
  };

  const getOriginalValue = (field: keyof typeof course.differences) => {
    return course.differences?.[field]?.original;
  };

  const getCurrentValue = (field: keyof typeof course.differences) => {
    return course.differences?.[field]?.current;
  };

  const isFieldEdited = (field: keyof typeof course.differences) => {
    return course.differences?.[field] !== null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Edit Course
          </DialogTitle>
          <DialogDescription>
            Modify the course details. Changes will be tracked compared to the original schedule.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Trainer Selection */}
              <FormField
                control={form.control}
                name="trainerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Trainer
                      {isFieldEdited('trainer') && (
                        <Badge variant="outline" className="text-orange-600 border-orange-200">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Edited
                        </Badge>
                      )}
                    </FormLabel>
                    <Select
                      value={field.value.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select trainer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {trainers?.map((trainer) => (
                          <SelectItem key={trainer.id} value={trainer.id.toString()}>
                            {trainer.first_name} {trainer.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isFieldEdited('trainer') && (
                      <div className="text-xs text-muted-foreground mt-1">
                        <span className="text-orange-600">Original:</span> {getTrainerName(getOriginalValue('trainer') || 0)}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Max Participants */}
              <FormField
                control={form.control}
                name="maxParticipants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Max Participants
                      {isFieldEdited('maxParticipants') && (
                        <Badge variant="outline" className="text-orange-600 border-orange-200">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Edited
                        </Badge>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    {isFieldEdited('maxParticipants') && (
                      <div className="text-xs text-muted-foreground mt-1">
                        <span className="text-orange-600">Original:</span> {getOriginalValue('maxParticipants')}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Start Time */}
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Start Time
                      {isFieldEdited('startTime') && (
                        <Badge variant="outline" className="text-orange-600 border-orange-200">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Edited
                        </Badge>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                      />
                    </FormControl>
                    {isFieldEdited('startTime') && (
                      <div className="text-xs text-muted-foreground mt-1">
                        <span className="text-orange-600">Original:</span> {formatTime(getOriginalValue('startTime') || '')}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Time */}
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      End Time
                      {isFieldEdited('endTime') && (
                        <Badge variant="outline" className="text-orange-600 border-orange-200">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Edited
                        </Badge>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                      />
                    </FormControl>
                    {isFieldEdited('endTime') && (
                      <div className="text-xs text-muted-foreground mt-1">
                        <span className="text-orange-600">Original:</span> {formatTime(getOriginalValue('endTime') || '')}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Course'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
