import { useQuery } from '@tanstack/react-query';
import { trainerApi, Trainer } from '@/lib/api/trainers';

// Member Trainers Hook
export const useMemberTrainers = () => {
  return useQuery<Trainer[]>({
    queryKey: ['/api/trainers'],
    queryFn: trainerApi.getTrainers,
  });
};