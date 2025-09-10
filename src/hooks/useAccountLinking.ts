import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountLinkingApi, Account, LinkAccountRequest } from '@/lib/api/account-linking';

export function useSearchAccounts(query: string, limit: number = 10) {
  return useQuery({
    queryKey: ['accounts', 'search', query, limit],
    queryFn: () => accountLinkingApi.searchAccounts(query, limit),
    enabled: query.length > 0,
    staleTime: 30000, // 30 seconds
  });
}

export function useLinkAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: LinkAccountRequest }) =>
      accountLinkingApi.linkAccount(memberId, data),
    onSuccess: (data, variables) => {
      // Invalidate member details query
      queryClient.invalidateQueries({ queryKey: ['member-details', variables.memberId] });
      // Invalidate accounts search
      queryClient.invalidateQueries({ queryKey: ['accounts', 'search'] });
    },
  });
}

export function useUnlinkAccount() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (memberId: string) => accountLinkingApi.unlinkAccount(memberId),
    onSuccess: (data, memberId) => {
      // Invalidate member details query
      queryClient.invalidateQueries({ queryKey: ['member-details', memberId] });
      // Invalidate accounts search
      queryClient.invalidateQueries({ queryKey: ['accounts', 'search'] });
    },
  });
}
