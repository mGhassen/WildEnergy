import { useQuery } from '@tanstack/react-query';
import { memberApi, MemberDetails } from '@/lib/api/members';

export function useMemberDetails(memberId: string | null) {
  return useQuery<MemberDetails, Error>({
    queryKey: ['member-details', memberId],
    queryFn: () => memberApi.getMemberDetails(memberId!),
    enabled: !!memberId,
  });
}
