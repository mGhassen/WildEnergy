import { useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleApi, CreateScheduleData, UpdateScheduleData } from '@/lib/api/schedules';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function useCreateScheduleWithCourses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateScheduleData) => {
      console.log('🚀 Starting schedule creation with data:', data);
      
      // Create the schedule
      const result = await scheduleApi.createSchedule(data);
      console.log('📅 Schedule created successfully:', result);
      
      // Generate courses for the new schedule
      if (result?.id) {
        try {
          console.log('🔄 Generating courses for schedule:', result.id);
          console.log('🌐 Making POST request to:', `/api/admin/schedules/${result.id}`);
          
          const courseResult = await apiRequest("POST", `/api/admin/schedules/${result.id}`);
          console.log('✅ Course generation result:', courseResult);
          
          if (courseResult?.count > 0) {
            console.log(`🎉 Successfully generated ${courseResult.count} courses for schedule ${result.id}`);
          } else {
            console.warn('⚠️ Course generation returned no courses:', courseResult);
          }
        } catch (err) {
          console.error('❌ Course generation failed:', err);
          console.error('❌ Error details:', {
            message: (err as any)?.message,
            status: (err as any)?.status,
            data: (err as any)?.data
          });
          // Don't throw here, just log the error
        }
      } else {
        console.error('❌ No schedule ID returned from creation:', result);
      }
      
      return result;
    },
    onSuccess: (result, variables, context) => {
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
      // Update the schedule
      const result = await scheduleApi.updateSchedule(scheduleId, data);
      
      // Regenerate courses for the updated schedule
      if (result?.id) {
        try {
          const genResult = await apiRequest("POST", `/api/admin/schedules/${result.id}`);
          return { ...result, regeneratedCourses: genResult?.regeneratedCourses || 0 };
        } catch (err) {
          console.error('Course regeneration failed:', err);
          return result;
        }
      }
      
      return result;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      
      const regeneratedCourses = data?.regeneratedCourses || 0;
      toast({
        title: 'Schedule updated',
        description: `Schedule updated and ${regeneratedCourses} course${regeneratedCourses !== 1 ? 's' : ''} regenerated`,
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
      } else if (error.message?.includes('failed to regenerate courses')) {
        toast({
          title: 'Schedule updated with warning',
          description: 'Schedule was updated but some courses could not be regenerated. Please check the schedule and regenerate courses manually.',
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
      if (error.message?.includes('Cannot delete schedule with existing registrations')) {
        const details = error.details || {};
        toast({
          title: 'Cannot delete schedule',
          description: `This schedule has ${details.registeredMembers || 0} registered members and ${details.attendedMembers || 0} who have attended. Please cancel all registrations first.`,
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