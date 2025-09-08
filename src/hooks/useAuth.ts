import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi, LoginCredentials, RegisterData, SessionData } from '@/lib/api/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export function useSession() {
  return useQuery<SessionData, Error>({
    queryKey: ['auth', 'session'],
    queryFn: () => authApi.getSession(),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      toast({
        title: 'Login successful',
        description: 'Welcome back!',
      });
      router.push('/admin/dashboard');
    },
    onError: (error: any) => {
      toast({
        title: 'Login failed',
        description: error.message || 'Invalid credentials',
        variant: 'destructive',
      });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: RegisterData) => authApi.register(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      toast({
        title: 'Registration successful',
        description: 'Please check your email to verify your account.',
      });
      router.push('/auth/login');
    },
    onError: (error: any) => {
      toast({
        title: 'Registration failed',
        description: error.message || 'Failed to create account',
        variant: 'destructive',
      });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.clear();
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
      router.push('/auth/login');
    },
    onError: (error: any) => {
      toast({
        title: 'Logout failed',
        description: error.message || 'Failed to logout',
        variant: 'destructive',
      });
    },
  });
}

export function useForgotPassword() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
    onSuccess: () => {
      toast({
        title: 'Reset email sent',
        description: 'Please check your email for reset instructions.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to send reset email',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useResetPassword() {
  const { toast } = useToast();
  const router = useRouter();

  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) => 
      authApi.resetPassword(token, password),
    onSuccess: () => {
      toast({
        title: 'Password reset successful',
        description: 'You can now log in with your new password.',
      });
      router.push('/auth/login');
    },
    onError: (error: any) => {
      toast({
        title: 'Password reset failed',
        description: error.message || 'Invalid or expired token',
        variant: 'destructive',
      });
    },
  });
}

export function useAcceptInvitation() {
  const { toast } = useToast();
  const router = useRouter();

  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) => 
      authApi.acceptInvitation(token, password),
    onSuccess: () => {
      toast({
        title: 'Invitation accepted',
        description: 'Your account has been created successfully.',
      });
      router.push('/admin/dashboard');
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to accept invitation',
        description: error.message || 'Invalid or expired invitation',
        variant: 'destructive',
      });
    },
  });
}

export function useCheckAccountStatus() {
  return useQuery({
    queryKey: ['auth', 'account-status'],
    queryFn: () => authApi.checkAccountStatus(),
    retry: false,
  });
}
