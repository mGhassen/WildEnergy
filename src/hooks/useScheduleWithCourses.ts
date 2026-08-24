import { useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleApi, CreateScheduleData, UpdateScheduleData } from '@/lib/api/schedules';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function useCreateScheduleWithCourses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateScheduleData) => {
      const result = await scheduleApi.createSchedule(data);

      if (result?.id) {
        try {
          await apiRequest('POST', `/api/admin/schedules/${result.id}`);
        } catch (err) {
          console.error('Course generation failed:', err);
        }
      }

      return result;
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
      // PUT already syncs courses (update / add missing / skip protected). Do not POST again.
      return scheduleApi.updateSchedule(scheduleId, data);
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
