import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { registrationApi, Registration, CreateRegistrationData, UpdateRegistrationData, BulkRegistrationData } from '@/lib/api/registrations';
import { useToast } from '@/hooks/use-toast';

export function useRegistrations() {
  return useQuery<Registration[], Error>({
    queryKey: ['registrations'],
    queryFn: () => registrationApi.getRegistrations(),
  });
}

export function useRegistration(registrationId: number) {
  return useQuery<Registration, Error>({
    queryKey: ['registration', registrationId],
    queryFn: () => registrationApi.getRegistration(registrationId),
    enabled: !!registrationId,
  });
}

export function useCreateRegistration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateRegistrationData) => registrationApi.createRegistration(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      toast({
        title: 'Registration created',
        description: 'The registration has been successfully created.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create registration',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

// Admin-specific operation hooks
export function useBulkRegisterMembers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: BulkRegistrationData) => registrationApi.bulkRegisterMembers(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/member/registrations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      
      const summary = data.summary;
      let message = `Successfully registered ${summary.registered} member(s).`;
      if (summary.errors > 0) {
        message += ` ${summary.errors} member(s) had issues.`;
      }
      if (summary.alreadyRegistered > 0) {
        message += ` ${summary.alreadyRegistered} member(s) were already registered.`;
      }
      
      toast({
        title: 'Registration successful',
        description: message,
      });
    },
    onError: (error: any) => {
      console.error('Registration error:', error);
      let errorMessage = 'Failed to register members';
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      toast({
        title: 'Registration failed',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
}

export function useCheckInRegistration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (registrationId: number) => registrationApi.checkInRegistration(registrationId.toString()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/checkins'] });
      queryClient.invalidateQueries({ queryKey: ['/api/member/registrations'] });
      toast({
        title: 'Check-in successful',
        description: 'Member has been successfully checked in.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to check in',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useCheckOutRegistration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (registrationId: number) => registrationApi.checkOutRegistration(registrationId.toString()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/checkins'] });
      queryClient.invalidateQueries({ queryKey: ['/api/member/registrations'] });
      toast({
        title: 'Check-out successful',
        description: 'Member has been successfully checked out.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to check out',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useAdminCancelRegistration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ registrationId, refundSession }: { registrationId: number; refundSession?: boolean }) => 
      registrationApi.adminCancelRegistration(registrationId, refundSession),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/member/registrations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      toast({
        title: 'Registration cancelled',
        description: 'The registration has been successfully cancelled.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to cancel registration',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateRegistration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ registrationId, data }: { registrationId: number; data: UpdateRegistrationData }) => 
      registrationApi.updateRegistration(registrationId, data),
    onSuccess: (_, { registrationId }) => {
      queryClient.invalidateQueries({ queryKey: ['registration', registrationId] });
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      toast({
        title: 'Registration updated',
        description: 'The registration has been successfully updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update registration',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteRegistration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (registrationId: number) => registrationApi.deleteRegistration(registrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      toast({
        title: 'Registration deleted',
        description: 'The registration has been successfully deleted.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete registration',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useRegisterForClass() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateRegistrationData) => registrationApi.createRegistration(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      toast({
        title: 'Successfully registered',
        description: 'You have been successfully registered for the class.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Registration failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useCancelRegistration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (registrationId: number) => registrationApi.cancelRegistration(registrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      toast({
        title: 'Registration cancelled',
        description: 'Your registration has been successfully cancelled.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to cancel registration',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useForceRegistration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (courseId: number) => registrationApi.forceRegistration(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/courses'] });
      toast({
        title: 'Registration forced',
        description: 'The registration has been successfully forced.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to force registration',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useApproveRegistration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (registrationId: number) => registrationApi.approveRegistration(registrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/member/registrations'] });
      toast({
        title: 'Registration approved',
        description: 'The registration has been successfully approved.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to approve registration',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useDisapproveRegistration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (registrationId: number) => registrationApi.disapproveRegistration(registrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/member/registrations'] });
      toast({
        title: 'Registration disapproved',
        description: 'The registration has been successfully disapproved.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to disapprove registration',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}