import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentApi, Payment, CreatePaymentData, UpdatePaymentData } from '@/lib/api/payments';
import { useToast } from '@/hooks/use-toast';

export function usePayments() {
  return useQuery<Payment[], Error>({
    queryKey: ['payments'],
    queryFn: () => paymentApi.getPayments(),
  });
}

export function usePayment(paymentId: number) {
  return useQuery<Payment, Error>({
    queryKey: ['payment', paymentId],
    queryFn: () => paymentApi.getPayment(paymentId),
    enabled: !!paymentId,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreatePaymentData) => paymentApi.createPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/member/payments'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast({
        title: 'Payment created',
        description: 'The payment has been successfully created.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create payment',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ paymentId, data }: { paymentId: number; data: UpdatePaymentData }) => 
      paymentApi.updatePayment(paymentId, data),
    onSuccess: (_, { paymentId }) => {
      queryClient.invalidateQueries({ queryKey: ['payment', paymentId] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/member/payments'] });
      toast({
        title: 'Payment updated',
        description: 'The payment has been successfully updated.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update payment',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (paymentId: number) => paymentApi.deletePayment(paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/member/payments'] });
      toast({
        title: 'Payment deleted',
        description: 'The payment has been successfully deleted.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete payment',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
}
