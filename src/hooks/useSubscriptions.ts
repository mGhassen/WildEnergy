import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionApi, Subscription, CreateSubscriptionData, UpdateSubscriptionData } from '@/lib/api/subscriptions';
import { useToast } from '@/hooks/use-toast';

export function useSubscriptions() {
  return useQuery<Subscription[], Error>({
    queryKey: ['subscriptions'],
    queryFn: () => subscriptionApi.getSubscriptions(),
  });
}

export function useSubscription(subscriptionId: number) {
  return useQuery<Subscription, Error>({
    queryKey: ['subscription', subscriptionId],
    queryFn: () => subscriptionApi.getSubscription(subscriptionId),
    enabled: !!subscriptionId,
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateSubscriptionData) => subscriptionApi.createSubscription(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast({
        title: 'Subscription created',
        description: 'The subscription has been successfully created.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create subscription',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ subscriptionId, data }: { subscriptionId: number; data: UpdateSubscriptionData }) => 
      subscriptionApi.updateSubscription(subscriptionId, data),
    onSuccess: (_, { subscriptionId }) => {
      queryClient.invalidateQueries({ queryKey: ['subscription', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast({
        title: 'Subscription updated',
        description: 'The subscription has been successfully updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update subscription',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteSubscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (subscriptionId: number) => subscriptionApi.deleteSubscription(subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast({
        title: 'Subscription deleted',
        description: 'The subscription has been successfully deleted.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete subscription',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useManualRefundSessions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ subscriptionId, sessionsToRefund, groupId }: { subscriptionId: number; sessionsToRefund: number; groupId?: number }) => 
      subscriptionApi.manualRefundSessions(subscriptionId, sessionsToRefund, groupId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions'] });
      toast({
        title: 'Sessions refunded',
        description: `Successfully refunded ${data.sessionsRefunded} session(s)`,
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || 'Please try again';
      const isCapacityError = errorMessage.includes('maximum capacity') || errorMessage.includes('No sessions could be refunded');
      
      toast({
        title: isCapacityError ? 'Cannot refund sessions' : 'Failed to refund sessions',
        description: isCapacityError 
          ? 'All group sessions are already at maximum capacity. No sessions can be refunded.'
          : errorMessage,
        variant: 'destructive',
      });
    },
  });
}

export function useConsumeSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ subscriptionId, groupId }: { subscriptionId: number; groupId: number }) => 
      subscriptionApi.consumeSession(subscriptionId, groupId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      toast({
        title: 'Session consumed',
        description: data.message || 'Session consumed successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to consume session',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useMemberSubscriptions() {
  return useQuery<Subscription[], Error>({
    queryKey: ['/api/member/subscriptions'],
    queryFn: () => subscriptionApi.getMemberSubscriptions(),
  });
}
