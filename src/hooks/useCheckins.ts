import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkinApi, Checkin, CreateCheckinData, UpdateCheckinData } from '@/lib/api/checkins';
import { useToast } from '@/hooks/use-toast';

export function useCheckins() {
  return useQuery<Checkin[], Error>({
    queryKey: ['checkins'],
    queryFn: () => checkinApi.getCheckins(),
  });
}

export function useCheckin(checkinId: number) {
  return useQuery<Checkin, Error>({
    queryKey: ['checkin', checkinId],
    queryFn: () => checkinApi.getCheckin(checkinId),
    enabled: !!checkinId,
  });
}

export function useCreateCheckin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateCheckinData) => checkinApi.createCheckin(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkins'] });
      toast({
        title: 'Check-in created',
        description: 'The check-in has been successfully created.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create check-in',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateCheckin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ checkinId, data }: { checkinId: number; data: UpdateCheckinData }) => 
      checkinApi.updateCheckin(checkinId, data),
    onSuccess: (_, { checkinId }) => {
      queryClient.invalidateQueries({ queryKey: ['checkin', checkinId] });
      queryClient.invalidateQueries({ queryKey: ['checkins'] });
      toast({
        title: 'Check-in updated',
        description: 'The check-in has been successfully updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update check-in',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteCheckin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (checkinId: number) => checkinApi.deleteCheckin(checkinId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkins'] });
      toast({
        title: 'Check-in deleted',
        description: 'The check-in has been successfully deleted.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete check-in',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useCheckinUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: { class_id?: number; course_id?: number } }) => 
      checkinApi.checkinUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkins'] });
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      toast({
        title: 'Check-in successful',
        description: 'The user has been checked in.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to check in user',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useCheckinInfo(qrCode: string) {
  return useQuery({
    queryKey: ['checkin-info', qrCode],
    queryFn: () => checkinApi.getCheckinInfo(qrCode),
    enabled: !!qrCode,
  });
}

export function useValidateCheckin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (qrCode: string) => checkinApi.validateCheckin(qrCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkin-info'] });
      queryClient.invalidateQueries({ queryKey: ['checkins'] });
      toast({
        title: 'Check-in successful',
        description: 'The user has been checked in.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to check in user',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useUnvalidateCheckin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (registrationId: string) => checkinApi.unvalidateCheckin(registrationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkin-info'] });
      queryClient.invalidateQueries({ queryKey: ['checkins'] });
      toast({
        title: 'Check-in unvalidated',
        description: 'The check-in has been removed.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to unvalidate check-in',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}
