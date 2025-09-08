import { useQuery } from '@tanstack/react-query';
import { scheduleApi, Schedule } from '@/lib/api/schedules';

// Member Schedules Hook
export const useMemberSchedules = () => {
  return useQuery<Schedule[]>({
    queryKey: ['/api/schedules'],
    queryFn: scheduleApi.getSchedules,
  });
};