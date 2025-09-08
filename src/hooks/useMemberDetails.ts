import { useQuery } from '@tanstack/react-query';
import { memberDetailsApi, MemberDetails } from '@/lib/api/member-details';

export function useMemberDetails(memberId: string | null) {
  return useQuery<MemberDetails, Error>({
    queryKey: ['member-details', memberId],
    queryFn: () => memberDetailsApi.getMemberDetails(memberId!),
    enabled: !!memberId,
  });
}
