import { useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleApi, CreateScheduleData, UpdateScheduleData } from '@/lib/api/schedules';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

function resolveScheduleDays(data: CreateScheduleData | UpdateScheduleData): number[] {
  const fromArray = data.days_of_week?.filter((d) => d >= 0 && d <= 6) ?? [];
  if (fromArray.length) return [...new Set(fromArray)].sort((a, b) => a - b);
  if (data.day_of_week !== undefined && data.day_of_week !== null) return [data.day_of_week];
  return [1];
}

async function generateCoursesForSchedule(scheduleId: number) {
  try {
    await apiRequest('POST', `/api/admin/schedules/${scheduleId}`);
  } catch (err) {
    console.error('Course generation failed:', err);
  }
}

export function useCreateScheduleWithCourses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateScheduleData) => {
      const { days_of_week: _days, ...base } = data;
      const days =
        data.repetition_type === 'weekly' ? resolveScheduleDays(data) : [data.day_of_week ?? 1];

      const results = [];
      for (const day of days) {
        const result = await scheduleApi.createSchedule({
          ...base,
          day_of_week: day,
        });
        if (result?.id) {
          await generateCoursesForSchedule(result.id);
        }
        results.push(result);
      }

      return results[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast({
        title: 'Schedule created',
        description: 'The schedule has been successfully created and courses generated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create schedule',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateScheduleWithCourses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ scheduleId, data }: { scheduleId: number; data: UpdateScheduleData }) => {
      const { days_of_week: _days, ...base } = data;
      const days =
        data.repetition_type === 'weekly' || data.days_of_week?.length
          ? resolveScheduleDays(data)
          : data.day_of_week !== undefined
            ? [data.day_of_week]
            : [];

      const [primaryDay, ...extraDays] = days.length ? days : [data.day_of_week ?? 1];

      // PUT already syncs courses (update / add missing / skip protected). Do not POST again.
      const result = await scheduleApi.updateSchedule(scheduleId, {
        ...base,
        day_of_week: primaryDay as number,
      });

      // Extra checked days → sibling schedules (same class/time/range)
      if (data.repetition_type === 'weekly' && extraDays.length > 0) {
        for (const day of extraDays) {
          const created = await scheduleApi.createSchedule({
            class_id: data.class_id!,
            trainer_id: data.trainer_id || '',
            day_of_week: day,
            start_time: data.start_time!,
            end_time: data.end_time!,
            max_participants: data.max_participants!,
            is_active: data.is_active,
            repetition_type: data.repetition_type || 'weekly',
            schedule_date: data.schedule_date ?? undefined,
            start_date: data.start_date ?? undefined,
            end_date: data.end_date ?? undefined,
          });
          if (created?.id) {
            await generateCoursesForSchedule(created.id);
          }
        }
      }

      return result;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });

      const updated = data?.updatedCourses ?? 0;
      const added = data?.addedCourses ?? 0;
      const skipped = data?.skippedCourses ?? 0;
      toast({
        title: 'Schedule updated',
        description: `${updated} updated, ${added} added, ${skipped} skipped (done / members / edited)`,
      });
    },
    onError: (error: any) => {
      if (error.message?.includes('Cannot edit schedule with existing registrations')) {
        const details = error.details || {};
        toast({
          title: 'Cannot edit schedule',
          description: `This schedule has ${details.totalRegistrations || 0} registrations and ${details.totalCheckins || 0} check-ins. Please cancel all registrations first.`,
          variant: 'destructive',
        });
      } else if (error.message?.includes('failed to sync courses') || error.message?.includes('failed to regenerate courses')) {
        toast({
          title: 'Schedule updated with warning',
          description: 'Schedule was updated but some courses could not be synced. Check the schedule detail.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Failed to update schedule',
          description: error.message || 'Please try again',
          variant: 'destructive',
        });
      }
    },
  });
}

export function useDeleteScheduleWithCourses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (scheduleId: number) => {
      // Delete the schedule (this will also delete related courses)
      const result = await scheduleApi.deleteSchedule(scheduleId);
      return result;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });

      const courseCount = data?.deletedCourses || 0;
      const activeCourseCount = data?.activeCourses || 0;
      const scheduleName = data?.scheduleName || 'Schedule';

      toast({
        title: 'Schedule deleted',
        description: `Deleted ${scheduleName} and ${courseCount} related course${courseCount !== 1 ? 's' : ''} (${activeCourseCount} active)`,
      });
    },
    onError: (error: any) => {
      if (String(error?.message || '').includes('Cannot delete schedule')) {
        toast({
          title: 'Cannot delete schedule',
          description:
            error?.message ||
            error?.data?.message ||
            'Resolve check-ins, attended members, or past active registrations first.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Failed to delete schedule',
          description: error.message || 'Please try again',
          variant: 'destructive',
        });
      }
    },
  });
}