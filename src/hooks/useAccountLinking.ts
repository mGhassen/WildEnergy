import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accountApi } from '@/lib/api/accounts';

export function useSearchAccounts(query: string, limit: number = 10) {
  return useQuery({
    queryKey: ['accounts', 'search', query, limit],
    queryFn: () => accountApi.searchAccounts(query, limit),
    enabled: query.length > 0,
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
    },
  });
}