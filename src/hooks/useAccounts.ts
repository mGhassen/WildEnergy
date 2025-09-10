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

export function useLinkAccountTrainer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ accountId, trainerId }: { accountId: string; trainerId: string }) => 
      accountApi.linkTrainer(accountId, trainerId),
    onSuccess: (data, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: ['account', accountId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
      toast({
        title: 'Trainer linked',
        description: data.message || 'Trainer has been successfully linked to account.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to link trainer',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useUnlinkAccountTrainer() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (accountId: string) => accountApi.unlinkTrainer(accountId),
    onSuccess: (data, accountId) => {
      queryClient.invalidateQueries({ queryKey: ['account', accountId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
      toast({
        title: 'Trainer unlinked',
        description: data.message || 'Trainer has been successfully unlinked from account.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to unlink trainer',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

// Admin-specific operation hooks
export function useSetAccountPassword() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ accountId, password }: { accountId: string; password: string }) => 
      accountApi.setPassword(accountId, password),
    onSuccess: (_, { accountId }) => {
      queryClient.invalidateQueries({ queryKey: ['account', accountId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({
        title: 'Password set successfully',
        description: 'The account password has been updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to set password',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useApproveAccount() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (accountId: string) => accountApi.approveAccount(accountId),
    onSuccess: (_, accountId) => {
      queryClient.invalidateQueries({ queryKey: ['account', accountId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({
        title: 'Account approved',
        description: 'The account has been successfully approved.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to approve account',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useDisapproveAccount() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (accountId: string) => accountApi.disapproveAccount(accountId),
    onSuccess: (_, accountId) => {
      queryClient.invalidateQueries({ queryKey: ['account', accountId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({
        title: 'Account disapproved',
        description: 'The account has been successfully disapproved.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to disapprove account',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useResetAccountPassword() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (accountId: string) => accountApi.resetPassword(accountId),
    onSuccess: (_, accountId) => {
      queryClient.invalidateQueries({ queryKey: ['account', accountId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({
        title: 'Password reset',
        description: 'The account password has been reset.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to reset password',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useResendAccountInvitation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (accountId: string) => accountApi.resendInvitation(accountId),
    onSuccess: (_, accountId) => {
      queryClient.invalidateQueries({ queryKey: ['account', accountId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast({
        title: 'Invitation resent',
        description: 'The account invitation has been resent.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to resend invitation',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}
