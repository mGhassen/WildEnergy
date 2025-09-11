import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkinApi, Checkin, CheckinInfo, CheckinRequest, CreateCheckinData, UpdateCheckinData } from '@/lib/api/checkins';
import { useToast } from '@/hooks/use-toast';

// Existing hooks
export function useCheckins() {
  return useQuery<Checkin[], Error>({
    queryKey: ['/api/admin/checkins'],
    queryFn: () => checkinApi.getCheckins(),
  });
}

export function useMemberCheckins() {
  return useQuery<Checkin[], Error>({
    queryKey: ['/api/member/checkins'],
    queryFn: () => checkinApi.getMemberCheckins(),
  });
}

export function useCheckin(checkinId: number) {
  return useQuery<Checkin, Error>({
    queryKey: ['/api/admin/checkins', checkinId],
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/checkins'] });
      queryClient.invalidateQueries({ queryKey: ['/api/member/checkins'] });
      toast({
        title: 'Check-in Created',
        description: 'Check-in has been successfully created.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Create Check-in',
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/checkins'] });
      queryClient.invalidateQueries({ queryKey: ['/api/member/checkins'] });
      toast({
        title: 'Check-in Updated',
        description: 'Check-in has been successfully updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Update Check-in',
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/checkins'] });
      queryClient.invalidateQueries({ queryKey: ['/api/member/checkins'] });
      toast({
        title: 'Check-in Deleted',
        description: 'Check-in has been successfully deleted.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Delete Check-in',
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/checkins'] });
      queryClient.invalidateQueries({ queryKey: ['/api/member/checkins'] });
      toast({
        title: 'User Checked In',
        description: 'User has been successfully checked in.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Check In User',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

// New QR code hooks
export function useCheckinInfo(qrCode: string) {
  return useQuery<CheckinInfo, Error>({
    queryKey: ['checkin-info', qrCode],
    queryFn: () => checkinApi.getCheckinInfo(qrCode).then(response => response.data!),
    enabled: !!qrCode,
  });
}

export function useCheckInRegistration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (registrationId: string) => checkinApi.checkInRegistration(registrationId),
    onSuccess: (response, variables) => {
      // Invalidate checkin info to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['checkin-info'] });
      queryClient.invalidateQueries({ queryKey: ['/api/checkins'] });
      queryClient.invalidateQueries({ queryKey: ['/api/registrations'] });
      
      toast({
        title: 'Check-in Successful',
        description: 'Member has been successfully checked in!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Check-in Failed',
        description: error.message || 'Failed to check in member',
        variant: 'destructive',
      });
    },
  });
}

export function useCheckOutRegistration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (registrationId: string) => checkinApi.checkOutRegistration(registrationId),
    onSuccess: (response, variables) => {
      // Invalidate checkin info to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['checkin-info'] });
      queryClient.invalidateQueries({ queryKey: ['/api/checkins'] });
      queryClient.invalidateQueries({ queryKey: ['/api/registrations'] });
      
      toast({
        title: 'Check-out Successful',
        description: 'Member has been successfully checked out',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Check Out',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}