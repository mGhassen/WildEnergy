import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountApi } from '@/lib/api/accounts';

export function useSearchAccounts(query: string, limit: number = 10, memberId?: string) {
  return useQuery({
    queryKey: ['accounts', 'search', query, limit, memberId],
    queryFn: () => accountApi.searchAccounts(query, limit, memberId),
    staleTime: 30000, // 30 seconds
  });
}

export function useLinkAccountToTrainer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ accountId, trainerId }: { accountId: string; trainerId: string }) =>
      accountApi.linkTrainer(accountId, trainerId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['account', variables.accountId] });
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      // Invalidate all trainer queries to refresh trainer detail pages
      queryClient.invalidateQueries({ queryKey: ['trainer'] });
    },
  });
}

export function useUnlinkAccountFromTrainer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (accountId: string) => accountApi.unlinkTrainer(accountId),
    onSuccess: (data, accountId) => {
      queryClient.invalidateQueries({ queryKey: ['account', accountId] });
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      // Invalidate all trainer queries to refresh trainer detail pages
      queryClient.invalidateQueries({ queryKey: ['trainer'] });
    },
  });
}

export function useLinkAccountToMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ accountId, memberId }: { accountId: string; memberId: string }) =>
      accountApi.linkMember(accountId, memberId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['account', variables.accountId] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      // Invalidate all member-details queries to refresh member detail pages
      queryClient.invalidateQueries({ queryKey: ['member-details'] });
    },
  });
}

export function useUnlinkAccountFromMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (accountId: string) => accountApi.unlinkMember(accountId),
    onSuccess: (data, accountId) => {
      queryClient.invalidateQueries({ queryKey: ['account', accountId] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      // Invalidate all member-details queries to refresh member detail pages
      queryClient.invalidateQueries({ queryKey: ['member-details'] });
    },
  });
}