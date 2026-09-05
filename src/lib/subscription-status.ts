import { isSubscriptionActiveByEndDate } from '@/lib/date';

type PaymentDrivenStatus = 'pending' | 'active' | 'expired';

export type SubscriptionPaymentStatus =
  | 'free'
  | 'fully_paid'
  | 'partially_paid'
  | 'not_paid';

export function isFreePlan(plan: {
  is_free?: boolean | null;
  isFree?: boolean | null;
  price?: number | string | null;
} | null | undefined): boolean {
  if (!plan) return false;
  if (plan.is_free === true || plan.isFree === true) return true;
  return Number(plan.price) === 0;
}

export function getPaymentStatus(params: {
  totalPaid: number;
  planPrice: number;
  isFree?: boolean;
}): SubscriptionPaymentStatus {
  if (params.isFree || params.planPrice <= 0) {
    return 'free';
  }
  if (params.totalPaid >= params.planPrice) {
    return 'fully_paid';
  }
  if (params.totalPaid > 0) {
    return 'partially_paid';
  }
  return 'not_paid';
}

export function getPaymentStatusLabel(
  status: SubscriptionPaymentStatus,
): string {
  switch (status) {
    case 'free':
      return 'Free';
    case 'fully_paid':
      return 'Fully Paid';
    case 'partially_paid':
      return 'Partially Paid';
    case 'not_paid':
      return 'Not Paid';
  }
}

export function getPaymentStatusBadgeVariant(
  status: SubscriptionPaymentStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'free':
      return 'outline';
    case 'fully_paid':
      return 'default';
    case 'partially_paid':
      return 'secondary';
    case 'not_paid':
      return 'destructive';
  }
}

/**
 * Resolve status from payments, without overriding cancelled.
 * Past inclusive end midnight → expired (even if fully paid).
 * Free / zero-price plans are treated as paid → active.
 */
export function resolvePaymentDrivenStatus(params: {
  currentStatus: string;
  endDate: string | Date | null | undefined;
  totalPaid: number;
  planPrice: number;
  isFree?: boolean;
}): PaymentDrivenStatus | 'cancelled' {
  if (params.currentStatus === 'cancelled') {
    return 'cancelled';
  }

  if (!isSubscriptionActiveByEndDate(params.endDate)) {
    return 'expired';
  }

  if (
    params.isFree ||
    params.planPrice <= 0 ||
    params.totalPaid >= params.planPrice
  ) {
    return 'active';
  }

  return 'pending';
}
