import type { SupabaseClient } from '@supabase/supabase-js';

export type DeleteSubscriptionResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      details: unknown;
      status: number;
      paymentCount?: number;
      payments?: Array<{
        id: number;
        amount: number;
        payment_type: string;
        payment_status: string;
        payment_date: string | null;
      }>;
    };

/**
 * Deletes a subscription and its non-payment dependents.
 * Payments must be deleted first (payment delete reverses credit ledger).
 */
export async function deleteSubscriptionWithDependents(
  supabase: SupabaseClient,
  subscriptionId: number
): Promise<DeleteSubscriptionResult> {
  const { data: paymentRows, error: paymentsFetchError } = await supabase
    .from('payments')
    .select('id, amount, payment_type, payment_status, payment_date')
    .eq('subscription_id', subscriptionId)
    .order('id', { ascending: true });

  if (paymentsFetchError) {
    return {
      ok: false,
      error: 'Failed to check payments for subscription',
      details: paymentsFetchError,
      status: 500,
    };
  }

  const payments = (paymentRows ?? []).map((p) => ({
    id: p.id as number,
    amount: parseFloat(String(p.amount ?? 0)),
    payment_type: String(p.payment_type ?? ''),
    payment_status: String(p.payment_status ?? ''),
    payment_date: (p.payment_date as string | null) ?? null,
  }));

  if (payments.length > 0) {
    return {
      ok: false,
      error: `Cannot delete subscription: ${payments.length} payment(s) still exist. Delete payments first.`,
      details: { paymentCount: payments.length, payments },
      status: 409,
      paymentCount: payments.length,
      payments,
    };
  }

  const { data: regRows, error: regFetchError } = await supabase
    .from('class_registrations')
    .select('id')
    .eq('subscription_id', subscriptionId);

  if (regFetchError) {
    return {
      ok: false,
      error: 'Failed to fetch registrations for subscription',
      details: regFetchError,
      status: 500,
    };
  }

  const registrationIds = (regRows ?? []).map((r: { id: number }) => r.id);
  if (registrationIds.length > 0) {
    const { error: checkinsDeleteError } = await supabase
      .from('checkins')
      .delete()
      .in('registration_id', registrationIds);

    if (checkinsDeleteError) {
      return {
        ok: false,
        error: 'Failed to delete related check-ins',
        details: checkinsDeleteError,
        status: 500,
      };
    }

    const { error: registrationsDeleteError } = await supabase
      .from('class_registrations')
      .delete()
      .eq('subscription_id', subscriptionId);

    if (registrationsDeleteError) {
      return {
        ok: false,
        error: 'Failed to delete related registrations',
        details: registrationsDeleteError,
        status: 500,
      };
    }
  }

  const { error: deleteError } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', subscriptionId);

  if (deleteError) {
    return {
      ok: false,
      error: 'Failed to delete subscription',
      details: deleteError,
      status: 500,
    };
  }

  return { ok: true };
}
