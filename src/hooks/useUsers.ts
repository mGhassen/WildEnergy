import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, User, CreateUserData, UpdateUserData } from '@/lib/api/users';
import { useToast } from '@/hooks/use-toast';

export function useUsers() {
  return useQuery<User[], Error>({
    queryKey: ['users'],
    queryFn: () => userApi.getUsers(),
  });
}

export function useUser(accountId: string) {
  return useQuery<User, Error>({
    queryKey: ['user', accountId],
    queryFn: () => userApi.getUser(accountId),
    enabled: !!accountId,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateUserData) => userApi.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'User created',
        description: 'The user has been successfully created.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create user',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: UpdateUserData) => userApi.updateUser(data),
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: ['user', data.accountId] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'User updated',
        description: 'The user has been successfully updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update user',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (accountId: string) => userApi.deleteUser(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'User deleted',
        description: 'The user has been successfully deleted.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete user',
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
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Admin created',
        description: 'The admin user has been successfully created.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create admin',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useCreateTestUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => userApi.createTestUser(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Test user created',
        description: 'A test user has been successfully created.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create test user',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}
