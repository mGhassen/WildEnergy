import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { registrationApi, Registration, CreateRegistrationData, UpdateRegistrationData } from '@/lib/api/registrations';
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
    mutationFn: ({ classId, data }: { classId: number; data: { subscription_id?: number } }) => 
      registrationApi.registerForClass(classId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast({
        title: 'Successfully registered',
        description: 'You have been registered for the class.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to register for class',
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
      toast({
        title: 'Registration cancelled',
        description: 'Your registration has been cancelled.',
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
      queryClient.invalidateQueries({ queryKey: ['/api/registrations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/member/courses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/member/subscriptions'] });
      toast({
        title: 'Registration successful!',
        description: 'You are now registered for this course despite the time conflict.',
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
