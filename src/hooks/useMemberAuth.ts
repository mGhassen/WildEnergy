import { useQuery } from '@tanstack/react-query';
import { authApi, SessionData } from '@/lib/api/auth';

// Member Auth Session Hook
export const useMemberAuthSession = () => {
  return useQuery<SessionData>({
    queryKey: ['/api/auth/session'],
    queryFn: authApi.getMemberSession,
  });
};