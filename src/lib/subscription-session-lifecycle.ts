import { supabaseServer } from '@/lib/supabase';
import { isSubscriptionActiveByEndDate } from '@/lib/date';

export async function getSubscriptionSessionsRemainingTotal(
  subscriptionId: number,
): Promise<number> {
  const [{ data: groupSessions }, { data: poolSessions }] = await Promise.all([
    supabaseServer()
      .from('subscription_group_sessions')
      .select('sessions_remaining')
      .eq('subscription_id', subscriptionId),
    supabaseServer()
      .from('subscription_pool_sessions')
      .select('sessions_remaining')
      .eq('subscription_id', subscriptionId),
  ]);

  const groupTotal = (groupSessions || []).reduce(
    (sum, row) => sum + (row.sessions_remaining || 0),
    0,
  );
  const poolTotal = (poolSessions || []).reduce(
    (sum, row) => sum + (row.sessions_remaining || 0),
    0,
  );

  return groupTotal + poolTotal;
}

/** Mark active/pending → completed when total remaining sessions hit 0. */
export async function completeSubscriptionIfDepleted(
  subscriptionId: number,
): Promise<void> {
  const remaining = await getSubscriptionSessionsRemainingTotal(subscriptionId);
  if (remaining > 0) return;

  const { error } = await supabaseServer()
    .from('subscriptions')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .in('status', ['active', 'pending']);

  if (error) {
    console.error('Error completing depleted subscription:', error);
  }
}

/** Mark completed → active when remaining sessions are restored (or expired if past end). */
export async function reactivateSubscriptionIfCompleted(
  subscriptionId: number,
): Promise<void> {
  const remaining = await getSubscriptionSessionsRemainingTotal(subscriptionId);
  if (remaining <= 0) return;

  const { data: subscription, error: fetchError } = await supabaseServer()
    .from('subscriptions')
    .select('id, status, end_date')
    .eq('id', subscriptionId)
    .eq('status', 'completed')
    .maybeSingle();

  if (fetchError) {
    console.error('Error fetching completed subscription for reactivate:', fetchError);
    return;
  }
  if (!subscription) return;

  const nextStatus = isSubscriptionActiveByEndDate(subscription.end_date)
    ? 'active'
    : 'expired';

  const { error } = await supabaseServer()
    .from('subscriptions')
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .eq('status', 'completed');

  if (error) {
    console.error('Error reactivating completed subscription:', error);
  }
}
