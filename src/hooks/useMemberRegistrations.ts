import { useQuery } from '@tanstack/react-query';
import { registrationApi, Registration } from '@/lib/api/registrations';

// Member Registrations Hook
export const useMemberRegistrations = () => {
  return useQuery<Registration[]>({
    queryKey: ['/api/member/registrations'],
    queryFn: registrationApi.getMemberRegistrations,
  });
};