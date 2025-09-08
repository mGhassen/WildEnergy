import { useQuery, useMutation } from '@tanstack/react-query';
import { memberApi, Member, CheckMemberSessionsRequest, CheckMemberSessionsResponse } from '@/lib/api/members';

export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: () => memberApi.getMembers(),
  });
}

export function useCheckMemberSessions() {
  return useMutation({
    mutationFn: (data: CheckMemberSessionsRequest): Promise<CheckMemberSessionsResponse> => 
      memberApi.checkMemberSessions(data),
  });
}
