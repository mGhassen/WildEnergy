import { useQuery } from '@tanstack/react-query';
import { planApi, Plan } from '@/lib/api/plans';

// Member Plans Hook
export const useMemberPlans = () => {
  return useQuery<Plan[]>({
    queryKey: ['/api/plans'],
    queryFn: planApi.getPlans,
  });
};
