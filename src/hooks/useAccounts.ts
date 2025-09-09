import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, User, CreateUserData, UpdateUserData } from '@/lib/api/users';
import { useToast } from '@/hooks/use-toast';

export function useAccounts() {
  return useQuery<User[], Error>({
    queryKey: ['accounts'],
    queryFn: () => userApi.getUsers(),
  });
}

export function useAccount(accountId: string) {
  return useQuery<User, Error>({
    queryKey: ['account', accountId],
    queryFn: () => userApi.getUser(accountId),
    enabled: !!accountId,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateUserData) => userApi.createUser(data),
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
    mutationFn: (data: UpdateUserData) => userApi.updateUser(data),
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
    mutationFn: (accountId: string) => userApi.deleteUser(accountId),
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
    mutationFn: (data: CreateUserData) => userApi.createAdmin(data),
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
    mutationFn: () => userApi.createTestUser(),
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
