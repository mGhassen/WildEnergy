import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleApi, Schedule, CreateScheduleData, UpdateScheduleData } from '@/lib/api/schedules';
import { useToast } from '@/hooks/use-toast';

export function useSchedules() {
  return useQuery<Schedule[], Error>({
    queryKey: ['schedules'],
    queryFn: () => scheduleApi.getSchedules(),
  });
}

export function useSchedule(scheduleId: number) {
  return useQuery<Schedule, Error>({
    queryKey: ['schedule', scheduleId],
    queryFn: () => scheduleApi.getSchedule(scheduleId),
    enabled: !!scheduleId,
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateScheduleData) => scheduleApi.createSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({
        title: 'Schedule created',
        description: 'The schedule has been successfully created.',
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

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ scheduleId, data }: { scheduleId: number; data: UpdateScheduleData }) => 
      scheduleApi.updateSchedule(scheduleId, data),
    onSuccess: (_, { scheduleId }) => {
      queryClient.invalidateQueries({ queryKey: ['schedule', scheduleId] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({
        title: 'Schedule updated',
        description: 'The schedule has been successfully updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update schedule',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (scheduleId: number) => scheduleApi.deleteSchedule(scheduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast({
        title: 'Schedule deleted',
        description: 'The schedule has been successfully deleted.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete schedule',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}
