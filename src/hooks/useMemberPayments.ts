import { useQuery } from '@tanstack/react-query';
import { paymentApi, Payment } from '@/lib/api/payments';

// Member Payments Hook
export const useMemberPayments = () => {
  return useQuery<Payment[]>({
    queryKey: ['/api/member/payments'],
    queryFn: paymentApi.getMemberPayments,
  });
};