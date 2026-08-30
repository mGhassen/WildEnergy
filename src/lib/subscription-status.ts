import { isSubscriptionActiveByEndDate } from '@/lib/date';

type PaymentDrivenStatus = 'pending' | 'active' | 'expired';

/**
 * Resolve status from payments, without overriding cancelled.
 * Past inclusive end midnight → expired (even if fully paid).
 */
export function resolvePaymentDrivenStatus(params: {
  currentStatus: string;
  endDate: string | Date | null | undefined;
  totalPaid: number;
  planPrice: number;
}): PaymentDrivenStatus | 'cancelled' {
  if (params.currentStatus === 'cancelled') {
    return 'cancelled';
  }

  if (!isSubscriptionActiveByEndDate(params.endDate)) {
    return 'expired';
  }

  if (params.totalPaid >= params.planPrice) {
    return 'active';
  }

  return 'pending';
}
