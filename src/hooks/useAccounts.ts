import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountApi, Account, CreateAccountData, UpdateAccountData } from '@/lib/api/accounts';
import { useToast } from '@/hooks/use-toast';

export function useAccounts() {
  return useQuery<Account[], Error>({
    queryKey: ['accounts'],
    queryFn: () => accountApi.getAccounts(),
  });
}

export function useAccount(accountId: string) {
  return useQuery<Account, Error>({
    queryKey: ['account', accountId],
    queryFn: () => accountApi.getAccount(accountId),
    enabled: !!accountId,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateAccountData) => accountApi.createAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({
        title: 'Account created',
        description: 'The account has been successfully created.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create account',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: UpdateAccountData) => accountApi.updateAccount(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: ['account', data.accountId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({
        title: 'Account updated',
        description: 'The account has been successfully updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update account',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (accountId: string) => accountApi.deleteAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({
        title: 'Account deleted',
        description: 'The account has been successfully deleted.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete account',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useCreateAdmin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateAccountData) => accountApi.createAdmin(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({
        title: 'Admin account created',
        description: 'The admin account has been successfully created.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create admin account',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useCreateTestAccount() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => accountApi.createTestAccount(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({
        title: 'Test account created',
        description: 'A test account has been successfully created.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create test account',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}
