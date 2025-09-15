import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Plan } from '@/lib/api/plans';

// Member Plans Hook
export const useMemberPlans = () => {
  return useQuery<Plan[]>({
    queryKey: ['/api/member/plans'],
    queryFn: () => apiRequest('GET', '/api/member/plans'),
  });
};
