import type { SupabaseClient } from '@supabase/supabase-js';

export async function deleteSubscriptionWithDependents(
  supabase: SupabaseClient,
  subscriptionId: number
): Promise<{ ok: true } | { ok: false; error: string; details: unknown; status: number }> {
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

  const { error: paymentsDeleteError } = await supabase
    .from('payments')
    .delete()
    .eq('subscription_id', subscriptionId);

  if (paymentsDeleteError) {
    return {
      ok: false,
      error: 'Failed to delete related payments',
      details: paymentsDeleteError,
      status: 500,
    };
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
